import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { App as CapApp } from '@capacitor/app'
import { initAndroidBack } from './composables/useAndroidBack'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/useUserStore'
import { navigateFromDeepLink } from './utils/deeplink'
import './style.css'

// ── Splash screen (index.html #app-splash) ──
// Fades out and removes the static splash once the router's initial
// navigation has resolved, so the first view the user sees is fully formed.
function hideSplash() {
  const splash = document.getElementById('app-splash')
  if (!splash) return
  splash.classList.add('app-splash--hidden')
  splash.addEventListener('transitionend', () => splash.remove(), { once: true })
}

// ── Bootstrap sequence ──
// Wrapped in an async IIFE to avoid top-level await (not supported in ES2020).
//
// Strategy: mount the app ONLY after auth state is fully resolved.
// This means the DOM stays empty (#app has no children) until bootstrap()
// completes, so the router's initial navigation always sees the correct
// isAuthenticated / isOnboardingComplete values — zero flash of protected content.
;(async () => {
  const app   = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  // bootstrap() must complete BEFORE app.use(router) because Vue Router 4
  // triggers the initial navigation inside router.install() (app.use call).
  // If the router is installed first, the guard runs with profile=null and
  // always redirects to onboarding regardless of actual server state.
  const userStore = useUserStore()
  await userStore.bootstrap()

  app.use(router)
  initAndroidBack(router)
  // 초기 내비게이션이 완전히 끝난 뒤 마운트해야, 스플래시가 사라졌을 때
  // 화면이 비어있거나 잘못된 라우트가 잠깐 보이는 일이 없다.
  await router.isReady()
  app.mount('#app')
  hideSplash()

  // Deep links (native only; no-ops on web). Handle both warm (appUrlOpen)
  // and cold-start (getLaunchUrl) cases.
  CapApp.addListener('appUrlOpen', ({ url }) => navigateFromDeepLink(url))
  const launch = await CapApp.getLaunchUrl()
  if (launch?.url) navigateFromDeepLink(launch.url)

  // FCM: register the device token once the session is confirmed valid.
  // Login/signup paths call registerPush from the user store instead.
  if (userStore.isAuthenticated) {
    const { registerPush } = await import('@/utils/push')
    void registerPush()
  }
})()
