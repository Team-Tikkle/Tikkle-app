import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Preferences } from '@capacitor/preferences'
import type { UserProfile } from '@/types'
import { mockUser } from '@/mocks'

// ── localStorage keys ──
const LS_ACCESS  = 'tikkle_access_token'
const LS_REFRESH = 'tikkle_refresh_token'

// ── Backend response shape for GET /api/users/me ──
interface UserMeData {
  id: number
  name: string
  email: string
  status: string
  createdAt: string
  hasInvestmentProfile: boolean
  hasKbankAccount: boolean
  hasUpbitKey: boolean
}
interface UserMeEnvelope {
  code: string
  message: string
  data: UserMeData
}

export const useUserStore = defineStore('user', () => {

  // ════════════════════════════════════════════════
  // State
  // ════════════════════════════════════════════════

  // Full user profile (null until fetchProfile succeeds)
  const profile = ref<UserProfile | null>(null)

  // In development, VITE_SKIP_AUTH=true hydrates placeholder tokens so the
  // router guard doesn't block navigation while working without a real backend.
  const DEV_SKIP = import.meta.env.VITE_SKIP_AUTH === 'true'
  const accessToken  = ref<string | null>(
    localStorage.getItem(LS_ACCESS)  ?? (DEV_SKIP ? 'dev-mock-token' : null),
  )
  const refreshToken = ref<string | null>(
    localStorage.getItem(LS_REFRESH) ?? (DEV_SKIP ? 'dev-mock-refresh' : null),
  )

  // ════════════════════════════════════════════════
  // Computed
  // ════════════════════════════════════════════════

  const isAuthenticated     = computed(() => !!accessToken.value)
  const isOnboardingComplete = computed(() =>
    !!(profile.value?.hasInvestmentProfile && profile.value?.hasKbankAccount && profile.value?.hasUpbitKey),
  )

  // ════════════════════════════════════════════════
  // Private helpers
  // ════════════════════════════════════════════════

  function _persistTokens(access: string, refresh: string) {
    accessToken.value  = access
    refreshToken.value = refresh
    localStorage.setItem(LS_ACCESS,  access)
    localStorage.setItem(LS_REFRESH, refresh)
  }

  function _clearTokens() {
    accessToken.value  = null
    refreshToken.value = null
    localStorage.removeItem(LS_ACCESS)
    localStorage.removeItem(LS_REFRESH)
  }

  function _clearSession() {
    _clearTokens()
    profile.value = null
  }

  // ════════════════════════════════════════════════
  // Auth actions
  // ════════════════════════════════════════════════

  // ── Login (POST /api/auth/login) ──
  async function login(params: { phoneNumber: string; password: string }): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.post<{
      code: string
      message: string
      data: {
        accessToken: string
        refreshToken: string
        isNewUser: boolean
      }
    }>('/api/auth/login', params)

    const tokenData = envelope.data
    _persistTokens(tokenData.accessToken, tokenData.refreshToken)
    profile.value = {
      id: '',
      name: '',
      risk_type: 'NEUTRAL',
      rule: 'UNDER_1000',
      is_auto: true,
      hasInvestmentProfile: !tokenData.isNewUser,
      hasKbankAccount:      !tokenData.isNewUser,
      hasUpbitKey:          !tokenData.isNewUser,
    }
  }

  // ── Signup (POST /api/auth/signup) ──
  async function signup(params: {
    name: string
    phoneNumber: string
    password: string
    signupToken: string
  }): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.post<{
      code: string
      message: string
      data: {
        accessToken: string
        refreshToken: string
        isNewUser: boolean
      }
    }>('/api/auth/signup', params)

    const tokenData = envelope.data
    _persistTokens(tokenData.accessToken, tokenData.refreshToken)
    profile.value = {
      id: '',
      name: params.name,
      risk_type: 'NEUTRAL',
      rule: 'UNDER_1000',
      is_auto: true,
      hasInvestmentProfile: false,
      hasKbankAccount:      false,
      hasUpbitKey:          false,
    }
  }

  // ── Logout (POST /api/auth/logout) ──
  // Authorization header is attached by the Axios request interceptor.
  // We verify the token exists before firing and log it in dev.
  async function logout(): Promise<void> {
    if (import.meta.env.DEV) {
      const storedToken = localStorage.getItem(LS_ACCESS)
      console.log('[logout] access token in localStorage:', storedToken ? `${storedToken.slice(0, 12)}…` : 'MISSING')
    }
    try {
      const { default: api } = await import('@/utils/api')
      await api.post('/api/auth/logout')
    } catch (err) {
      // Always clear local session regardless of server response.
      // A 401 here means the token was already expired — the session
      // is considered terminated on the client side regardless.
      if (import.meta.env.DEV) {
        console.warn('[logout] server call failed — clearing session anyway:', err)
      }
    } finally {
      _clearSession()
    }
  }


  // ════════════════════════════════════════════════
  // User API actions
  // ════════════════════════════════════════════════

  // ── Get profile (GET /api/users/me) ──
  // Fetches id, name, and email from the server and merges them into the
  // existing profile. Fields seeded during login (risk_type, rule, is_auto,
  // onboarding_completed) are preserved so they are not lost on a re-fetch.
  async function fetchProfile(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<UserMeEnvelope>('/api/users/me')
    const fetched = envelope.data
    profile.value = {
      risk_type: profile.value?.risk_type ?? 'NEUTRAL',
      rule:      profile.value?.rule      ?? 'UNDER_1000',
      is_auto:   profile.value?.is_auto   ?? true,
      id:    String(fetched.id),
      name:  fetched.name,
      email: fetched.email,
      hasInvestmentProfile: fetched.hasInvestmentProfile,
      hasKbankAccount:      fetched.hasKbankAccount,
      hasUpbitKey:          fetched.hasUpbitKey,
    }

    // Bridge userId to native Android so PaymentNotificationListener can read it
    await Preferences.set({ key: 'userId', value: String(fetched.id) })
  }

  // ── Delete account (DELETE /api/users/me) ──
  // Removes the account server-side then tears down the local session.
  async function deleteAccount(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    await api.delete('/api/users/me')
    _clearSession()
  }

  // ════════════════════════════════════════════════
  // Bootstrap — called once in main.ts BEFORE app.mount()
  //
  // Resolves the auth state so the router guard sees the correct values
  // on the very first navigation with zero flash of protected content.
  // ════════════════════════════════════════════════
  async function bootstrap(): Promise<void> {
    // Dev mode: skip real API calls, hydrate mock profile so the app is usable
    if (DEV_SKIP) {
      profile.value = { ...mockUser }
      return
    }

    // No stored token → nothing to do; guard will redirect to /login
    if (!accessToken.value) return

    try {
      // Attempt to restore the session from the stored access token.
      // If the token is expired the Axios interceptor will automatically try
      // the refresh token. If that also fails it fires 'tikkle:force-logout'
      // and this await rejects, landing in the catch below.
      await fetchProfile()
    } catch {
      // Both tokens are expired / invalid — wipe the session.
      // isAuthenticated becomes false so the guard will send to /login.
      _clearSession()
    }
  }

  // ════════════════════════════════════════════════
  // Existing profile-mutation actions (unchanged)
  // ════════════════════════════════════════════════

  // ── Force logout: Axios 인터셉터가 리프레시 토큰 만료를 감지했을 때 호출 ──
  // 세션을 즉시 삭제하고 로그인 화면으로 이동한다.
  // window 이벤트 없이 스토어 액션만으로 처리해 마운트 타이밍 경쟁 조건을 제거.
  function forceLogout(): void {
    _clearSession()
    import('@/router').then(({ default: router }) => {
      router.replace({ name: 'login' }).catch(() => {})
    })
  }

  function completeOnboarding() {
    if (profile.value) {
      profile.value.hasInvestmentProfile = true
      profile.value.hasKbankAccount      = true
      profile.value.hasUpbitKey          = true
    }
  }

  // ════════════════════════════════════════════════
  // Exports
  // ════════════════════════════════════════════════
  return {
    // state
    profile,
    accessToken,
    refreshToken,
    // computed
    isAuthenticated,
    isOnboardingComplete,
    // auth
    bootstrap,
    login,
    signup,
    logout,
    forceLogout,
    // user APIs
    fetchProfile,
    deleteAccount,
    // profile mutations
    completeOnboarding,
  }
})
