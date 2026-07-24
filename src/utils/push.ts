import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { showToast } from '@/composables/useAndroidBack'
import { navigateFromDeepLink } from '@/utils/deeplink'

// ── FCM push notifications (Android native only) ─────────────────────────────
// Receives server-initiated result notifications (trade settled/failed/expired,
// Upbit key invalid — see Tikkle_notification_spec.md §7). The channel id must
// match the value the backend puts in the FCM payload exactly.
const CHANNEL_ID = 'tikkle_payment_result'

// Token most recently issued by FCM — needed for DELETE on logout.
let currentToken: string | null = null
let listenersAttached = false

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

async function sendTokenToServer(token: string): Promise<void> {
  // Must not block app flow — a failed registration retries on next launch.
  try {
    const { default: api } = await import('@/utils/api')
    await api.post('/api/users/me/device-token', { fcmToken: token })
  } catch (err) {
    console.warn('[push] device-token registration failed:', err)
  }
}

/**
 * Registers this device for FCM and uploads the token to the backend.
 * Call after the user is authenticated (bootstrap and login/signup success).
 * Safe to call repeatedly — the server upserts tokens idempotently.
 */
export async function registerPush(): Promise<void> {
  if (!isNative()) return

  if (!listenersAttached) {
    listenersAttached = true

    await PushNotifications.addListener('registration', ({ value }) => {
      currentToken = value
      void sendTokenToServer(value)
    })

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] FCM registration error:', err)
    })

    // Notification tapped (app background/killed) → follow the deep link.
    // Unknown `type` values must not crash — we only ever read `deepLink`.
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const deepLink = action.notification.data?.deepLink
      if (typeof deepLink === 'string' && deepLink) navigateFromDeepLink(deepLink)
    })

    // Notification received while app is in the FOREGROUND → in-app toast only
    // (the system notification is suppressed to avoid showing a duplicate).
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const msg = notification.title || notification.body
      if (msg) showToast(msg)
    })
  }

  try {
    await PushNotifications.createChannel({
      id: CHANNEL_ID,
      name: '투자 결과 알림',
      description: '매수 체결·실패·만료 결과를 알려줍니다.',
      importance: 4, // IMPORTANCE_HIGH
      visibility: 1,
    })

    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive !== 'granted') {
      console.warn('[push] notification permission not granted — skipping FCM register.')
      return
    }

    await PushNotifications.register()
  } catch (err) {
    // Missing google-services.json etc. — never block the app over push setup.
    console.warn('[push] FCM setup failed:', err)
  }
}

/**
 * Unregisters this device's token from the backend. Call on logout, BEFORE
 * the session is cleared (the DELETE request needs the auth header).
 */
export async function unregisterPush(): Promise<void> {
  if (!isNative() || !currentToken) return
  try {
    const { default: api } = await import('@/utils/api')
    await api.delete('/api/users/me/device-token', { data: { fcmToken: currentToken } })
  } catch (err) {
    console.warn('[push] device-token removal failed:', err)
  }
}
