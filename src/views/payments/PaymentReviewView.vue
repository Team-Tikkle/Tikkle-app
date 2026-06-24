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
  <div class="min-h-screen bg-surface flex flex-col">
    <AppHeader title="잔돈 투자 확인" :show-back="true" />

    <!-- 카드 영역 -->
    <div class="flex-1 flex flex-col px-4 pt-4 pb-8">
      <div class="bg-white rounded-3xl px-6 pt-8 pb-6 flex flex-col items-center gap-6 shadow-sm">

        <!-- 상단 타이틀 -->
        <h2 class="text-2xl font-bold text-text-primary text-center leading-snug">
          {{ merchant }} 잔돈 {{ fmt(spareChange) }}원으로<br>
          {{ stockName || '코인' }}에 투자할까요?
        </h2>

        <!-- 코인 로고 + AI 추천 배지 -->
        <div class="relative flex items-center justify-center">
          <div class="w-32 h-32 rounded-full bg-surface flex items-center justify-center shadow-inner">
            <img
              v-if="ticker"
              :src="`https://static.upbit.com/logos/${ticker.replace('KRW-', '')}.png`"
              :alt="stockName"
              class="w-24 h-24 object-contain"
              @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
            >
          </div>
          <!-- AI 추천 말풍선 -->
          <div class="absolute -top-1 -right-2 flex flex-col items-center">
            <span
              class="px-3 py-1 rounded-full text-xs font-semibold text-white"
              style="background: linear-gradient(135deg, #a78bfa, #60a5fa, #34d399)"
            >
              AI 추천
            </span>
            <!-- 말풍선 꼬리 -->
            <svg width="10" height="6" viewBox="0 0 10 6" class="-mt-px">
              <polygon points="5,6 0,0 10,0" fill="url(#tail-grad)" />
              <defs>
                <linearGradient id="tail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#a78bfa"/>
                  <stop offset="100%" stop-color="#60a5fa"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <!-- 결제 정보 테이블 -->
        <div class="w-full flex flex-col divide-y divide-surface-border">
          <div class="flex items-center justify-between py-3.5">
            <span class="text-base text-text-tertiary">결제</span>
            <span class="text-base font-semibold text-text-primary">{{ merchant }} {{ fmt(amount) }}원</span>
          </div>
          <div class="flex items-center justify-between py-3.5">
            <span class="text-base text-text-tertiary">투자 금액</span>
            <span class="text-base font-semibold text-text-primary">{{ fmt(spareChange) }}원</span>
          </div>
        </div>

        <!-- 에러 -->
        <p v-if="errorMsg" role="alert" class="text-sm text-danger text-center -mb-2">
          {{ errorMsg }}
        </p>
        <p v-if="!isActionable" class="text-sm text-danger text-center -mb-2">
          잘못된 접근이에요. (주문 정보를 찾을 수 없습니다)
        </p>

        <!-- 투자하기 버튼 -->
        <button
          class="w-full py-4 rounded-2xl text-white text-lg font-bold transition-colors flex items-center justify-center gap-2"
          :class="(isLoading || !isActionable) ? 'bg-text-disabled' : 'bg-brand active:bg-brand-hover'"
          :disabled="isLoading || !isActionable"
          @click="handle('approve')"
        >
          <span
            v-if="isLoading"
            class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
          />
          투자하기
        </button>

        <!-- 거부 텍스트 버튼 -->
        <button
          class="text-base text-text-tertiary font-medium"
          :disabled="isLoading || !isActionable"
          @click="handle('reject')"
        >
          거부
        </button>

      </div>
    </div>
  </div>
</template>
