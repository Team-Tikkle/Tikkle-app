import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile, RoundUpRule, CategoryRoundUpRule } from '@/types'
import { mockUser } from '@/mocks'

// ── localStorage keys ──
const LS_ACCESS  = 'tikkle_access_token'
const LS_REFRESH = 'tikkle_refresh_token'

// ── Backend response shape for GET /api/users/me ──
// Wrapped in the standard envelope: { code, message, data: UserMeData }
interface UserMeData {
  id: number
  name: string
  email: string
  status: string
  createdAt: string
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

  // Per-category round-up overrides
  const categoryRules = ref<CategoryRoundUpRule[]>([])

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
  const isOnboardingComplete = computed(() => profile.value?.onboarding_completed ?? false)

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

  // ── Login via Google OAuth token (POST /api/auth/oauth/google) ──
  // Backend returns tokens + onboarding status so the router can redirect
  // immediately without a separate profile fetch.
  async function login(googleAccessToken: string): Promise<void> {
    // Defensive check: ensure we are sending a plain non-empty string
    if (!googleAccessToken || typeof googleAccessToken !== 'string') {
      throw new Error('[login] Google access token is missing or not a string')
    }

    const { default: api } = await import('@/utils/api')

    // Send EXACTLY { "accessToken": "string_value" } — verified payload shape
    const payload = { accessToken: googleAccessToken }
    if (import.meta.env.DEV) {
      console.log('[login] POST /api/auth/oauth/google payload key:', Object.keys(payload))
      console.log('[login] accessToken type:', typeof googleAccessToken, '| length:', googleAccessToken.length)
    }

    // Backend wraps tokens in an envelope: { code, message, data: { accessToken, refreshToken } }
    const { data: envelope } = await api.post<{
      code: string
      message: string
      data: {
        accessToken: string
        refreshToken: string
        onboardingCompleted?: boolean  // not yet implemented by backend — defaults to true
        userId?: string
      }
    }>(
      '/api/auth/oauth/google',
      payload,
    )

    const tokenData = envelope.data
    _persistTokens(tokenData.accessToken, tokenData.refreshToken)

    // Seed a minimal profile so isOnboardingComplete is immediately correct.
    // onboardingCompleted is not yet returned by the backend — default to true
    // so the router sends authenticated users to home rather than onboarding.
    profile.value = {
      id:   tokenData.userId ?? '',
      name: '',
      risk_type: 'NEUTRAL',
      rule: 'UNDER_1000',
      is_auto: true,
      onboarding_completed: tokenData.onboardingCompleted ?? true,
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

  // ── Token reissue (POST /api/auth/reissue) ──
  // Called internally by the Axios response interceptor on 401.
  // The interceptor already guards against null refresh tokens,
  // but we add the same guard here for calls made directly.
  async function reissueTokens(): Promise<{ accessToken: string; refreshToken: string }> {
    const token = refreshToken.value ?? localStorage.getItem(LS_REFRESH)
    if (!token || token === 'null') {
      throw new Error('[reissueTokens] No refresh token available')
    }
    const { default: api } = await import('@/utils/api')
    // Send EXACTLY { "refreshToken": "string_value" } — never null
    const { data } = await api.post<{ accessToken: string; refreshToken: string }>(
      '/api/auth/reissue',
      { refreshToken: token },
    )
    _persistTokens(data.accessToken, data.refreshToken)
    return data
  }

  // ── Dev-only: issue a JWT for an existing user by email (POST /api/auth/test-token) ──
  // Local environment only. Persists the returned tokens like a real login.
  async function issueTestToken(email: string): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.post<{
      code: string
      message: string
      data: { accessToken: string; refreshToken: string }
    }>('/api/auth/test-token', { email })
    _persistTokens(envelope.data.accessToken, envelope.data.refreshToken)
  }

  // ── Dev-only: create a user (or reuse if exists) and issue a JWT (POST /api/auth/test-signup) ──
  // Local environment only. Persists the returned tokens like a real login.
  async function testSignup(email: string, name: string): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.post<{
      code: string
      message: string
      data: { accessToken: string; refreshToken: string }
    }>('/api/auth/test-signup', { email, name })
    _persistTokens(envelope.data.accessToken, envelope.data.refreshToken)
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
      // Preserve login-seeded investment prefs (defaults if not yet available)
      risk_type:            profile.value?.risk_type           ?? 'NEUTRAL',
      rule:                 profile.value?.rule                ?? 'UNDER_1000',
      is_auto:              profile.value?.is_auto             ?? true,
      onboarding_completed: profile.value?.onboarding_completed ?? true,
      // Fields owned by GET /api/users/me
      id:    String(fetched.id),
      name:  fetched.name,
      email: fetched.email,
    }
  }

  // ── Update profile name (PATCH /api/users/me) ──
  async function updateProfile(name: string): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data } = await api.patch<{ name: string }>('/api/users/me', { name })
    if (profile.value) profile.value.name = data.name
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

  function setProfile(newProfile: UserProfile) {
    profile.value = newProfile
  }

  function updateRoundUpRule(rule: RoundUpRule) {
    if (profile.value) profile.value.rule = rule
  }

  function updateTradingMode(is_auto: boolean) {
    if (profile.value) profile.value.is_auto = is_auto
  }

  function completeOnboarding() {
    if (profile.value) profile.value.onboarding_completed = true
  }

  function saveCategoryRules(rules: CategoryRoundUpRule[]) {
    categoryRules.value = [...rules]
  }

  // ════════════════════════════════════════════════
  // Exports
  // ════════════════════════════════════════════════
  return {
    // state
    profile,
    categoryRules,
    accessToken,
    refreshToken,
    // computed
    isAuthenticated,
    isOnboardingComplete,
    // auth
    bootstrap,
    login,
    logout,
    reissueTokens,
    issueTestToken,
    testSignup,
    // user APIs
    fetchProfile,
    updateProfile,
    deleteAccount,
    // profile mutations
    setProfile,
    updateRoundUpRule,
    updateTradingMode,
    completeOnboarding,
    saveCategoryRules,
  }
})
