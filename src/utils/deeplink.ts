import router from '@/router'

// ── Deep-link handler ──
// Native notifications (local + FCM) open tikkle:// URLs:
//   tikkle://payments/review?...  → in-app review screen
//   tikkle://payments             → payment history
//   tikkle://settings/api-key     → Upbit key management
//   tikkle://home                 → home
export function navigateFromDeepLink(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    const path = parsed.pathname.replace(/\/$/, '')
    if (host === 'payments' && path === '/review') {
      router.push({
        path: '/payments/review',
        query: Object.fromEntries(parsed.searchParams.entries()),
      })
    } else if (host === 'payments') {
      router.push('/payments')
    } else if (host === 'settings' && path === '/api-key') {
      router.push('/settings/api-key')
    } else if (host === 'home') {
      router.push('/')
    }
  } catch (e) {
    console.warn('[deeplink] could not parse url:', url, e)
  }
}
