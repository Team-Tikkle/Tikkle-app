import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PortfolioSummary } from '@/types'
import { mockPortfolioSummary } from '@/mocks'

export const usePortfolioStore = defineStore('portfolio', () => {
  const summary = ref<PortfolioSummary | null>(null)
  const isLoading = ref(false)
  const lastUpdatedAt = ref<string | null>(null)

  function fetchPortfolio() {
    isLoading.value = true
    setTimeout(() => {
      summary.value = mockPortfolioSummary
      lastUpdatedAt.value = new Date().toISOString()
      isLoading.value = false
    }, 500)
  }

  function refreshPortfolio() {
    fetchPortfolio()
  }

  return { summary, isLoading, lastUpdatedAt, fetchPortfolio, refreshPortfolio }
})
