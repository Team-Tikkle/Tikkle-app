import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

// ── Constants ──
const LS_ACCESS  = 'tikkle_access_token'
const LS_REFRESH = 'tikkle_refresh_token'

// Error code returned by the backend when the refresh token is expired
const REFRESH_EXPIRED_CODE = 'AUTH-006'

// 업비트 키가 만료/권한 부족일 때 서버는 HTTP 401 + UPBIT-010을 반환한다.
// 이는 "인증 실패"가 아니라 "업비트 재연동 필요"이므로, 토큰 재발급/로그아웃
// 로직을 절대 태우면 안 된다. 그대로 caller에게 넘겨 재연동 UI를 띄우게 한다.
const UPBIT_INVALID_KEY_CODE = 'UPBIT-010'

// ── Dev logger — only prints in development builds ──
const isDev = import.meta.env.DEV
function devLog(...args: unknown[]) {
  if (isDev) console.log('[api]', ...args)
}
function devWarn(...args: unknown[]) {
  if (isDev) console.warn('[api]', ...args)
}

// ── Axios instance ──
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// 인증 헤더를 붙이지 않아야 하는 공개 엔드포인트
const PUBLIC_ENDPOINTS = [
  '/api/auth/sms/send',
  '/api/auth/sms/verify',
  '/api/auth/signup',
  '/api/auth/login',
  '/api/auth/reissue',
  '/api/auth/password/reset-sms/send',
  '/api/auth/password/reset-sms/verify',
  '/api/auth/password/reset',
]

// ── Request interceptor: attach access token ──
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const isPublic = PUBLIC_ENDPOINTS.some((p) => config.url?.startsWith(p))
  const token = isPublic ? null : localStorage.getItem(LS_ACCESS)

  // Guard against the literal string "null" being stored in localStorage
  if (token && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`
    devLog(`→ ${config.method?.toUpperCase()} ${config.url} | Bearer attached (${token.slice(0, 12)}...)`)
  } else {
    devWarn(`→ ${config.method?.toUpperCase()} ${config.url} | No access token — Authorization header skipped`)
  }

  // Log outgoing body for POST/PATCH to verify payload shape
  if (isDev && (config.method === 'post' || config.method === 'patch') && config.data) {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    // Mask token values beyond first 15 chars for security
    const masked = Object.fromEntries(
      Object.entries(body).map(([k, v]) =>
        typeof v === 'string' && v.length > 20
          ? [k, v.slice(0, 15) + '…(masked)']
          : [k, v],
      ),
    )
    devLog(`   body:`, masked)
  }

  return config
})

// ── Response interceptor: handle 401 / token reissue ──
let isRefreshing = false
type RefreshCallback = (newToken: string) => void
let waitQueue: RefreshCallback[] = []

function processQueue(newToken: string) {
  waitQueue.forEach((cb) => cb(newToken))
  waitQueue = []
}

api.interceptors.response.use(
  (response) => {
    devLog(`← ${response.status} ${response.config.url}`)
    return response
  },
  async (error: AxiosError<{ code?: string; message?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const status    = error.response?.status
    const errorCode = error.response?.data?.code

    devWarn(`← ${status} ${originalRequest?.url} | code=${errorCode ?? '—'} msg=${error.response?.data?.message ?? error.message}`)

    // UPBIT-010은 401이지만 인증 실패가 아니다(업비트 키 만료/권한 부족).
    // 재발급/로그아웃을 태우지 말고 그대로 넘겨 재연동 안내를 띄우게 한다.
    if (errorCode === UPBIT_INVALID_KEY_CODE) {
      return Promise.reject(error)
    }

    // Only intercept 401s that haven't already been retried,
    // and never try to reissue for public (no-auth) endpoints.
    const isPublicRequest = PUBLIC_ENDPOINTS.some((p) => originalRequest.url?.startsWith(p))
    if (status !== 401 || originalRequest._retry || isPublicRequest) {
      return Promise.reject(error)
    }

    // A 401 from the reissue endpoint itself means the refresh token is dead.
    // Bail out immediately — never feed it back into the queue/retry machinery.
    // Because isRefreshing is already true at this point, queuing it would push
    // a callback onto waitQueue that nothing ever resolves, hanging the caller
    // (and bootstrap) forever on a blank screen.
    if (originalRequest.url?.includes('/api/auth/reissue')) {
      devWarn('Reissue endpoint returned 401 — refresh token expired, forcing logout')
      _forceLogout()
      return Promise.reject(error)
    }

    // Refresh token itself expired → force logout immediately
    if (errorCode === REFRESH_EXPIRED_CODE) {
      devWarn('Refresh token expired (AUTH-006) — forcing logout')
      _forceLogout()
      return Promise.reject(error)
    }

    // ── Guard: if there is no refresh token, do not even attempt reissue ──
    const storedRefresh = localStorage.getItem(LS_REFRESH)
    if (!storedRefresh || storedRefresh === 'null') {
      devWarn('No refresh token in localStorage — cannot reissue, forcing logout')
      _forceLogout()
      return Promise.reject(error)
    }

    // Queue concurrent 401s so only one reissue runs at a time
    if (isRefreshing) {
      return new Promise<string>((resolve) => {
        waitQueue.push((token) => resolve(token))
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      devLog('Attempting token reissue...')
      const { data: envelope } = await api.post<{
        code: string
        message: string
        data: { accessToken: string; refreshToken: string; isNewUser: boolean }
      }>(
        '/api/auth/reissue',
        { refreshToken: storedRefresh },
      )
      const tokens = envelope.data

      devLog('Reissue succeeded — storing new tokens')
      localStorage.setItem(LS_ACCESS,  tokens.accessToken)
      localStorage.setItem(LS_REFRESH, tokens.refreshToken)

      // Sync the Pinia store if it is already initialised
      try {
        const { useUserStore } = await import('@/stores/useUserStore')
        const store = useUserStore()
        store.accessToken  = tokens.accessToken
        store.refreshToken = tokens.refreshToken
        if (store.profile) {
          store.profile.hasInvestmentProfile = !tokens.isNewUser
          store.profile.hasKbankAccount      = !tokens.isNewUser
          store.profile.hasUpbitKey          = !tokens.isNewUser
        }
      } catch {
        // Store not yet available — localStorage update above is sufficient
      }

      processQueue(tokens.accessToken)
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      devWarn('Reissue failed — forcing logout')
      waitQueue = []
      _forceLogout()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

// ── Force logout: 스토리지 삭제 후 스토어 액션으로 세션 정리 + 라우팅 ──
// window 이벤트 대신 스토어를 직접 호출해 App.vue 마운트 타이밍에 의존하지 않는다.
function _forceLogout() {
  localStorage.removeItem(LS_ACCESS)
  localStorage.removeItem(LS_REFRESH)
  import('@/stores/useUserStore').then(({ useUserStore }) => {
    useUserStore().forceLogout()
  })
}

export default api
