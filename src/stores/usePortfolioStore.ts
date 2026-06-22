import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Portfolio, ApiEnvelope } from '@/types'

export const usePortfolioStore = defineStore('portfolio', () => {
  const portfolio = ref<Portfolio | null>(null)
  const isLoading = ref(false)
  const error     = ref<string | null>(null)

  // GET /api/portfolios — 보유 코인 + 실시간 시세 결합 스냅샷
  async function fetchPortfolio(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const { default: api } = await import('@/utils/api')
      const { data: envelope } = await api.get<ApiEnvelope<Portfolio>>('/api/portfolios')
      portfolio.value = envelope.data
    } catch {
      error.value = '자산 정보를 불러오지 못했어요.'
    } finally {
      isLoading.value = false
    }
  }

  return {
    portfolio,
    isLoading,
    error,
    fetchPortfolio,
  }
})
