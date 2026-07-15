import { computed, onMounted, onUnmounted, ref, type ComputedRef } from 'vue'

export type RemainingTimeStatus = 'hours' | 'minutes' | 'expired'

export interface RemainingTimeResult {
  label: string              // e.g. "23시간 14분 남음" | "42분 남음" | "만료됨"
  status: RemainingTimeStatus
}

// 모든 useRemainingTime 인스턴스가 공유하는 단일 60초 틱.
// 잔여 시간이 다른 여러 행이 있어도 setInterval은 하나만 돈다 — 구독자가
// 있을 때만 타이머를 켜고, 마지막 구독자가 사라지면 끈다.
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
let subscriberCount = 0

function subscribe() {
  subscriberCount += 1
  if (timer === null) {
    timer = setInterval(() => { now.value = Date.now() }, 60_000)
  }
}

function unsubscribe() {
  subscriberCount -= 1
  if (subscriberCount <= 0 && timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

/**
 * Reactive countdown based on an ISO expiry timestamp.
 * Updates every 60 seconds via a single shared timer (see above).
 */
export function useRemainingTime(expiredAt: string): { remaining: ComputedRef<RemainingTimeResult> } {
  const remaining = computed<RemainingTimeResult>(() => {
    const diffMs = new Date(expiredAt).getTime() - now.value
    if (diffMs <= 0) {
      return { label: '만료됨', status: 'expired' }
    }
    const totalMinutes = Math.floor(diffMs / 60_000)
    const hours   = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours >= 1) {
      return {
        label: minutes > 0 ? `${hours}시간 ${minutes}분 남음` : `${hours}시간 남음`,
        status: 'hours',
      }
    }
    return { label: `${minutes}분 남음`, status: 'minutes' }
  })

  onMounted(subscribe)
  onUnmounted(unsubscribe)

  return { remaining }
}
