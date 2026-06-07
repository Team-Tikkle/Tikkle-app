import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/useUserStore'
import './style.css'

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
  app.use(router)

  // bootstrap() resolves auth state:
  //   - Token present → GET /api/users/me → profile populated
  //   - Token expired → Axios interceptor retries with refreshToken
  //   - Both expired  → tokens cleared, isAuthenticated = false
  //   - No token      → no-op, isAuthenticated = false
  const userStore = useUserStore()
  await userStore.bootstrap()

  // Mount after bootstrap — router guard sees definitive state on first navigation
  app.mount('#app')
})()
