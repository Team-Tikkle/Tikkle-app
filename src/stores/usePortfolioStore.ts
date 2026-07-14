import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Portfolio, ApiEnvelope } from '@/types'

export const usePortfolioStore = defineStore('portfolio', () => {
  const portfolio = ref<Portfolio | null>(null)
  const isLoading = ref(false)
  const error     = ref<string | null>(null)

  // GET /api/upbit/portfolios — 업비트 실보유 동기화, 보유 코인 + 원화잔액 스냅샷
  // (구 /api/portfolios에서 이전)
  async function fetchPortfolio(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const { default: api } = await import('@/utils/api')
      const { data: envelope } = await api.get<ApiEnvelope<Portfolio>>('/api/upbit/portfolios')
      portfolio.value = envelope.data
    } catch {
      error.value = '자산 정보를 불러오지 못했어요.'
    } finally {
      isLoading.value = false
    }
  }

  return {
    portfolio,
    error,
    fetchPortfolio,
  }
})
