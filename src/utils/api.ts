import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

// ── Constants ──
const LS_ACCESS  = 'tikkle_access_token'
const LS_REFRESH = 'tikkle_refresh_token'

// Error code returned by the backend when the refresh token is expired
const REFRESH_EXPIRED_CODE = 'AUTH-006'

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

// ── Request interceptor: attach access token ──
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(LS_ACCESS)

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

    // Only intercept 401s that haven't already been retried
    if (status !== 401 || originalRequest._retry) {
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
      // Send EXACTLY { "refreshToken": "string_value" } — never null
      const { data } = await api.post<{ accessToken: string; refreshToken: string }>(
        '/api/auth/reissue',
        { refreshToken: storedRefresh },
      )

      devLog('Reissue succeeded — storing new tokens')
      localStorage.setItem(LS_ACCESS,  data.accessToken)
      localStorage.setItem(LS_REFRESH, data.refreshToken)

      // Sync the Pinia store if it is already initialised
      try {
        const { useUserStore } = await import('@/stores/useUserStore')
        const store = useUserStore()
        store.accessToken  = data.accessToken
        store.refreshToken = data.refreshToken
      } catch {
        // Store not yet available — localStorage update above is sufficient
      }

      processQueue(data.accessToken)
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
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

// ── Force logout: clear storage + notify App.vue via DOM event ──
function _forceLogout() {
  localStorage.removeItem(LS_ACCESS)
  localStorage.removeItem(LS_REFRESH)
  window.dispatchEvent(new CustomEvent('tikkle:force-logout'))
}

export default api
