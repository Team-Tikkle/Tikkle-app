import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { App as CapApp } from '@capacitor/app'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/useUserStore'
import './style.css'

// ── Deep-link handler ──
// Native payment-approval notifications open tikkle://payments/review?...
// Parse the URL and route to the in-app review screen.
function navigateFromDeepLink(url: string) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.replace(/\/$/, '')
    if (parsed.hostname === 'payments' && path === '/review') {
      router.push({
        path: '/payments/review',
        query: Object.fromEntries(parsed.searchParams.entries()),
      })
    }
  } catch (e) {
    console.warn('[deeplink] could not parse url:', url, e)
  }
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
  app.mount('#app')

  // Deep links (native only; no-ops on web). Handle both warm (appUrlOpen)
  // and cold-start (getLaunchUrl) cases.
  CapApp.addListener('appUrlOpen', ({ url }) => navigateFromDeepLink(url))
  const launch = await CapApp.getLaunchUrl()
  if (launch?.url) navigateFromDeepLink(launch.url)
})()
