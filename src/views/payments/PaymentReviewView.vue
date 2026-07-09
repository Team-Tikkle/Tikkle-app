<script setup lang="ts">
/**
 * PaymentReviewView.vue
 *
 * Reached by tapping a WAITING_APPROVAL feedback notification. The native listener
 * opens a deep link (tikkle://payments/review?...) carrying the proposal details;
 * the user approves or rejects the spare-change investment here.
 *
 * Route  : /payments/review?eventId&merchant&amount&spareChange&ticker&stockName
 * Flow   :
 *   1. POST /api/payments/{eventId}/approve
 *   2. 200 OK → open SSE GET /api/payments/{eventId}/stream
 *   3. Await SUCCESS | PENDING_TRADE | FAILED | TIMEOUT event, then close SSE
 */
import { ref, computed, onUnmounted } from 'vue';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useRoute, useRouter } from 'vue-router';
import { usePaymentStore } from '@/stores/usePaymentStore';
import AppHeader from '@/components/common/AppHeader.vue';
import { fmtKRW } from '@/utils/format';
import { coinIconUrl, coinIconFallback } from '@/utils/coin';
import type { SseTradeResult } from '@/types';

const route = useRoute();
const router = useRouter();
const paymentStore = usePaymentStore();

// ── Deep-link params ──
const eventId = route.query.eventId as string | undefined;
const merchant = (route.query.merchant as string) || '결제처';
const amount = Number(route.query.amount ?? 0);
const spareChange = Number(route.query.spareChange ?? 0);
const stockName = (route.query.stockName as string) || '';
const ticker = (route.query.ticker as string) || '';

const isActionable = computed(() => !!eventId);

// ── Phase state machine ──
// idle → approving → waiting → success | pending_trade | failed
type Phase = 'idle' | 'approving' | 'waiting' | 'success' | 'pending_trade' | 'failed';
const phase = ref<Phase>('idle');
const errorMsg = ref('');
const sseResult = ref<SseTradeResult | null>(null);
let sseAbort: AbortController | null = null;

onUnmounted(() => sseAbort?.abort());

// ── Approve + SSE ──
async function handleApprove() {
  if (!eventId || phase.value !== 'idle') return;

  // Step 1: POST approve
  phase.value = 'approving';
  errorMsg.value = '';
  try {
    await paymentStore.approvePaymentEvent(eventId);
  } catch {
    phase.value = 'idle';
    errorMsg.value =
      '오류가 발생해 투자 요청에 실패했어요. 다시 시도해 주세요.';
    return;
  }

  // Step 2: open SSE
  phase.value = 'waiting';
  sseAbort = new AbortController();
  const token = localStorage.getItem('tikkle_access_token') ?? '';
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string) ?? '';

  fetchEventSource(`${baseUrl}/api/payments/${eventId}/stream`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: sseAbort.signal,
    onmessage(ev) {
      const name = ev.event;
      // CONNECTED / PROCESSING → 계속 대기
      if (name === 'CONNECTED' || name === 'PROCESSING') return;

      // 터미널 이벤트: 연결 즉시 종료
      sseAbort?.abort();

      let data: SseTradeResult;
      try {
        data = JSON.parse(ev.data) as SseTradeResult;
      } catch {
        phase.value = 'failed';
        errorMsg.value = '응답을 처리하는 중 오류가 발생했어요.';
        return;
      }

      if (name === 'SUCCESS') {
        sseResult.value = data;
        phase.value = 'success';
      } else if (name === 'PENDING_TRADE') {
        sseResult.value = data;
        phase.value = 'pending_trade';
      } else {
        // FAILED | TIMEOUT — 피드 항목을 CANCELED로 낙관적 업데이트
        errorMsg.value = data.message || '매수에 실패했어요.';
        if (eventId) paymentStore.markFeedItemCanceled(Number(eventId));
        phase.value = 'failed';
      }
    },
    onerror(err) {
      if (sseAbort?.signal.aborted) return; // 의도적 종료 — 무시
      sseAbort?.abort();
      errorMsg.value = '연결 중 오류가 발생했어요. 다시 시도해 주세요.';
      phase.value = 'failed';
      throw err; // 자동 재연결 방지
    },
  }).catch(() => {}); // AbortError 조용히 처리
}

// ── Reject ──
const isRejecting = ref(false);
async function handleReject() {
  if (!eventId || isRejecting.value) return;
  isRejecting.value = true;
  try {
    await paymentStore.rejectPaymentEvent(eventId);
    router.replace('/payments');
  } catch {
    errorMsg.value = '취소 요청에 실패했어요. 다시 시도해 주세요.';
  } finally {
    isRejecting.value = false;
  }
}

const fmt = fmtKRW;
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col">
    <!-- ════ Phase: idle / approving ════ -->
    <template v-if="phase === 'idle' || phase === 'approving'">
      <AppHeader title="잔돈 투자 확인" :show-back="true" />

      <div class="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <h2
          class="text-2xl font-bold text-text-primary text-center leading-snug"
        >
          {{ merchant }}<br />잔돈 {{ fmt(spareChange) }}원으로<br />
          {{ stockName || '코인' }}에 투자할까요?
        </h2>

        <!-- 코인 로고 + AI 추천 배지 -->
        <div class="relative flex items-center justify-center">
          <div
            class="w-32 h-32 rounded-full bg-surface flex items-center justify-center"
          >
            <img
              v-if="ticker"
              :src="coinIconUrl(ticker)"
              :alt="stockName"
              class="w-24 h-24 object-contain"
              @error="coinIconFallback"
            />
          </div>
          <div class="absolute -top-1 -right-2 flex flex-col items-center">
            <span
              class="px-3 py-1 rounded-full text-xs font-semibold text-white"
              style="
                background: linear-gradient(135deg, #a78bfa, #60a5fa, #34d399);
              "
              >AI 추천</span
            >
            <svg width="10" height="6" viewBox="0 0 10 6" class="-mt-px">
              <polygon points="5,6 0,0 10,0" fill="url(#tail-grad)" />
              <defs>
                <linearGradient
                  id="tail-grad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stop-color="#a78bfa" />
                  <stop offset="100%" stop-color="#60a5fa" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <!-- 결제 정보 -->
        <div class="w-full flex flex-col divide-y divide-surface-border">
          <div class="flex items-center justify-between py-3.5">
            <span class="text-lg text-text-tertiary">결제</span>
            <span class="text-lg font-semibold text-text-primary"
              >{{ merchant }} {{ fmt(amount) }}원</span
            >
          </div>
          <div class="flex items-center justify-between py-3.5">
            <span class="text-lg text-text-tertiary">투자 금액</span>
            <span class="text-lg font-semibold text-brand"
              >{{ fmt(spareChange) }}원</span
            >
          </div>
        </div>

        <p v-if="errorMsg" role="alert" class="text-sm text-danger text-center">
          {{ errorMsg }}
        </p>
        <p v-if="!isActionable" class="text-sm text-danger text-center">
          잘못된 접근이에요. (주문 정보를 찾을 수 없습니다)
        </p>
      </div>

      <div class="px-6 pb-10 pt-4 flex flex-col gap-3">
        <button
          class="w-full py-4 rounded-2xl text-white text-lg font-bold transition-colors flex items-center justify-center gap-2"
          :class="
            phase === 'approving' || !isActionable
              ? 'bg-text-disabled'
              : 'bg-brand active:bg-brand-hover'
          "
          :disabled="phase === 'approving' || !isActionable"
          @click="handleApprove"
        >
          <span
            v-if="phase === 'approving'"
            class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
          />
          투자하기
        </button>
        <button
          class="w-full py-3 text-base text-text-tertiary font-medium disabled:opacity-40"
          :disabled="phase === 'approving' || isRejecting || !isActionable"
          @click="handleReject"
        >
          {{ isRejecting ? '취소 중...' : '투자 취소' }}
        </button>
      </div>
    </template>

    <!-- ════ Phase: waiting (SSE 대기) ════ -->
    <template v-else-if="phase === 'waiting'">
      <div class="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        <div
          class="w-20 h-20 border-4 border-surface-border border-t-brand rounded-full animate-spin"
        />
        <div class="flex flex-col items-center gap-2 text-center">
          <p class="text-xl font-bold text-text-primary">
            2차 인증을 완료해 주세요
          </p>
          <p class="text-base text-text-tertiary leading-relaxed">
            카카오톡, 네이버, 또는 하나원큐 앱에서<br />업비트 입금 인증 알림을
            확인해 주세요.
          </p>
          <p class="text-sm text-text-disabled mt-2">
            최대 3분 이내에 자동으로 처리됩니다.
          </p>
        </div>
      </div>
    </template>

    <!-- ════ Phase: success ════ -->
    <template v-else-if="phase === 'success'">
      <div class="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        <!-- 체크 아이콘 -->
        <div
          class="w-24 h-24 rounded-full bg-brand-bg flex items-center justify-center"
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0051ff"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div class="flex flex-col items-center gap-2 text-center">
          <p class="text-2xl font-bold text-text-primary">매수 완료!</p>
          <p class="text-base text-text-tertiary">{{ sseResult?.message }}</p>
        </div>

        <!-- 체결 상세 -->
        <div
          v-if="sseResult"
          class="w-full flex flex-col divide-y divide-surface-border"
        >
          <div
            v-if="sseResult.targetCoinName"
            class="flex items-center justify-between py-3.5"
          >
            <span class="text-base text-text-tertiary">코인</span>
            <span class="text-base font-semibold text-text-primary">{{
              sseResult.targetCoinName
            }}</span>
          </div>
          <div
            v-if="sseResult.investedVolume != null"
            class="flex items-center justify-between py-3.5"
          >
            <span class="text-base text-text-tertiary">매수 수량</span>
            <span class="text-base font-semibold text-text-primary">{{
              sseResult.investedVolume
            }}</span>
          </div>
          <div
            v-if="sseResult.investedPrice != null"
            class="flex items-center justify-between py-3.5"
          >
            <span class="text-base text-text-tertiary">체결 단가</span>
            <span class="text-base font-semibold text-text-primary"
              >₩{{ fmt(sseResult.investedPrice) }}</span
            >
          </div>
        </div>
      </div>

      <div class="px-6 pb-10 pt-4">
        <button
          class="w-full py-4 rounded-2xl bg-brand text-white text-lg font-bold active:bg-brand-hover"
          @click="router.replace('/payments')"
        >
          확인
        </button>
      </div>
    </template>

    <!-- ════ Phase: pending_trade (체결 지연) ════ -->
    <template v-else-if="phase === 'pending_trade'">
      <div class="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        <!-- 시계 아이콘 -->
        <div class="w-24 h-24 rounded-full bg-surface flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>

        <div class="flex flex-col items-center gap-2 text-center">
          <p class="text-2xl font-bold text-text-primary">주문 접수 완료</p>
          <p class="text-base text-text-tertiary leading-relaxed">
            {{ sseResult?.message }}
          </p>
        </div>

        <!-- 안내 박스 -->
        <div class="w-full bg-surface rounded-xl px-5 py-4 flex gap-3">
          <span class="text-base shrink-0">💡</span>
          <p class="text-sm text-text-tertiary leading-relaxed">
            체결이 완료되면 스마트폰 푸시 알림으로 안내해 드립니다. 지금 앱을 자유롭게 이용하셔도 됩니다.
          </p>
        </div>
      </div>

      <div class="px-6 pb-10 pt-4">
        <button
          class="w-full py-4 rounded-2xl bg-brand text-white text-lg font-bold active:bg-brand-hover"
          @click="router.replace('/payments')"
        >
          확인
        </button>
      </div>
    </template>

    <!-- ════ Phase: failed ════ -->
    <template v-else-if="phase === 'failed'">
      <div class="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        <div
          class="w-24 h-24 rounded-full bg-danger-bg flex items-center justify-center"
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ff3b30"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>

        <div class="flex flex-col items-center gap-2 text-center">
          <p class="text-2xl font-bold text-text-primary">매수 실패</p>
          <p class="text-base text-text-tertiary leading-relaxed">
            {{ errorMsg }}
          </p>
        </div>

        <!-- 케이스 B: 매수 주문 실패 — 원화가 이미 업비트에 있음을 고지 -->
        <div
          v-if="errorMsg.includes('매수 주문')"
          class="w-full bg-surface rounded-xl px-5 py-4 flex gap-3"
        >
          <span class="text-base shrink-0">ℹ️</span>
          <p class="text-sm text-text-tertiary leading-relaxed">
            케이뱅크 계좌에서 출금된 원화는 현재 업비트 계좌에 안전하게 보관되어 있습니다. 업비트 앱에서 직접 매수하시거나 원화를 출금해 주세요.
          </p>
        </div>
      </div>

      <div class="px-6 pb-10 pt-4">
        <button
          class="w-full py-4 rounded-2xl bg-surface text-text-primary text-lg font-semibold active:bg-surface-border"
          @click="router.replace('/payments')"
        >
          돌아가기
        </button>
      </div>
    </template>
  </div>
</template>
