import { ref, onUnmounted } from 'vue'

/**
 * 단순 초 단위 카운트다운. SMS 재발송 쿨다운(60초) 등에 사용.
 * start(n) 호출 시 n초부터 0까지 1초씩 감소하며, active는 남은 시간이 있을 때 true.
 */
export function useCountdown() {
  const seconds = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  function stop() {
    if (timer !== null) { clearInterval(timer); timer = null }
  }

  function start(from: number) {
    stop()
    seconds.value = from
    timer = setInterval(() => {
      seconds.value -= 1
      if (seconds.value <= 0) stop()
    }, 1000)
  }

  onUnmounted(stop)

  return { seconds, start, stop }
}
