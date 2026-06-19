<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { useSettingsStore } from '@/stores/useSettingsStore'

const settingsStore = useSettingsStore()

const kisAccountNum = ref('')
const kisAppKey     = ref('')
const kisAppSecret  = ref('')

const isLoading = ref(false)
const errorMsg  = ref('')
const successMsg = ref('')

async function handleSave() {
  if (isLoading.value) return
  if (!kisAppKey.value.trim() || !kisAppSecret.value.trim() || !kisAccountNum.value.trim()) {
    errorMsg.value = '모든 항목을 입력해 주세요.'
    return
  }

  isLoading.value = true
  errorMsg.value  = ''
  successMsg.value = ''

  try {
    await settingsStore.updateLinkedAccount({
      kisAppKey:    kisAppKey.value.trim(),
      kisAppSecret: kisAppSecret.value.trim(),
      kisAccountNum: kisAccountNum.value.trim(),
    })
    successMsg.value = '증권사 계정 정보가 업데이트되었습니다.'
    kisAppSecret.value = ''
  } catch (err: unknown) {
    errorMsg.value = err instanceof Error ? err.message : '저장에 실패했습니다. 다시 시도해 주세요.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <AppHeader title="증권사 계정 관리" :show-back="true" />

    <div class="flex-1 overflow-y-auto px-6 pt-6 pb-36 flex flex-col gap-6">

      <div class="flex flex-col gap-2">
        <h2 class="text-2xl font-bold text-text-primary leading-snug">
          한국투자증권 계정을<br>변경해 주세요
        </h2>
        <p class="text-base text-text-tertiary leading-relaxed">
          모의 투자 API 키와 계좌번호를 새로 입력하면 즉시 업데이트됩니다.
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
          KIS Developers에서 발급한 모의 투자용 App Key와 Secret Key를 입력하세요.
        </p>
      </div>

      <!-- Form -->
      <div class="flex flex-col gap-5">

        <!-- Account number -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-text-secondary">계좌번호</label>
          <input
            v-model="kisAccountNum"
            type="text"
            placeholder="모의투자 종합계좌번호 예시: 50012345-01"
            class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
          >
        </div>

        <!-- App Key -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-text-secondary">App Key</label>
          <input
            v-model="kisAppKey"
            type="text"
            placeholder="App Key를 붙여넣으세요"
            class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
          >
          <p class="text-xs2 text-text-tertiary">KIS Developers → 앱 목록 → 앱 상세 → App Key 복사</p>
        </div>

        <!-- Secret Key -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-text-secondary">Secret Key</label>
          <input
            v-model="kisAppSecret"
            type="password"
            placeholder="Secret Key를 붙여넣으세요"
            class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
          >
        </div>
      </div>

      <!-- Success message -->
      <p v-if="successMsg" class="text-sm text-brand text-center font-medium">
        {{ successMsg }}
      </p>

      <!-- Error message -->
      <p v-if="errorMsg" role="alert" class="text-sm text-danger text-center">
        {{ errorMsg }}
      </p>
    </div>

    <!-- Sticky CTA -->
    <div class="fixed bottom-0 left-0 right-0 max-w-mobile mx-auto bg-surface px-6 pt-3 pb-8">
      <button
        class="w-full py-4 rounded-xl text-md font-semibold text-white flex items-center justify-center gap-2 transition-colors"
        :class="isLoading ? 'bg-text-disabled' : 'bg-brand active:bg-brand-hover'"
        :disabled="isLoading"
        @click="handleSave"
      >
        <span
          v-if="isLoading"
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        {{ isLoading ? '저장 중...' : '저장하기' }}
      </button>
    </div>
  </div>
</template>
