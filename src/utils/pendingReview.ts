/**
 * 승인 후 SSE 대기 중인 결제 건을 기억한다.
 * 앱을 나갔다 돌아와도 진행 중이던 매수 화면으로 되돌리기 위한 용도이며,
 * 터미널 이벤트(성공/실패/타임아웃)가 오면 지운다.
 */
const KEY = 'tikkle_pending_review'

export const savePendingReview = (query: Record<string, string>): void =>
  localStorage.setItem(KEY, JSON.stringify(query))

export function loadPendingReview(): Record<string, string> | null {
  // 부팅 경로에서 호출된다 — 값이 깨져 있어도 앱이 죽으면 안 된다.
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

export const clearPendingReview = (): void => localStorage.removeItem(KEY)
