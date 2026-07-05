import { ref } from 'vue';

/**
 * isLoading / errorMsg / run 을 하나로 묶은 컴포저블.
 * try-catch-finally 보일러플레이트를 제거한다.
 *
 * @param fallbackMsg  err.message 가 없을 때 보여줄 기본 오류 메시지
 */
export function useAsyncAction(fallbackMsg = '오류가 발생했습니다. 다시 시도해 주세요.') {
  const isLoading = ref(false);
  const errorMsg = ref('');

  async function run(
    fn: () => Promise<void>,
    msgOverride?: string,
  ): Promise<void> {
    isLoading.value = true;
    errorMsg.value = '';
    try {
      await fn();
    } catch (err) {
      errorMsg.value =
        err instanceof Error ? err.message : (msgOverride ?? fallbackMsg);
    } finally {
      isLoading.value = false;
    }
  }

  return { isLoading, errorMsg, run };
}
