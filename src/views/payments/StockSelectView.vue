<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePaymentStore } from '@/stores/usePaymentStore'
import AppHeader from '@/components/common/AppHeader.vue'
import { mockStockRecommendations } from '@/mocks'
import { useRemainingTime } from '@/composables/useRemainingTime'

const route = useRoute()
const router = useRouter()
const paymentStore = usePaymentStore()

const transactionId = route.params.id as string
const transaction = computed(() =>
  paymentStore.transactions.find((t) => t.id === transactionId),
)

// Remaining time for this PENDING transaction (only rendered when expired_at exists)
const expiredAt = computed(() => transaction.value?.expired_at ?? '')
const { remaining } = useRemainingTime(expiredAt.value)

// CSS class for the countdown label
const timeColorClass = computed(() => {
  if (!remaining.value) return ''
  if (remaining.value.status === 'expired')  return 'text-gray-400'
  if (remaining.value.status === 'minutes')  return 'text-red-500'
  return 'text-amber-500'
})

function selectStock(ticker: string) {
  paymentStore.selectStockForPending(transactionId, ticker)
  router.push('/payments')
}

function cancelInvestment() {
  paymentStore.cancelPendingTransaction(transactionId)
  router.push('/payments')
}

function fmt(n: number) {
  return n.toLocaleString('ko-KR')
}
</script>

<template>
  <div class="min-h-screen bg-surface pb-8">
    <AppHeader title="코인 선택" :show-back="true" />

    <!-- Transaction info card -->
    <div v-if="transaction" class="mx-4 mt-4 bg-brand-bg rounded-xl p-4 border border-brand-50">
      <p class="text-xs2 text-brand-300 mb-1">투자할 잔돈</p>
      <p class="text-2xl font-bold text-brand">₩{{ fmt(transaction.round_up_amount) }}</p>
      <p class="text-sm text-text-tertiary mt-1">
        {{ transaction.merchant }} · ₩{{ fmt(transaction.amount) }} 결제
      </p>

      <!-- Remaining time for PENDING -->
      <div v-if="transaction.expired_at && remaining" class="mt-2 flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" :class="timeColorClass">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span class="text-xs2 font-medium" :class="timeColorClass">{{ remaining.label }}</span>
      </div>
    </div>

    <!-- AI recommendations -->
    <div class="mx-4 mt-5">
      <p class="text-base font-bold text-text-primary mb-3">🤖 AI 추천 코인</p>
      <div class="flex flex-col gap-3">
        <div
          v-for="stock in mockStockRecommendations"
          :key="stock.ticker"
          class="bg-white rounded-xl p-4"
        >
          <div class="flex items-start justify-between mb-2">
            <div>
              <p class="text-base font-bold text-text-primary">{{ stock.name }}</p>
              <p class="text-sm text-text-tertiary">{{ stock.ticker }} · {{ stock.category }}</p>
            </div>
          </div>
          <p class="text-sm text-text-secondary leading-relaxed mb-4">{{ stock.reason }}</p>
          <button
            class="w-full py-3 bg-brand text-white text-base font-semibold rounded-xl active:bg-brand-hover"
            @click="selectStock(stock.ticker)"
          >
            이 코인에 투자하기
          </button>
        </div>
      </div>
    </div>

    <!-- Cancel button -->
    <div class="mx-4 mt-3">
      <button
        class="w-full py-3 bg-white border border-surface-border text-text-tertiary text-base font-medium rounded-xl active:bg-surface"
        @click="cancelInvestment"
      >
        투자 취소
      </button>
    </div>
  </div>
</template>
