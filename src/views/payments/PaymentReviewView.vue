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
import axios from 'axios'
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
    if (import.meta.env.DEV) console.error('[review]', extractErrorMessage(err))
    if (decision === 'approve') {
      errorMsg.value = '오류가 발생해 투자가 취소되었어요.'
    } else {
      errorMsg.value = '오류가 발생했어요. 다시 시도해 주세요.'
    }
  } finally {
    isLoading.value = false
  }
}

/**
 * Surfaces the backend's error message. The API wraps errors in
 * { code, message, data }, so prefer response.data.message over the generic
 * Axios "Request failed with status code 500".
 */
function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { code?: string; message?: string } | undefined
    if (data?.message) {
      return data.code ? `${data.message} (${data.code})` : data.message
    }
    return err.message
  }
  return err instanceof Error ? err.message : '처리 중 오류가 발생했어요. 다시 시도해 주세요.'
}
</script>

<template>
  <div class="min-h-screen bg-surface pb-8">
    <AppHeader title="잔돈 투자 확인" :show-back="true" />

    <!-- Proposal summary -->
    <div class="mx-4 mt-4 bg-brand-bg rounded-xl px-5 py-4 border border-brand-50 flex items-center justify-between gap-3">
      <span class="text-base font-semibold text-text-primary truncate">{{ merchant }}</span>
      <div class="text-right shrink-0">
        <p class="text-2xl font-bold text-brand leading-none">₩{{ fmt(spareChange) }}</p>
        <p class="text-xs2 text-brand-300 mt-1">₩{{ fmt(amount) }} 결제</p>
      </div>
    </div>

    <!-- Proposed coin -->
    <div
      v-if="stockName"
      class="mx-4 mt-3 rounded-2xl px-5 py-5 bg-brand-bg border border-brand-50"
    >
      <!-- AI 추천 배지 -->
      <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-brand/10 text-xs font-semibold text-brand mb-4">
        AI 추천
      </span>

      <!-- 코인 정보 -->
      <div class="flex items-center justify-between gap-4">
        <!-- 로고 -->
        <img
          v-if="ticker"
          :src="`https://static.upbit.com/logos/${ticker.replace('KRW-', '')}.png`"
          :alt="stockName"
          class="w-14 h-14 rounded-full object-contain bg-white shrink-0 p-1"
          @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
        >
        <!-- 텍스트 -->
        <div class="text-right">
          <p class="text-2xl font-bold text-text-primary leading-tight">{{ stockName }}</p>
          <p v-if="ticker" class="text-xs font-medium text-text-tertiary mt-0.5">{{ ticker }}</p>
        </div>
      </div>
    </div>

    <!-- 매수 안내 문구 -->
    <p v-if="stockName" class="mx-4 mt-4 text-sm text-text-secondary text-center">
      매수를 진행할까요?
    </p>

    <!-- Error -->
    <p v-if="errorMsg" role="alert" class="mx-4 mt-3 text-sm text-danger text-center">
      {{ errorMsg }}
    </p>
    <p v-if="!isActionable" class="mx-4 mt-4 text-sm text-danger text-center">
      잘못된 접근이에요. (주문 정보를 찾을 수 없습니다)
    </p>

    <!-- Approve / Reject -->
    <div class="mx-4 mt-5 flex flex-col gap-2">
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
