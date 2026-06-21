<script setup lang="ts">
/**
 * PaymentReviewView.vue
 *
 * Reached by tapping a NEED_APPROVAL feedback notification. The native listener
 * opens a deep link (tikkle://payments/review?...) carrying the proposal details;
 * the user approves or rejects the spare-change investment here.
 *
 * Route: /payments/review?eventId&merchant&amount&spareChange&ticker&stockName
 * API  : POST /api/payments/{eventId}/approve | /reject  (JWT, no body)
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePaymentStore } from '@/stores/usePaymentStore'
import AppHeader from '@/components/common/AppHeader.vue'

const route = useRoute()
const router = useRouter()
const paymentStore = usePaymentStore()

// ── Read proposal data passed via the deep link ──
const eventId     = route.query.eventId as string | undefined
const merchant    = (route.query.merchant as string) || '결제처'
const amount      = Number(route.query.amount ?? 0)
const spareChange = Number(route.query.spareChange ?? 0)
const stockName   = (route.query.stockName as string) || ''
const ticker      = (route.query.ticker as string) || ''

const isLoading = ref(false)
const errorMsg  = ref('')

// Missing eventId means we cannot call approve/reject — guard the UI.
const isActionable = computed(() => !!eventId)

function fmt(n: number) {
  return n.toLocaleString('ko-KR')
}

async function handle(decision: 'approve' | 'reject') {
  if (isLoading.value || !eventId) return
  isLoading.value = true
  errorMsg.value  = ''
  try {
    if (decision === 'approve') {
      await paymentStore.approvePaymentEvent(eventId)
    } else {
      await paymentStore.rejectPaymentEvent(eventId)
    }
    router.replace('/payments')
  } catch (err: unknown) {
    errorMsg.value = err instanceof Error
      ? err.message
      : '처리 중 오류가 발생했어요. 다시 시도해 주세요.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface pb-8">
    <AppHeader title="잔돈 투자 확인" :show-back="true" />

    <!-- Proposal summary -->
    <div class="mx-4 mt-4 bg-brand-bg rounded-xl p-4 border border-brand-50">
      <p class="text-xs2 text-brand-300 mb-1">투자할 잔돈</p>
      <p class="text-2xl font-bold text-brand">₩{{ fmt(spareChange) }}</p>
      <p class="text-sm text-text-tertiary mt-1">
        {{ merchant }} · ₩{{ fmt(amount) }} 결제
      </p>
    </div>

    <!-- Proposed coin -->
    <div v-if="stockName" class="mx-4 mt-5 bg-white rounded-xl p-4">
      <p class="text-base font-bold text-text-primary mb-1">제안 코인</p>
      <p class="text-lg font-bold text-text-primary">{{ stockName }}</p>
      <p v-if="ticker" class="text-sm text-text-tertiary">{{ ticker }}</p>
      <p class="text-sm text-text-secondary leading-relaxed mt-3">
        결제 잔돈 ₩{{ fmt(spareChange) }}으로 {{ stockName }} 매수를 진행할까요?
      </p>
    </div>

    <!-- Error -->
    <p v-if="errorMsg" role="alert" class="mx-4 mt-4 text-sm text-danger text-center">
      {{ errorMsg }}
    </p>
    <p v-if="!isActionable" class="mx-4 mt-4 text-sm text-danger text-center">
      잘못된 접근이에요. (주문 정보를 찾을 수 없습니다)
    </p>

    <!-- Approve / Reject -->
    <div class="mx-4 mt-6 flex flex-col gap-2">
      <button
        class="w-full py-4 rounded-xl text-white text-md font-semibold transition-colors flex items-center justify-center gap-2"
        :class="(isLoading || !isActionable) ? 'bg-text-disabled' : 'bg-brand active:bg-brand-hover'"
        :disabled="isLoading || !isActionable"
        @click="handle('approve')"
      >
        <span
          v-if="isLoading"
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        승인하고 투자하기
      </button>
      <button
        class="w-full py-3 rounded-xl bg-white border border-surface-border text-text-tertiary text-base font-medium active:bg-surface"
        :disabled="isLoading || !isActionable"
        @click="handle('reject')"
      >
        거부
      </button>
    </div>
  </div>
</template>
