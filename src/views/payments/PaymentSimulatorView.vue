<script setup lang="ts">
/**
 * PaymentSimulatorView.vue
 *
 * Debug-only view that simulates an Android push-notification payment event.
 * Builds a spec-compliant PaymentRequest, signs it via paymentCrypto, and
 * dispatches it to POST /api/payments for end-to-end testing without a real device.
 *
 * Route: /payments/simulator
 * Auth : requiresAuth (JWT guard), but the API call itself is HMAC-only (no JWT).
 */
import { ref, reactive } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import {
  generateTransactionId,
  generateTikkleSignature,
  submitScrapedPayment,
} from '@/utils/paymentCrypto'
import type { PaymentRequest } from '@/types'

// ── Form state — mirrors the PaymentRequest interface ──
const form = reactive({
  userId:          1,
  cardCompany:     '국민카드',
  cardNumberLast4: '1234',
  merchant:        '테스트 가맹점',
  amount:          10000,
})

// ── Resiliency: preserve transactionId across network failures ──
// pushReceivedTimeMillis is captured once per new payment event and reused on
// retry so generateTransactionId always produces the same deterministic hash.
const pushReceivedTimeMillis = ref<number>(0)
const transactionId = ref<string>('')

// ── UI state ──
const isLoading   = ref(false)
const toast       = ref<{ message: string; type: 'success' | 'error' } | null>(null)
const lastSig     = ref('')
const lastPayload = ref('')

let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: 'success' | 'error') {
  toast.value = { message, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3500)
}

// ── Trigger simulated payment ──
async function triggerPayment() {
  if (isLoading.value) return
  isLoading.value = true

  try {
    // Step 1: Capture push-received time once per new event; reuse on retry
    // so the deterministic transactionId stays identical across retries.
    if (!transactionId.value) {
      pushReceivedTimeMillis.value = Date.now()
      transactionId.value = await generateTransactionId(
        form.merchant,
        form.amount,
        form.cardCompany,
        pushReceivedTimeMillis.value,
      )
    }

    // Step 2: Assemble the exact PaymentRequest payload (no extra fields)
    const payload: PaymentRequest = {
      userId:          form.userId,
      cardCompany:     form.cardCompany,
      cardNumberLast4: form.cardNumberLast4,
      merchant:        form.merchant,
      amount:          form.amount,
      transactionId:   transactionId.value,
    }

    // Step 3: Pre-generate signature for the dev inspector panel.
    // submitScrapedPayment will independently sign with its own timestamp,
    // so a small delta between these two is expected in dev — the signed
    // request that reaches the server is always self-consistent.
    const devTimestamp = Math.floor(Date.now() / 1000)
    const devSignature = await generateTikkleSignature(payload, devTimestamp)

    lastPayload.value = JSON.stringify(payload, null, 2)
    lastSig.value     = devSignature

    if (import.meta.env.DEV) {
      console.log('[simulator] payload:', JSON.stringify(payload))
      console.log('[simulator] dev-timestamp:', devTimestamp)
      console.log('[simulator] dev-signature:', devSignature)
    }

    // Step 4: Dispatch — HMAC signed, no JWT, handles 200 / 400 / 401 internally
    await submitScrapedPayment(payload)

    // SUCCESS: clear state so next trigger starts a fresh payment event
    transactionId.value       = ''
    pushReceivedTimeMillis.value = 0
    showToast('결제 이벤트 전송 성공! (200 SUCCESS)', 'success')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (import.meta.env.DEV) console.error('[simulator] error:', message)
    showToast(message, 'error')
    // transactionId is preserved for retry — intentional
  } finally {
    isLoading.value = false
  }
}

function resetTransactionId() {
  transactionId.value          = ''
  pushReceivedTimeMillis.value = 0
}
</script>

<template>
  <div class="min-h-screen bg-surface pb-10">
    <AppHeader title="결제 시뮬레이터" :show-back="true" />

    <!-- Dev-only banner -->
    <div class="mx-4 mt-3 bg-warning-bg border border-warning rounded-xl px-4 py-2.5 flex items-center gap-2">
      <span class="text-base">🛠</span>
      <p class="text-sm text-warning font-medium">개발 전용 — Android 결제 알림 스크래핑 시뮬레이션</p>
    </div>

    <!-- Form -->
    <div class="mx-4 mt-4 bg-white rounded-xl overflow-hidden divide-y divide-surface-border">

      <!-- userId -->
      <div class="px-5 py-4 flex items-center justify-between gap-4">
        <label class="text-sm font-semibold text-text-secondary w-28 shrink-0">User ID</label>
        <input
          v-model.number="form.userId"
          type="number"
          class="flex-1 text-right text-base text-text-primary bg-transparent focus:outline-none"
        >
      </div>

      <!-- cardCompany -->
      <div class="px-5 py-4 flex items-center justify-between gap-4">
        <label class="text-sm font-semibold text-text-secondary w-28 shrink-0">카드사</label>
        <select
          v-model="form.cardCompany"
          class="flex-1 text-right text-base text-text-primary bg-transparent focus:outline-none appearance-none"
        >
          <option value="국민카드">국민카드</option>
          <option value="우리카드">우리카드</option>
          <option value="하나카드">하나카드</option>
        </select>
      </div>

      <!-- cardNumberLast4 -->
      <div class="px-5 py-4 flex items-center justify-between gap-4">
        <label class="text-sm font-semibold text-text-secondary w-28 shrink-0">카드 끝 4자리</label>
        <input
          v-model="form.cardNumberLast4"
          type="text"
          maxlength="4"
          inputmode="numeric"
          class="flex-1 text-right text-base text-text-primary bg-transparent focus:outline-none"
        >
      </div>

      <!-- merchant -->
      <div class="px-5 py-4 flex items-center justify-between gap-4">
        <label class="text-sm font-semibold text-text-secondary w-28 shrink-0">가맹점</label>
        <input
          v-model="form.merchant"
          type="text"
          class="flex-1 text-right text-base text-text-primary bg-transparent focus:outline-none"
        >
      </div>

      <!-- amount -->
      <div class="px-5 py-4 flex items-center justify-between gap-4">
        <label class="text-sm font-semibold text-text-secondary w-28 shrink-0">결제 금액</label>
        <div class="flex items-center gap-1">
          <span class="text-sm text-text-tertiary">₩</span>
          <input
            v-model.number="form.amount"
            type="number"
            class="text-right text-base text-text-primary bg-transparent focus:outline-none w-28"
          >
        </div>
      </div>
    </div>

    <!-- Transaction ID state -->
    <div class="mx-4 mt-3 bg-white rounded-xl px-5 py-4">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-text-secondary mb-1">Transaction ID</p>
          <p class="text-xs font-mono text-text-tertiary break-all leading-relaxed">
            {{ transactionId || '(자동 생성됨 — SHA-256)' }}
          </p>
        </div>
        <button
          v-if="transactionId"
          class="shrink-0 text-xs font-medium text-danger bg-danger-bg px-2.5 py-1.5 rounded-lg active:opacity-70"
          @click="resetTransactionId"
        >
          초기화
        </button>
      </div>
      <p class="text-xs text-text-disabled mt-2">
        네트워크 오류 시 동일 ID가 보존되어 재시도됩니다.
      </p>
    </div>

    <!-- Dev: signature inspector -->
    <div v-if="lastSig" class="mx-4 mt-3 bg-surface-alt rounded-xl px-4 py-3">
      <p class="text-xs font-semibold text-text-tertiary mb-1.5">마지막 서명 (X-Tikkle-Signature)</p>
      <p class="text-xs font-mono text-text-secondary break-all leading-relaxed">{{ lastSig }}</p>

      <p class="text-xs font-semibold text-text-tertiary mt-3 mb-1.5">페이로드</p>
      <pre class="text-xs font-mono text-text-secondary whitespace-pre-wrap break-all">{{ lastPayload }}</pre>
    </div>

    <!-- Trigger button -->
    <div class="mx-4 mt-5">
      <button
        class="w-full py-4 rounded-xl text-white text-md font-semibold flex items-center justify-center gap-2 transition-colors"
        :class="isLoading ? 'bg-text-disabled' : 'bg-brand active:bg-brand-hover'"
        :disabled="isLoading"
        @click="triggerPayment"
      >
        <span
          v-if="isLoading"
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        {{ isLoading ? '전송 중...' : '결제 이벤트 전송' }}
      </button>
    </div>

    <!-- Toast notification -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        leave-active-class="transition-all duration-150 ease-in"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="toast"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[390px] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white z-50"
          :class="toast.type === 'success' ? 'bg-brand' : 'bg-danger'"
        >
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
