<script setup lang="ts">
/**
 * LoginView.vue
 *
 * Platform-aware Google authentication:
 *  - Web  : Google Identity Services (GSI) JavaScript SDK — requestAccessToken()
 *            popup flow works in a real browser.
 *  - Native (Android / iOS) : @codetrix-studio/capacitor-google-auth
 *            uses the native Google Sign-In SDK, which works inside a Capacitor
 *            WebView where popup windows are blocked.
 *
 * Both paths resolve to the same backend call:
 *   POST /api/auth/oauth/google  { accessToken: string }
 */
import type { GoogleTokenClient, GoogleTokenResponse } from '@/types/google.d.ts'
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, isNavigationFailure } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { useUserStore } from '@/stores/useUserStore'

const router    = useRouter()
const userStore = useUserStore()

const isLoading = ref(false)
const errorMsg  = ref('')

// True when the auth SDK is ready to be invoked (web: GSI loaded; native: plugin initialised)
const sdkReady  = ref(false)

// ─────────────────────────────────────────────
// Web-only: GSI token client
// ─────────────────────────────────────────────
let tokenClient: GoogleTokenClient | null = null

function initGoogleClient() {
  if (!window.google) return
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
    scope: 'openid profile email',
    callback: handleGsiResponse,
  })
  sdkReady.value = true
}

async function handleGsiResponse(response: GoogleTokenResponse) {
  if (response.error || !response.access_token) {
    errorMsg.value  = '구글 로그인이 취소됐거나 오류가 발생했습니다.'
    isLoading.value = false
    return
  }
  await _finaliseLogin(response.access_token)
}

// ─────────────────────────────────────────────
// Native-only: Capacitor Google Auth plugin
// ─────────────────────────────────────────────
async function initNativeGoogleAuth() {
  try {
    // Dynamic import keeps the native plugin out of the web bundle.
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
    await GoogleAuth.initialize({
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
      scopes: ['openid', 'profile', 'email'],
      grantOfflineAccess: true,
    })
    sdkReady.value = true
  } catch (err) {
    if (import.meta.env.DEV) console.error('[login] native GoogleAuth.initialize failed:', err)
    errorMsg.value = '구글 SDK 초기화에 실패했습니다. 앱을 재시작해 주세요.'
  }
}

async function signInWithGoogleNative() {
  isLoading.value = true
  errorMsg.value  = ''
  try {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
    const googleUser = await GoogleAuth.signIn()
    const accessToken = googleUser.authentication.accessToken
    if (!accessToken) throw new Error('Google access token missing from native sign-in response')
    await _finaliseLogin(accessToken)
  } catch (err: unknown) {
    // User cancelled the picker → silent failure; any other error shows a message
    const message = err instanceof Error ? err.message : String(err)
    if (!message.toLowerCase().includes('cancel')) {
      errorMsg.value = '구글 로그인에 실패했습니다. 다시 시도해 주세요.'
    }
    if (import.meta.env.DEV) console.error('[login] native sign-in error:', err)
    isLoading.value = false
  }
}

// ─────────────────────────────────────────────
// Shared: exchange Google access token → backend session
// ─────────────────────────────────────────────
async function _finaliseLogin(googleAccessToken: string) {
  try {
    errorMsg.value = ''
    await userStore.login(googleAccessToken)

    // Flush Vue's reactive queue so computed values (isAuthenticated,
    // isOnboardingComplete) reflect the tokens just written by login().
    await nextTick()

    // ── DEV: dump state so field-name mismatches are immediately visible ──
    if (import.meta.env.DEV) {
      console.log('[login] isAuthenticated    :', userStore.isAuthenticated)
      console.log('[login] isOnboardingComplete:', userStore.isOnboardingComplete)
      console.log('[login] profile            :', JSON.stringify(userStore.profile))
      console.log('[login] accessToken present:', !!userStore.accessToken)
    }

    // Safety check: if token persistence silently failed (e.g. backend field-name
    // mismatch — access_token vs accessToken) the guard would redirect us straight
    // back to /login, producing an invisible NavigationDuplicated.
    if (!userStore.isAuthenticated) {
      throw new Error(
        'Token persistence failed — isAuthenticated is still false after login(). ' +
        'Check that the backend response uses "accessToken" (camelCase).',
      )
    }

    const target = userStore.isOnboardingComplete
      ? { name: 'home' as const }
      : { name: 'onboarding-survey' as const }

    // Await navigation so any NavigationFailure can be distinguished from real
    // errors. A redirected failure (guard changed the destination) is acceptable;
    // anything else is a genuine problem we should surface.
    const navResult = await router.replace(target)

    if (import.meta.env.DEV && isNavigationFailure(navResult)) {
      console.warn('[login] navigation redirected/duplicated:', navResult)
    }
  } catch (err: unknown) {
    if (import.meta.env.DEV) console.error('[login] _finaliseLogin error:', err)

    // NavigationFailure objects are not user-facing errors — swallow them.
    // Only real exceptions (API errors, token errors) get shown.
    if (!isNavigationFailure(err)) {
      errorMsg.value = err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.'
    }
  } finally {
    isLoading.value = false
  }
}

// ─────────────────────────────────────────────
// Button handler — delegates to the right path
// ─────────────────────────────────────────────
function signInWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    if (!sdkReady.value) {
      errorMsg.value = 'Google SDK가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해 주세요.'
      return
    }
    signInWithGoogleNative()
  } else {
    if (!tokenClient) {
      errorMsg.value = 'Google SDK가 아직 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.'
      return
    }
    isLoading.value = true
    errorMsg.value  = ''
    tokenClient.requestAccessToken()
  }
}

// ─────────────────────────────────────────────
// Mount — redirect if already logged in, else init the right SDK
// ─────────────────────────────────────────────
onMounted(async () => {
  if (userStore.isAuthenticated) {
    router.replace(
      userStore.isOnboardingComplete ? { name: 'home' } : { name: 'onboarding-survey' },
    )
    return
  }

  if (Capacitor.isNativePlatform()) {
    // Native: use the Capacitor Google Auth plugin (no popup, works in WebView)
    await initNativeGoogleAuth()
  } else {
    // Web: inject the GSI <script> tag
    if (!document.querySelector('script[src*="gsi/client"]')) {
      const script    = document.createElement('script')
      script.src      = 'https://accounts.google.com/gsi/client'
      script.async    = true
      script.defer    = true
      script.onload   = initGoogleClient
      document.head.appendChild(script)
    } else if (window.google) {
      // Script was already loaded by a previous navigation
      initGoogleClient()
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col px-6">

    <!-- Spacer — push content to vertical center -->
    <div class="flex-1" />

    <!-- ── Brand section ── -->
    <div class="flex flex-col items-center gap-4 mb-12">
      <!-- App icon -->
      <div class="w-20 h-20 rounded-3xl bg-brand flex items-center justify-center shadow-lg">
        <span class="text-4xl leading-none">🪙</span>
      </div>
      <div class="flex flex-col items-center gap-1.5">
        <h1 class="text-4xl font-bold text-text-primary tracking-tight">Tikkle</h1>
        <p class="text-base text-text-tertiary text-center leading-relaxed">
          잔돈으로 시작하는<br>나만의 주식 투자
        </p>
      </div>
    </div>

    <!-- ── Call-to-action ── -->
    <div class="flex flex-col gap-3 mb-8">
      <!-- Google Sign-In button -->
      <button
        class="w-full flex items-center justify-center gap-3 bg-white border border-surface-border rounded-xl py-4 px-5 text-base font-semibold text-text-primary transition-colors active:bg-surface disabled:opacity-50"
        :disabled="isLoading"
        @click="signInWithGoogle"
      >
        <!-- Google colour logo -->
        <svg
          v-if="!isLoading"
          width="20"
          height="20"
          viewBox="0 0 48 48"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>

        <!-- Spinner while logging in -->
        <span
          v-else
          class="w-5 h-5 border-2 border-surface-border border-t-brand rounded-full animate-spin"
          aria-hidden="true"
        />

        <span>{{ isLoading ? '로그인 중...' : 'Google로 계속하기' }}</span>
      </button>

      <!-- Inline error message -->
      <p
        v-if="errorMsg"
        role="alert"
        class="text-sm text-danger text-center px-2"
      >
        {{ errorMsg }}
      </p>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- ── Legal footer ── -->
    <p class="mb-10 text-xs2 text-text-disabled text-center leading-relaxed px-4">
      계속 진행하면 Tikkle의
      <span class="underline">이용약관</span> 및
      <span class="underline">개인정보 처리방침</span>에 동의합니다.
    </p>
  </div>
</template>
