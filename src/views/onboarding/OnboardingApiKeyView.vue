<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'

const router = useRouter()
const userStore = useUserStore()

const accountNumber = ref('')
const appKey = ref('')
const secretKey = ref('')
const isLoading = ref(false)

const isFormValid = computed(() =>
  accountNumber.value.trim() && appKey.value.trim() && secretKey.value.trim(),
)

async function handleConnect() {
  if (!isFormValid.value || isLoading.value) return
  isLoading.value = true
  // Simulate API verification delay
  await new Promise((r) => setTimeout(r, 900))
  if (userStore.profile) {
    userStore.profile.kis_account_number = accountNumber.value
  }
  userStore.completeOnboarding()
  router.push('/')
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
        <span class="text-sm font-semibold text-brand">증권사 연동</span>

        <!-- Title + description -->
        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            한국투자증권 계정을<br>연결해 주세요
          </h2>
          <p class="text-base text-text-tertiary leading-relaxed">
            모의 투자 계정을 연동합니다. 실제 계좌에는 영향이 없습니다.
          </p>
        </div>

        <!-- Info banner -->
        <div class="bg-brand-bg rounded-xl p-4 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <svg class="text-brand shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span class="text-base font-semibold text-brand">모의 투자 전용</span>
          </div>
          <p class="text-sm text-brand-300 leading-relaxed">
            한국투자증권 KIS Developers에서 모의 투자용 API 키를 발급받아 입력해 주세요.
          </p>

          <!-- Guide link -->
          <a
            href="#"
            class="inline-flex items-center gap-1 text-base font-semibold text-brand mt-1"
          >
            모의 투자 안내
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </div>

        <!-- Form fields -->
        <div class="flex flex-col gap-5">

          <!-- Account number -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary">계좌번호</label>
            <input
              v-model="accountNumber"
              type="text"
              placeholder="모의 투자 계좌번호를 입력하세요"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>

          <!-- App Key -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold text-text-secondary">App Key</label>
              <a href="#" class="text-xs2 font-medium text-brand">발급 방법 안내</a>
            </div>
            <input
              v-model="appKey"
              type="text"
              placeholder="App Key를 붙여넣으세요"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
            <p class="text-xs2 text-text-tertiary leading-relaxed">
              KIS Developers → 앱 목록 → 앱 상세 → App Key 복사
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
            />
            <p class="text-xs2 text-text-tertiary leading-relaxed">
              App Key와 동일한 페이지에서 확인할 수 있습니다
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Sticky bottom CTA -->
    <div class="sticky bottom-0 bg-surface px-6 pt-3 pb-8">
      <button
        class="w-full py-4 rounded-xl text-md font-semibold text-white transition-colors flex items-center justify-center gap-2"
        :class="isFormValid ? 'bg-brand active:bg-brand-hover' : 'bg-text-disabled'"
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
