import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

// ── Constants ──
const LS_ACCESS  = 'tikkle_access_token'
const LS_REFRESH = 'tikkle_refresh_token'

// Error code returned by the backend when the refresh token is expired
const REFRESH_EXPIRED_CODE = 'AUTH-006'

// ── Axios instance ──
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach access token ──
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(LS_ACCESS)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401 / token reissue ──
// We use a flag to avoid infinite retry loops if the reissue endpoint itself fails.
let isRefreshing = false
// Queue of callbacks waiting for the new token
type RefreshCallback = (newToken: string) => void
let waitQueue: RefreshCallback[] = []

function processQueue(newToken: string) {
  waitQueue.forEach((cb) => cb(newToken))
  waitQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ code?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Only intercept 401 errors that haven't already been retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // If the backend reports the refresh token itself is expired, force logout
    const errorCode = error.response.data?.code
    if (errorCode === REFRESH_EXPIRED_CODE) {
      _forceLogout()
      return Promise.reject(error)
    }

    // If another request is already refreshing, queue this one
    if (isRefreshing) {
      return new Promise<string>((resolve) => {
        waitQueue.push((token) => resolve(token))
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      })
    }

    // Start the refresh flow
    originalRequest._retry = true
    isRefreshing = true

    try {
      const refreshToken = localStorage.getItem(LS_REFRESH)
      const { data } = await api.post<{ accessToken: string; refreshToken: string }>(
        '/api/auth/reissue',
        { refreshToken },
      )

      // Persist new tokens directly to localStorage (store may not be ready in this context)
      localStorage.setItem(LS_ACCESS,  data.accessToken)
      localStorage.setItem(LS_REFRESH, data.refreshToken)

      // Also update the Pinia store if it is already initialised
      try {
        // Lazy import to avoid circular dependency at module load time
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
      // Reissue itself failed — force logout
      _forceLogout()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

// ── Force logout helper ──
// Cannot import the store synchronously here (circular dep), so we clear storage
// directly and dispatch a custom event for the app to react to.
function _forceLogout() {
  localStorage.removeItem(LS_ACCESS)
  localStorage.removeItem(LS_REFRESH)
  // The router guard in main.ts / App.vue will redirect to /login on next navigation.
  // We also dispatch a DOM event so App.vue can react immediately.
  window.dispatchEvent(new CustomEvent('tikkle:force-logout'))
}

export default api
