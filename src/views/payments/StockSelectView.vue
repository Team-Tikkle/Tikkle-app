<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePaymentStore } from '@/stores/usePaymentStore'
import AppHeader from '@/components/common/AppHeader.vue'
import { mockStockRecommendations } from '@/mocks'

const route = useRoute()
const router = useRouter()
const paymentStore = usePaymentStore()

const transactionId = route.params.id as string
const transaction = computed(() =>
  paymentStore.transactions.find((t) => t.id === transactionId),
)

function selectStock(ticker: string) {
  paymentStore.selectStockForPending(transactionId, ticker)
  router.push('/payments')
}

function cancelInvestment() {
  paymentStore.cancelPendingTransaction(transactionId)
  router.push('/payments')
}

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-8">
    <AppHeader title="종목 선택" :show-back="true" />

    <!-- Transaction info -->
    <div v-if="transaction" class="mx-4 mt-4 bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
      <p class="text-xs text-indigo-400 mb-1">투자할 잔돈</p>
      <p class="text-xl font-black text-indigo-700">₩{{ formatKRW(transaction.round_up_amount) }}</p>
      <p class="text-xs text-gray-500 mt-1">{{ transaction.merchant }} · ₩{{ formatKRW(transaction.amount) }} 결제</p>
    </div>

    <!-- AI recommendations -->
    <div class="mx-4 mt-6">
      <p class="text-sm font-bold text-gray-700 mb-3">🤖 AI 추천 종목</p>
      <div class="flex flex-col gap-3">
        <div
          v-for="stock in mockStockRecommendations"
          :key="stock.ticker"
          class="bg-white rounded-2xl p-4"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <p class="text-sm font-bold text-gray-800">{{ stock.name }}</p>
              <p class="text-xs text-gray-400">{{ stock.ticker }} · {{ stock.category }}</p>
            </div>
          </div>
          <p class="text-xs text-gray-600 mb-4 leading-relaxed">{{ stock.reason }}</p>
          <button
            class="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl active:bg-indigo-700"
            @click="selectStock(stock.ticker)"
          >
            이 종목에 투자하기
          </button>
        </div>
      </div>
    </div>

    <!-- Cancel button -->
    <div class="mx-4 mt-4">
      <button
        class="w-full py-3 bg-white border border-gray-200 text-gray-500 text-sm font-medium rounded-xl active:bg-gray-50"
        @click="cancelInvestment"
      >
        투자 취소
      </button>
    </div>
  </div>
</template>
