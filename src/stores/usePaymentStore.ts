import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Transaction, PaymentSummary } from '@/types'
import { mockTransactions, mockPaymentSummary } from '@/mocks'

export const usePaymentStore = defineStore('payment', () => {
  const transactions = ref<Transaction[]>([])
  const summary = ref<PaymentSummary | null>(null)

  const pendingTransactions = computed(() =>
    transactions.value.filter((t) => t.status === 'PENDING'),
  )

  function fetchTransactions() {
    transactions.value = mockTransactions
  }

  function fetchSummary() {
    summary.value = mockPaymentSummary
  }

  function selectStockForPending(transactionId: string, ticker: string) {
    const tx = transactions.value.find((t) => t.id === transactionId)
    if (tx) {
      tx.status = 'INVESTED'
      console.log(`Transaction ${transactionId} invested into ${ticker}`)
    }
  }

  function cancelPendingTransaction(transactionId: string) {
    const tx = transactions.value.find((t) => t.id === transactionId)
    if (tx) tx.status = 'CANCELED'
  }

  // ── Spare-change proposal approval (from NEED_APPROVAL notification) ──
  // Both endpoints take no body and authenticate via the JWT interceptor.
  async function approvePaymentEvent(eventId: string) {
    const { default: api } = await import('@/utils/api')
    await api.post(`/api/payments/${eventId}/approve`)
  }

  async function rejectPaymentEvent(eventId: string) {
    const { default: api } = await import('@/utils/api')
    await api.post(`/api/payments/${eventId}/reject`)
  }

  return {
    transactions,
    summary,
    pendingTransactions,
    fetchTransactions,
    fetchSummary,
    selectStockForPending,
    cancelPendingTransaction,
    approvePaymentEvent,
    rejectPaymentEvent,
  }
})
