<script setup lang="ts">
/**
 * PaymentSimulatorView.vue
 *
 * Debug-only view that simulates an Android push-notification payment event.
 * Constructs the signed POST /api/payments request that the scraping service
 * would normally produce, allowing end-to-end testing without a real device.
 *
 * Route: /payments/simulator
 * Auth : requiresAuth (same guard as the rest of the app)
 */
import { ref, reactive } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { generatePaymentSignature } from '@/utils/paymentSigner'

// ── Form state ──
const form = reactive({
  userId:   1,
  merchant: '테스트 가맹점',
  amount:   10000,
  balance:  50000,
})

// ── Resiliency state ──
// transactionId is preserved across network failures so the same ID is
// reused on retry, preventing duplicate transactions on the backend.
const transactionId = ref<string>('')

// ── UI state ──
const isLoading  = ref(false)
const toast      = ref<{ message: string; type: 'success' | 'error' } | null>(null)
const lastSig    = ref<string>('')     // shown in dev for signature inspection
const lastPayload = ref<string>('')   // shown in dev for payload inspection

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
    // Step 1: Reuse existing transactionId on retry, generate new one otherwise
    if (!transactionId.value) {
      transactionId.value = crypto.randomUUID()
    }

    // Step 2: Unix timestamp in seconds
    const timestamp = Math.floor(Date.now() / 1000)

    // Step 3: Build the exact request body
    const body = {
      userId:        form.userId,
      merchant:      form.merchant,
      amount:        form.amount,
      balance:       form.balance,
      transactionId: transactionId.value,
    }

    // Step 4: Generate HMAC-SHA256 signature
    const signature = await generatePaymentSignature(body, timestamp)

    // Dev inspection: show the payload and signature that will be sent
    lastPayload.value = JSON.stringify(body, null, 2)
    lastSig.value     = signature
    if (import.meta.env.DEV) {
      console.log('[simulator] payload:', JSON.stringify(body))
      console.log('[simulator] timestamp:', timestamp)
      console.log('[simulator] X-Tikkle-Signature:', signature)
    }

    // Step 5: POST to /api/payments with signing headers
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'X-Tikkle-Timestamp': String(timestamp),
          'X-Tikkle-Signature': signature,
        },
        body: JSON.stringify(body),
      },
    )

    // Step 6: Handle response
    if (response.status === 201) {
      // SUCCESS: clear transactionId so next trigger generates a fresh one
      transactionId.value = ''
      showToast('결제 이벤트 전송 성공! (201)', 'success')
    } else {
      const errorText = await response.text().catch(() => '')
      showToast(`서버 오류 ${response.status}: ${errorText.slice(0, 80)}`, 'error')
      // Preserve transactionId so the user can retry with the same ID
    }
  } catch (err) {
    // Network error: preserve transactionId for retry
    const message = err instanceof Error ? err.message : String(err)
    console.error('[simulator] network error:', message)
    showToast(`네트워크 오류 — transactionId 보존됨 (재시도 가능)`, 'error')
    // transactionId.value is intentionally NOT cleared here
  } finally {
    isLoading.value = false
  }
}

// Reset the transactionId manually (useful after inspecting a failure)
function resetTransactionId() {
  transactionId.value = ''
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
        <label class="text-sm font-semibold text-text-secondary w-24 shrink-0">User ID</label>
        <input
          v-model.number="form.userId"
          type="number"
          class="flex-1 text-right text-base text-text-primary bg-transparent focus:outline-none"
        />
      </div>

      <!-- merchant -->
      <div class="px-5 py-4 flex items-center justify-between gap-4">
        <label class="text-sm font-semibold text-text-secondary w-24 shrink-0">가맹점</label>
        <input
          v-model="form.merchant"
          type="text"
          class="flex-1 text-right text-base text-text-primary bg-transparent focus:outline-none"
        />
      </div>

      <!-- amount -->
      <div class="px-5 py-4 flex items-center justify-between gap-4">
        <label class="text-sm font-semibold text-text-secondary w-24 shrink-0">결제 금액</label>
        <div class="flex items-center gap-1">
          <span class="text-sm text-text-tertiary">₩</span>
          <input
            v-model.number="form.amount"
            type="number"
            class="text-right text-base text-text-primary bg-transparent focus:outline-none w-28"
          />
        </div>
      </div>

      <!-- balance -->
      <div class="px-5 py-4 flex items-center justify-between gap-4">
        <label class="text-sm font-semibold text-text-secondary w-24 shrink-0">잔액</label>
        <div class="flex items-center gap-1">
          <span class="text-sm text-text-tertiary">₩</span>
          <input
            v-model.number="form.balance"
            type="number"
            class="text-right text-base text-text-primary bg-transparent focus:outline-none w-28"
          />
        </div>
      </div>
    </div>

    <!-- Transaction ID state -->
    <div class="mx-4 mt-3 bg-white rounded-xl px-5 py-4">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-text-secondary mb-1">Transaction ID</p>
          <p class="text-xs font-mono text-text-tertiary break-all leading-relaxed">
            {{ transactionId || '(자동 생성됨)' }}
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
