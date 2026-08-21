<script setup lang="ts">
/**
 * PaymentReviewView.vue
 *
 * Reached by tapping a local notification for a PENDING_PURCHASE payment. The
 * native listener opens a deep link (tikkle://payments/review?...) carrying the
 * proposal details; the user approves or rejects the spare-change investment here.
 *
 * Route  : /payments/review?eventId&merchant&amount&spareChange&ticker&stockName
 * Flow   :
 *   1. POST /api/payments/{eventId}/approve
 *   2. 200 OK → open SSE GET /api/payments/{eventId}/stream
 *   3. Await SUCCESS | PENDING_TRADE | DEPOSIT_FAILED | TRADE_FAILED |
 *      UPBIT_INVALID_KEY | TIMEOUT | FAILED event, then close SSE
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useRoute, useRouter } from 'vue-router';
import { usePaymentStore } from '@/stores/usePaymentStore';
import AppHeader from '@/components/common/AppHeader.vue';
import { fmtKRW, fmtVolume } from '@/utils/format';
import { useBackHandler } from '@/composables/useAndroidBack';
import { coinIconUrl, coinIconFallback } from '@/utils/coin';
import type { SseTradeResult } from '@/types';
import type { AxiosError } from 'axios';

const route = useRoute();
const router = useRouter();
const paymentStore = usePaymentStore();

// 딥링크로 진입 시 히스토리가 없으므로 뒤로가기는 결제내역 탭으로 이동
useBackHandler(() => { router.replace('/payments'); return true });

// ── Deep-link params ──
const eventId = route.query.eventId as string | undefined;
const merchant = (route.query.merchant as string) || '결제처';
const amount = Number(route.query.amount ?? 0);
const spareChange = Number(route.query.spareChange ?? 0);
const stockName = (route.query.stockName as string) || '';
const ticker = (route.query.ticker as string) || '';

const isActionable = computed(() => !!eventId);

// ── Phase state machine ──
// idle → approving → waiting → success | pending_trade | deposit_failed | trade_failed
//   | timeout | upbit_invalid_key | upbit_setup_required | failed
type Phase = 'idle' | 'approving' | 'waiting' | 'success' | 'pending_trade' | 'deposit_failed' | 'trade_failed' | 'timeout' | 'upbit_invalid_key' | 'upbit_setup_required' | 'failed';
const phase = ref<Phase>('idle');
const errorMsg = ref('');
const setupMsg = ref('');  // upbit_setup_required 단계에서 보여줄 안내(연동/2차인증)
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
  } catch (err) {
    const code = (err as AxiosError<{ code?: string }>).response?.data?.code;
    // 승인이 실패해도 결제 건은 PENDING_PURCHASE로 유지되어 재시도 가능하다.
    if (code === 'UPBIT-010') {
      // 업비트 키 만료/권한 부족 → 재연동 안내
      phase.value = 'upbit_invalid_key';
    } else if (code === 'USER-003') {
      // 업비트 미연동 → 연동 화면으로 유도
      setupMsg.value = '투자를 진행하려면 업비트 계정 연동이 필요해요.';
      phase.value = 'upbit_setup_required';
    } else if (code === 'USER-004') {
      // 2차 인증 수단 미설정 → 설정 화면으로 유도
      setupMsg.value = '투자를 진행하려면 업비트 2차 인증 수단 설정이 필요해요.';
      phase.value = 'upbit_setup_required';
    } else if (code === 'PAYMENT-006') {
      // 승인 대기 상태가 아니라 거절된 경우 — 이미 진행 중이거나 이미 끝난 건이다.
      // (진행 중 재승인은 2차 인증이 두 번 나가 원화가 이중 입금되므로 서버가 막는다.)
      // 스트림을 잡으면 서버가 현재 상태 스냅샷을 보내주므로 어느 쪽이든 알아서 맞는
      // 화면으로 간다.
      openStream();
    } else {
      // PAYMENT-007 / UPBIT-008 / 기타 → 재시도 가능 (idle 복귀)
      phase.value = 'idle';
      errorMsg.value = '투자 요청에 실패했어요. 잠시 후 다시 시도해 주세요.';
    }
    return;
  }

  // Step 2: 진행 중 표시 후 스트림 구독
  openStream();
}

// 승인 없이 스트림만 다시 연다 (앱 복귀 후 재구독 경로에서도 사용).
function openStream() {
  if (!eventId) return;
  phase.value = 'waiting';
  sseAbort = new AbortController();
  // 4xx 는 재시도해도 소용없다(PAYMENT-004 등) — 그때만 실패로 끝낸다.
  let fatal = false;
  const token = localStorage.getItem('tikkle_access_token') ?? '';
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string) ?? '';

  fetchEventSource(`${baseUrl}/api/payments/${eventId}/stream`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: sseAbort.signal,
    onmessage(ev) {
      const name = ev.event;
      // 문자열 하트비트(CONNECTED·PROCESSING) → 계속 대기
      if (name === 'CONNECTED' || name === 'PROCESSING') return;

      // 터미널 이벤트: 연결 즉시 종료 (웹뷰 자동 재연결 방지)
      sseAbort?.abort();

      // TIMEOUT은 문자열 payload. 결제 건이 PENDING_PURCHASE로 복구되어 재승인 가능하다.
      if (name === 'TIMEOUT') {
        phase.value = 'timeout';
        return;
      }

      // 이하 객체 payload 이벤트. 서버 message는 개발자용 서술이므로 화면에 쓰지 않고,
      // 이벤트명으로만 분기해 FE가 작성한 고정 문구를 보여준다.
      let data: SseTradeResult;
      try {
        data = JSON.parse(ev.data) as SseTradeResult;
      } catch {
        phase.value = 'failed';
        return;
      }

      if (name === 'SUCCESS') {
        sseResult.value = data;
        phase.value = 'success';
      } else if (name === 'PENDING_TRADE') {
        sseResult.value = data;
        phase.value = 'pending_trade';
      } else if (name === 'DEPOSIT_FAILED') {
        if (eventId) paymentStore.markFeedItemCanceled(Number(eventId));
        phase.value = 'deposit_failed';
      } else if (name === 'TRADE_FAILED') {
        if (eventId) paymentStore.markFeedItemCanceled(Number(eventId));
        phase.value = 'trade_failed';
      } else if (name === 'UPBIT_INVALID_KEY') {
        // 서버는 이 건을 FAILED 로 확정한다 — 피드도 같이 맞춰 둔다.
        if (eventId) paymentStore.markFeedItemCanceled(Number(eventId));
        phase.value = 'upbit_invalid_key';
      } else if (name === 'CLOSED') {
        // 이미 거절·만료(NOT_INVESTED)된 건에 재구독한 경우. 실패가 아니므로
        // 화면을 붙잡지 않고 조용히 결제 내역으로 보낸다.
        if (eventId) paymentStore.markFeedItemCanceled(Number(eventId));
        router.replace('/payments');
      } else {
        // FAILED 및 알 수 없는 이벤트
        if (eventId) paymentStore.markFeedItemCanceled(Number(eventId));
        phase.value = 'failed';
      }
    },
    onopen(res) {
      if (res.ok) return Promise.resolve();
      fatal = res.status >= 400 && res.status < 500;
      throw new Error(`stream ${res.status}`);
    },
    onerror(err) {
      if (sseAbort?.signal.aborted) return; // 의도적 종료 — 무시
      if (fatal) {
        sseAbort?.abort();
        phase.value = 'failed';
        throw err; // 자동 재연결 중단
      }
      // 2차 인증 중 앱 전환·네트워크 변경으로 끊기는 것은 정상 경로다.
      // 실패 화면을 띄우지 않고 라이브러리의 자동 재연결에 맡긴다 —
      // 재구독하면 서버가 현재 상태 스냅샷을 1회 다시 보내준다.
    },
  }).catch(() => {}); // AbortError 조용히 처리
}

// 이미 승인돼 진행 중인 건이면 승인 재요청 없이 스트림만 다시 잡는다.
// 진행 여부는 서버(GET /api/payments/in-progress)가 판단한다 — 재설치·기기 교체에도
// 정확하고, PENDING_DEPOSIT 에서 재승인하면 400 PAYMENT-006 이라 물어보고 가야 한다.
// 확인이 끝날 때까지 '투자하기' 를 눌리지 않게 막는다.
const resumeChecked = ref(false);

onMounted(async () => {
  if (!eventId) return (resumeChecked.value = true);
  const inProgress = await paymentStore.fetchInProgress();
  const found = inProgress.some((p) => String(p.eventId) === eventId);
  resumeChecked.value = true;
  // 구독 직후 서버가 현재 상태 스냅샷을 1회 보내주므로 phase 는 그걸로 확정된다.
  if (found) openStream();
});

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

// 체결 완료 화면의 코인명 — SSE 응답 우선, 없으면 딥링크 파라미터로 폴백
const successCoinName = computed(
  () => sseResult.value?.targetCoinName || stockName || '코인',
);

// ── 결과 화면 6종 ──
// 아이콘·문구·버튼만 다르고 레이아웃이 같아 데이터로만 분기한다.
type OutcomePhase = 'deposit_failed' | 'trade_failed' | 'timeout'
  | 'upbit_setup_required' | 'upbit_invalid_key' | 'failed';

interface Outcome {
  icon:     'x' | 'clock' | 'info';
  title:    string;
  body:     string[];              // 줄바꿈 단위
  note?:    string;                // 회색 고지 박스 (원화 잔류 안내 등)
  primary?: { label: string; run: () => void };
  back:     string;                // 하단 이탈 버튼 문구
}

const OUTCOMES: Record<OutcomePhase, Outcome> = {
  deposit_failed: {
    icon: 'x',
    title: '입금 실패',
    body: ['업비트 원화 입금이 거절되거나 취소되었어요.', '출금된 원화는 없습니다.'],
    back: '돌아가기',
  },
  trade_failed: {
    icon: 'x',
    title: '매수 실패',
    body: ['매수 주문이 체결되지 못했어요.'],
    note: '케이뱅크 계좌에서 출금된 원화는 현재 업비트 계좌에 안전하게 보관되어 있습니다. 업비트 앱에서 직접 매수하시거나 원화를 출금해 주세요.',
    back: '돌아가기',
  },
  timeout: {
    icon: 'clock',
    title: '인증 시간 초과',
    body: ['2차 인증 시간이 초과되었어요.', '결제 건이 유지되어 다시 승인할 수 있어요.'],
    primary: { label: '다시 승인하기', run: () => { phase.value = 'idle'; } },
    back: '나중에 하기',
  },
  upbit_setup_required: {
    icon: 'info',
    title: '업비트 설정 필요',
    body: [],  // setupMsg 로 대체 — 연동/2차인증 중 무엇이 빠졌는지에 따라 달라진다
    primary: { label: '업비트 설정하기', run: () => router.replace('/settings/api-key') },
    back: '나중에 하기',
  },
  upbit_invalid_key: {
    icon: 'x',
    title: '업비트 인증 만료',
    body: ['업비트 인증이 만료되었습니다.', '다시 연동해 주세요.'],
    primary: { label: '업비트 재연동', run: () => router.replace('/settings/api-key') },
    back: '나중에 하기',
  },
  failed: {
    icon: 'x',
    title: '매수 실패',
    body: ['알 수 없는 오류로 매수에 실패했어요.', '잠시 후 다시 시도해 주세요.'],
    back: '돌아가기',
  },
};

const outcome = computed<Outcome | null>(
  () => OUTCOMES[phase.value as OutcomePhase] ?? null,
);
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col">
    <!-- ════ Phase: idle / approving ════ -->
    <template v-if="phase === 'idle' || phase === 'approving'">
      <AppHeader title="잔돈 투자 확인" :show-back="true" />

      <div class="flex-1 flex flex-col px-5 pt-5 gap-4">
        <!-- AI 추천 배지 -->
        <div>
          <span
            class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
            style="background: linear-gradient(135deg, #a78bfa, #60a5fa, #34d399);"
          >
            ✦ AI 추천
          </span>
        </div>

        <!-- 코인 가로 행 카드 -->
        <div class="bg-surface rounded-2xl px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
              <img
                v-if="ticker"
                :src="coinIconUrl(ticker)"
                :alt="stockName"
                class="w-10 h-10 object-contain"
                @error="coinIconFallback"
              />
            </div>
            <div>
              <p class="text-lg font-semibold text-text-primary">{{ stockName || '코인' }}</p>
              <p class="text-sm text-text-tertiary mt-0.5">{{ ticker }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-xl font-bold text-brand">{{ fmt(spareChange) }}원</p>
            <p class="text-xs text-text-tertiary mt-0.5">투자 금액</p>
          </div>
        </div>

        <!-- 결제 상세 카드 -->
        <div class="bg-surface rounded-2xl overflow-hidden divide-y divide-surface-border">
          <div class="flex items-center justify-between px-4 py-3.5">
            <span class="text-base text-text-tertiary">결제처</span>
            <span class="text-base font-semibold text-text-primary">{{ merchant }}</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3.5">
            <span class="text-base text-text-tertiary">결제 금액</span>
            <span class="text-base font-semibold text-text-primary">{{ fmt(amount) }}원</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3.5">
            <span class="text-base text-text-tertiary">투자 금액</span>
            <span class="text-base font-semibold text-brand">{{ fmt(spareChange) }}원</span>
          </div>
        </div>

        <p v-if="errorMsg" role="alert" class="text-sm text-danger text-center">
          {{ errorMsg }}
        </p>
        <p v-if="!isActionable" class="text-sm text-danger text-center">
          잘못된 접근이에요. (주문 정보를 찾을 수 없습니다)
        </p>
      </div>

      <div class="px-5 pb-10 pt-4 flex flex-col gap-3">
        <button
          class="w-full py-4 rounded-2xl text-white text-lg font-bold transition-colors flex items-center justify-center gap-2"
          :class="
            phase === 'approving' || !isActionable || !resumeChecked
              ? 'bg-text-disabled'
              : 'bg-brand active:bg-brand-hover'
          "
          :disabled="phase === 'approving' || !isActionable || !resumeChecked"
          @click="handleApprove"
        >
          <span
            v-if="phase === 'approving' || !resumeChecked"
            class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
          />
          투자하기
        </button>
        <button
          class="w-full py-3 text-base text-text-tertiary font-medium disabled:opacity-40"
          :disabled="phase === 'approving' || isRejecting || !isActionable || !resumeChecked"
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
            카카오톡, 네이버, 또는 하나인증서 앱에서<br />업비트 입금 인증 알림을
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
      <div class="flex-1 flex flex-col items-center justify-center px-5 gap-7">
        <!-- 히어로: 매수한 코인 로고 + 체결 배지 -->
        <div class="relative shrink-0">
          <div
            class="w-20 h-20 rounded-full bg-surface flex items-center justify-center overflow-hidden"
          >
            <img
              v-if="ticker"
              :src="coinIconUrl(ticker)"
              :alt="successCoinName"
              class="w-12 h-12 object-contain"
              @error="coinIconFallback"
            />
            <svg
              v-else
              width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="#0051ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <!-- 체크 배지 -->
          <span
            v-if="ticker"
            class="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-brand border-4 border-white flex items-center justify-center"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </div>

        <div class="flex flex-col items-center gap-1.5 text-center">
          <p class="text-2xl font-bold text-text-primary">
            {{ fmt(spareChange) }}원 투자 완료
          </p>
          <p class="text-base text-text-tertiary">
            {{ successCoinName }} 매수를 완료했어요.
          </p>
        </div>

        <!-- 체결 상세 -->
        <div
          v-if="sseResult"
          class="w-full bg-surface rounded-2xl overflow-hidden divide-y divide-surface-border"
        >
          <div class="flex items-center justify-between px-4 py-3.5">
            <span class="text-base text-text-tertiary">결제처</span>
            <span class="text-base font-semibold text-text-primary">{{ merchant }}</span>
          </div>
          <div
            v-if="sseResult.investedPrice != null"
            class="flex items-center justify-between px-4 py-3.5"
          >
            <span class="text-base text-text-tertiary">체결 단가</span>
            <span class="text-base font-semibold text-text-primary">
              {{ fmt(sseResult.investedPrice) }}원
            </span>
          </div>
          <div
            v-if="sseResult.investedVolume != null"
            class="flex items-center justify-between px-4 py-3.5"
          >
            <span class="text-base text-text-tertiary">매수 수량</span>
            <span class="text-base font-semibold text-text-primary">
              {{ fmtVolume(sseResult.investedVolume) }}개
            </span>
          </div>
        </div>
      </div>

      <div class="px-5 pb-10 pt-4">
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

    <!-- ════ Phase: 결과 화면 6종 (OUTCOMES 로 분기) ════ -->
    <template v-else-if="outcome">
      <div class="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        <!-- 아이콘 -->
        <div
          class="w-24 h-24 rounded-full flex items-center justify-center"
          :class="{
            'bg-danger-bg': outcome.icon === 'x',
            'bg-surface':   outcome.icon === 'clock',
            'bg-brand-bg':  outcome.icon === 'info',
          }"
        >
          <svg
            v-if="outcome.icon === 'x'"
            width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="#ff3b30" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <svg
            v-else-if="outcome.icon === 'clock'"
            width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="#8e8e93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <svg
            v-else
            width="44" height="44" viewBox="0 0 24 24" fill="none"
            stroke="#0051ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div class="flex flex-col items-center gap-2 text-center">
          <p class="text-2xl font-bold text-text-primary">{{ outcome.title }}</p>
          <p class="text-base text-text-tertiary leading-relaxed">
            <!-- upbit_setup_required 는 무엇이 빠졌는지에 따라 문구가 달라진다 -->
            <template v-if="phase === 'upbit_setup_required'">{{ setupMsg }}</template>
            <template v-else v-for="(line, i) in outcome.body" :key="i">
              <br v-if="i">{{ line }}
            </template>
          </p>
        </div>

        <!-- 고지 박스 (원화 잔류 안내 등) -->
        <div v-if="outcome.note" class="w-full bg-surface rounded-xl px-5 py-4 flex gap-3">
          <span class="text-base shrink-0">ℹ️</span>
          <p class="text-sm text-text-tertiary leading-relaxed">{{ outcome.note }}</p>
        </div>
      </div>

      <div class="px-6 pb-10 pt-4 flex flex-col gap-3">
        <button
          v-if="outcome.primary"
          class="w-full py-4 rounded-2xl bg-brand text-white text-lg font-bold active:bg-brand-hover"
          @click="outcome.primary.run()"
        >
          {{ outcome.primary.label }}
        </button>
        <button
          class="w-full py-3 text-base font-medium"
          :class="outcome.primary
            ? 'text-text-tertiary'
            : 'py-4 rounded-2xl bg-surface text-text-primary text-lg font-semibold active:bg-surface-border'"
          @click="router.replace('/payments')"
        >
          {{ outcome.back }}
        </button>
      </div>
    </template>
  </div>
</template>
