<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'
import { useOnboardingStore } from '@/stores/useOnboardingStore'

const router = useRouter()
const userStore = useUserStore()
const onboardingStore = useOnboardingStore()

// ── Form fields ──
const appKey          = ref('')
const secretKey       = ref('')
const cardCompany     = ref('')
const cardLast4       = ref('')

// ── UI state ──
const isLoading = ref(false)
const errorMsg  = ref('')

// cardLast4 must be exactly 4 numeric digits
const isCardLast4Valid = computed(
  () => /^\d{4}$/.test(cardLast4.value),
)

const isFormValid = computed(() =>
  appKey.value.trim() &&
  secretKey.value.trim() &&
  cardCompany.value.trim() &&
  isCardLast4Valid.value,
)

async function handleConnect() {
  if (!isFormValid.value || isLoading.value) return

  errorMsg.value  = ''
  isLoading.value = true

  try {
    // Save Upbit credentials + card info to the onboarding store so the store
    // action can assemble the complete OnboardingRequest payload.
    onboardingStore.setCredentials({
      kisAppKey:         appKey.value.trim(),
      kisAppSecret:      secretKey.value.trim(),
      kisAccountNum:     '',
      targetCardCompany: cardCompany.value.trim(),
      targetCardLast4:   cardLast4.value,
    })

    // POST /api/onboarding — throws a localized Error on business error codes
    await onboardingStore.submitOnboarding()

    // On SUCCESS (201): mark onboarding complete locally and navigate to home
    userStore.completeOnboarding()
    router.replace('/')
  } catch (err: unknown) {
    errorMsg.value = err instanceof Error
      ? err.message
      : '연결 중 오류가 발생했습니다. 다시 시도해 주세요.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">

    <!-- Status bar placeholder -->
    <div class="bg-white h-12 shrink-0" />

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto flex flex-col">

      <!-- Progress header -->
      <div class="bg-white px-6 pt-1 pb-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-text-tertiary font-normal">3 / 5 단계</span>
          <span class="text-sm font-semibold text-brand">60%</span>
        </div>
        <div class="h-1.5 bg-surface-border rounded-pill overflow-hidden">
          <div class="h-full bg-brand rounded-pill" style="width: 60%" />
        </div>
      </div>

      <div class="px-6 pt-6 pb-28 flex flex-col gap-6">

        <!-- Section label -->
        <span class="text-sm font-semibold text-brand">거래소 연동</span>

        <!-- Title + description -->
        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            업비트 계정을<br>연결해 주세요
          </h2>
          <p class="text-base text-text-tertiary leading-relaxed">
            업비트 Open API 키를 연동합니다. 키 발급 시 출금 권한은 켜지 않아도 됩니다.
          </p>
        </div>

        <!-- Info banner -->
        <div class="bg-brand-bg rounded-xl p-4 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <svg class="text-brand shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span class="text-base font-semibold text-brand">Open API 키 연동</span>
          </div>
          <p class="text-sm text-brand-300 leading-relaxed">
            업비트 [마이페이지 → Open API 관리]에서 API 키를 발급받아 입력해 주세요.
          </p>
          <a href="#" class="inline-flex items-center gap-1 text-base font-semibold text-brand mt-1">
            Open API 발급 안내
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </div>

        <!-- Form fields -->
        <div class="flex flex-col gap-5">

          <!-- Access Key -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold text-text-secondary">Access Key</label>
              <a href="#" class="text-xs2 font-medium text-brand">발급 방법 안내</a>
            </div>
            <input
              v-model="appKey"
              type="text"
              placeholder="Access Key를 붙여넣으세요"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            >
            <p class="text-xs2 text-text-tertiary leading-relaxed">
              업비트 → 마이페이지 → Open API 관리 → Access Key 복사
            </p>
          </div>

          <!-- Secret Key -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold text-text-secondary">Secret Key</label>
              <a href="#" class="text-xs2 font-medium text-brand">발급 방법 안내</a>
            </div>
            <input
              v-model="secretKey"
              type="password"
              placeholder="Secret Key를 붙여넣으세요"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            >
            <p class="text-xs2 text-text-tertiary leading-relaxed">
              Access Key 발급 시 함께 표시되며, 이때만 확인할 수 있습니다
            </p>
          </div>

          <!-- Card company -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary">카드사</label>
            <input
              v-model="cardCompany"
              type="text"
              placeholder="예: 신한카드"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            >
          </div>

          <!-- Card last 4 digits -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary">카드 번호 끝 4자리</label>
            <input
              v-model="cardLast4"
              type="text"
              inputmode="numeric"
              maxlength="4"
              placeholder="0000"
              class="w-full px-4 py-3.5 rounded-xl bg-white border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 transition-all"
              :class="cardLast4 && !isCardLast4Valid
                ? 'border-danger focus:border-danger focus:ring-danger/20'
                : 'border-surface-border focus:border-brand focus:ring-brand/20'"
            >
            <p
              v-if="cardLast4 && !isCardLast4Valid"
              class="text-xs2 text-danger"
            >
              숫자 4자리를 정확히 입력해 주세요.
            </p>
            <p v-else class="text-xs2 text-text-tertiary leading-relaxed">
              잔돈 적립 대상 카드의 끝 4자리 숫자를 입력하세요
            </p>
          </div>
        </div>

        <!-- Business / network error message -->
        <p
          v-if="errorMsg"
          role="alert"
          class="text-sm text-danger text-center px-2 -mt-2"
        >
          {{ errorMsg }}
        </p>
      </div>
    </div>

    <!-- Sticky bottom CTA -->
    <div class="sticky bottom-0 bg-surface px-6 pt-3 pb-8">
      <button
        class="w-full py-4 rounded-xl text-md font-semibold text-white transition-colors flex items-center justify-center gap-2"
        :class="isFormValid && !isLoading ? 'bg-brand active:bg-brand-hover' : 'bg-text-disabled'"
        :disabled="!isFormValid || isLoading"
        @click="handleConnect"
      >
        <span
          v-if="isLoading"
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        {{ isLoading ? '인증 중...' : '인증 및 연결하기' }}
      </button>
    </div>
  </div>
</template>
