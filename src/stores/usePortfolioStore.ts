import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AxiosError } from 'axios'
import type { Portfolio, ApiEnvelope } from '@/types'
import { USE_MOCK, mockPortfolio } from '@/mocks'

export const usePortfolioStore = defineStore('portfolio', () => {
  const portfolio = ref<Portfolio | null>(null)
  const error     = ref<string | null>(null)
  // 서버가 내려준 원문 메시지 — 안내 문구 아래 보조 줄로 노출한다.
  const errorDetail = ref<string | null>(null)
  const loading   = ref(false)
  // 업비트 키 만료/권한 부족(UPBIT-010) — 홈이 키 만료의 주 감지 지점이다.
  // 일반 오류와 구분해 "재연동 안내"를 띄우기 위한 플래그.
  const upbitKeyInvalid = ref(false)

  // GET /api/upbit/portfolios — 업비트 실보유 동기화, 보유 코인 + 원화잔액 스냅샷
  // (구 /api/portfolios에서 이전)
  async function fetchPortfolio(): Promise<void> {
    error.value = null
    errorDetail.value = null
    upbitKeyInvalid.value = false
    loading.value = true
    try {
      if (USE_MOCK) {
        portfolio.value = mockPortfolio
        return
      }
      const { default: api } = await import('@/utils/api')
      const { data: envelope } = await api.get<ApiEnvelope<Portfolio>>('/api/upbit/portfolios')
      portfolio.value = envelope.data
    } catch (err) {
      // 실패했으면 직전 성공분을 남기지 않는다 — 재연동/오류 안내 아래에
      // 옛 자산 금액이 그대로 보이는 것을 막는다.
      portfolio.value = null
      const res = (err as AxiosError<{ code?: string; message?: string }>).response?.data
      if (res?.code === 'UPBIT-010') {
        // 로그아웃 금지 — 재연동이 필요한 상태
        upbitKeyInvalid.value = true
      } else {
        error.value = '자산 정보를 불러오지 못했어요.'
        errorDetail.value = res?.message ?? null
      }
    } finally {
      loading.value = false
    }
  }

  return {
    portfolio,
    error,
    errorDetail,
    loading,
    upbitKeyInvalid,
    fetchPortfolio,
  }
})
