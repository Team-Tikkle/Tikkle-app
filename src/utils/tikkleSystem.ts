import { Capacitor, registerPlugin } from '@capacitor/core'

// ── TikkleSystem native bridge (Android only) ────────────────────────────────
// Backed by android/.../TikkleSystemPlugin.java. Every call is a no-op /
// safe default on web so views can call these unconditionally.
interface TikkleSystemPlugin {
  isNotificationListenerEnabled(): Promise<{ enabled: boolean }>
  openNotificationAccessSettings(): Promise<void>
  isIgnoringBatteryOptimizations(): Promise<{ ignoring: boolean }>
  requestIgnoreBatteryOptimizations(): Promise<void>
  openBatteryOptimizationSettings(): Promise<void>
}

const TikkleSystem = registerPlugin<TikkleSystemPlugin>('TikkleSystem')

/** 리스너(알림 접근) 권한이 켜져 있는지. 웹에서는 항상 true (배너 미노출). */
export async function isListenerEnabled(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true
  try {
    return (await TikkleSystem.isNotificationListenerEnabled()).enabled
  } catch {
    return true
  }
}

/** 시스템 알림 접근 설정 화면 열기. */
export async function openNotificationAccessSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try { await TikkleSystem.openNotificationAccessSettings() } catch { /* no-op */ }
}

/** 배터리 최적화 예외가 적용되어 있는지. 웹에서는 항상 true. */
export async function isBatteryExempt(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true
  try {
    return (await TikkleSystem.isIgnoringBatteryOptimizations()).ignoring
  } catch {
    return true
  }
}

/** 배터리 최적화 예외 시스템 요청 다이얼로그를 띄운다. */
export async function requestBatteryExemption(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try { await TikkleSystem.requestIgnoreBatteryOptimizations() } catch { /* no-op */ }
}

/**
 * 배터리 최적화 앱별 관리 목록 화면을 연다.
 * 이미 예외 적용된 상태에서는 requestBatteryExemption()의 다이얼로그가 아무 UI 없이
 * 바로 닫혀버리므로, 그 경우엔 이 함수로 현재 상태를 눈으로 확인/관리할 수 있게 한다.
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try { await TikkleSystem.openBatteryOptimizationSettings() } catch { /* no-op */ }
}

/** 배터리 최적화 예외가 아직 없다면 시스템 요청 다이얼로그를 띄운다. */
export async function requestBatteryExemptionIfNeeded(): Promise<void> {
  if (!(await isBatteryExempt())) await requestBatteryExemption()
}
