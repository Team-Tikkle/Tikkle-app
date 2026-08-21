import { ref, watch, onUnmounted } from 'vue'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { Ref, ComputedRef } from 'vue'
import type { Router } from 'vue-router'

// ── Priority handler stack ────────────────────────────────────────────────────
// Last registered = highest priority. Handler returns true if it consumed the event.
const _handlers: Array<() => boolean> = []

function registerBackHandler(handler: () => boolean): () => void {
  _handlers.push(handler)
  return () => {
    const i = _handlers.lastIndexOf(handler)
    if (i !== -1) _handlers.splice(i, 1)
  }
}

// Convenience: auto-unregisters when the calling component unmounts.
export function useBackHandler(handler: () => boolean) {
  const unregister = registerBackHandler(handler)
  onUnmounted(unregister)
}

// ── Modal back handler ────────────────────────────────────────────────────────
// Registers/unregisters a handler automatically while a modal is open.
export function useModalBackHandler(
  isOpen: Ref<boolean> | ComputedRef<boolean> | (() => boolean),
  onClose: () => void,
) {
  let unregister: (() => void) | null = null

  const getOpen = typeof isOpen === 'function' ? isOpen : () => (isOpen as Ref<boolean>).value

  watch(
    () => getOpen(),
    (open) => {
      if (open) {
        unregister = registerBackHandler(() => { onClose(); return true })
      } else {
        unregister?.()
        unregister = null
      }
    },
  )

  onUnmounted(() => { unregister?.(); unregister = null })
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export const toastMessage = ref('')
let _toastTimer: ReturnType<typeof setTimeout> | null = null

export function showToast(msg: string) {
  toastMessage.value = msg
  if (_toastTimer) clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => { toastMessage.value = '' }, 2000)
}

// ── Global initializer — call once from main.ts ───────────────────────────────
const TAB_PATHS = new Set(['/', '/payments', '/insights', '/settings'])

export function initAndroidBack(router: Router) {
  if (!Capacitor.isNativePlatform()) return

  let lastBackMs = 0

  App.addListener('backButton', () => {
    // 1. Priority handlers (modals, deep-link pages, etc.)
    for (let i = _handlers.length - 1; i >= 0; i--) {
      if (_handlers[i]()) return
    }

    const path = router.currentRoute.value.path

    // 2. Tab root → double-back-to-exit
    if (TAB_PATHS.has(path)) {
      const now = Date.now()
      if (now - lastBackMs < 2000) {
        App.exitApp()
      } else {
        lastBackMs = now
        showToast('한 번 더 누르면 앱이 종료됩니다')
      }
      return
    }

    // 3. Default: go back in history
    router.back()
  })
}
