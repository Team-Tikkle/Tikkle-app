import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AxiosError } from 'axios'
import type { Portfolio, ApiEnvelope } from '@/types'

export const usePortfolioStore = defineStore('portfolio', () => {
  const portfolio = ref<Portfolio | null>(null)
  const error     = ref<string | null>(null)
  // 업비트 키 만료/권한 부족(UPBIT-010) — 홈이 키 만료의 주 감지 지점이다.
  // 일반 오류와 구분해 "재연동 안내"를 띄우기 위한 플래그.
  const upbitKeyInvalid = ref(false)

  // GET /api/upbit/portfolios — 업비트 실보유 동기화, 보유 코인 + 원화잔액 스냅샷
  // (구 /api/portfolios에서 이전)
  async function fetchPortfolio(): Promise<void> {
    error.value = null
    upbitKeyInvalid.value = false
    try {
      const { default: api } = await import('@/utils/api')
      const { data: envelope } = await api.get<ApiEnvelope<Portfolio>>('/api/upbit/portfolios')
      portfolio.value = envelope.data
    } catch (err) {
      const code = (err as AxiosError<{ code?: string }>).response?.data?.code
      if (code === 'UPBIT-010') {
        // 로그아웃 금지 — 재연동이 필요한 상태
        upbitKeyInvalid.value = true
      } else {
        error.value = '자산 정보를 불러오지 못했어요.'
      }
    }
  }

  return {
    portfolio,
    error,
    upbitKeyInvalid,
    fetchPortfolio,
  }
})
