<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAsyncAction } from '@/composables/useAsyncAction'

const settingsStore = useSettingsStore()

const cardLast4 = ref('')
const successMsg = ref('')
const isLoadingSettings = ref(true)
const loadError = ref('')

const { isLoading, errorMsg, run } = useAsyncAction('저장에 실패했습니다. 다시 시도해 주세요.')

onMounted(async () => {
  try {
    await settingsStore.fetchSettings()
  } catch {
    loadError.value = '현재 카드 정보를 불러오지 못했습니다.'
  } finally {
    isLoadingSettings.value = false
  }
})

const isValid = () => /^\d{4}$/.test(cardLast4.value)

function handleSave() {
  if (!isValid()) {
    errorMsg.value = '카드 번호 끝 4자리를 입력해 주세요.'
    return
  }
  successMsg.value = ''
  run(async () => {
    await settingsStore.updateKbank({ targetCardLast4: cardLast4.value })
    successMsg.value = '케이뱅크 카드가 업데이트되었습니다.'
    cardLast4.value = ''
  })
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <AppHeader title="케이뱅크 카드 관리" :show-back="true" />

    <div class="flex-1 overflow-y-auto px-6 pt-6 pb-36 flex flex-col gap-6">

      <div class="flex flex-col gap-2">
        <h2 class="text-2xl font-bold text-text-primary leading-snug">
          케이뱅크 카드를<br>변경해 주세요
        </h2>
        <p class="text-base text-text-tertiary leading-relaxed">
          잔돈이 출금될 케이뱅크 카드 번호 끝 4자리를 입력하세요.
        </p>
      </div>

      <!-- 현재 등록된 카드 -->
      <div v-if="isLoadingSettings" class="flex justify-center py-2">
        <span class="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
      <div v-else-if="settingsStore.linkedAccount?.targetCardLast4" class="bg-surface rounded-xl px-4 py-3.5 flex items-center justify-between">
        <span class="text-sm text-text-tertiary">현재 등록된 카드</span>
        <span class="text-base font-semibold text-text-primary tracking-widest">
          •••• {{ settingsStore.linkedAccount.targetCardLast4 }}
        </span>
      </div>
      <p v-else-if="loadError" class="text-sm text-danger text-center">{{ loadError }}</p>

      <!-- Info banner -->
      <div class="bg-brand-bg rounded-xl p-4 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <svg class="text-brand shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span class="text-base font-semibold text-brand">카드 번호 확인</span>
        </div>
        <p class="text-sm text-brand-300 leading-relaxed">
          케이뱅크 앱 → 카드 → 카드 정보에서 카드 번호를 확인할 수 있어요.
        </p>
      </div>

      <!-- Form -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-text-secondary">카드 번호 끝 4자리</label>
        <input
          v-model="cardLast4"
          type="text"
          inputmode="numeric"
          maxlength="4"
          placeholder="0000"
          class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all tracking-widest text-center text-lg font-semibold"
        >
        <p class="text-xs2 text-text-tertiary">숫자 4자리만 입력하세요</p>
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
