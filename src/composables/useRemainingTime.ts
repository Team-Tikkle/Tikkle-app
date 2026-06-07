import { ref, onMounted, onUnmounted } from 'vue'

export type RemainingTimeStatus = 'hours' | 'minutes' | 'expired'

export interface RemainingTimeResult {
  label: string              // e.g. "23시간 14분 남음" | "42분 남음" | "만료됨"
  status: RemainingTimeStatus
}

/**
 * Reactive countdown based on an ISO expiry timestamp.
 * Updates every 60 seconds. Clears interval on unmount.
 */
export function useRemainingTime(expiredAt: string): { remaining: ReturnType<typeof ref<RemainingTimeResult>> } {
  function compute(): RemainingTimeResult {
    const diffMs = new Date(expiredAt).getTime() - Date.now()
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
  }

  const remaining = ref<RemainingTimeResult>(compute())

  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    timer = setInterval(() => {
      remaining.value = compute()
    }, 60_000)
  })

  onUnmounted(() => {
    if (timer !== null) clearInterval(timer)
  })

  return { remaining }
}
