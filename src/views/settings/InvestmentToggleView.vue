<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAsyncAction } from '@/composables/useAsyncAction'

const settingsStore = useSettingsStore()

// 로컬 토글 상태 — 페이지 진입 시 스토어 값으로 초기화
const enabled = ref(true)
const isLoading = ref(false)

onMounted(async () => {
  isLoading.value = true
  try {
    await settingsStore.fetchSettings()
    enabled.value = settingsStore.isInvestmentEnabled
  } finally {
    isLoading.value = false
  }
})

// 서비스 중단(Off) 시 안내 팝업
const showOffConfirm = ref(false)

function handleToggle() {
  if (isSaving.value) return
  if (enabled.value) {
    // On → Off: 중단 경고 팝업 표시
    showOffConfirm.value = true
  } else {
    // Off → On: 바로 저장
    save(true)
  }
}

const { isLoading: isSaving, run: runSave } = useAsyncAction()

function save(value: boolean) {
  runSave(async () => {
    await settingsStore.updateInvestmentEnabled(value)
    enabled.value = value
  })
}

function confirmOff() {
  showOffConfirm.value = false
  save(false)
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <AppHeader title="자동 투자 설정" :show-back="true" />

    <div class="px-4 pt-4 flex flex-col gap-3">

      <!-- 토글 카드 -->
      <div class="bg-white rounded-xl px-5 py-5">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <span class="text-base font-semibold text-text-primary">자동 투자 서비스</span>
            <span class="text-sm text-text-tertiary">잔돈 자동 코인 투자 기능</span>
          </div>

          <!-- 토글 스위치 -->
          <button
            class="relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-50"
            :class="enabled ? 'bg-brand' : 'bg-text-disabled'"
            :disabled="isLoading || isSaving"
            @click="handleToggle"
          >
            <span
              class="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200"
              :class="enabled ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <!-- 현재 상태 라벨 -->
        <div class="mt-4 pt-4 border-t border-surface-border">
          <div v-if="isLoading" class="flex items-center gap-2 text-sm text-text-tertiary">
            <span class="w-3.5 h-3.5 border-2 border-surface-border border-t-brand rounded-full animate-spin" />
            불러오는 중...
          </div>
          <div v-else class="flex items-center gap-2">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="enabled ? 'bg-brand' : 'bg-text-disabled'"
            />
            <span class="text-sm font-medium" :class="enabled ? 'text-brand' : 'text-text-tertiary'">
              {{ enabled ? '서비스 이용 중' : '서비스 중단 중' }}
            </span>
            <span v-if="isSaving" class="ml-auto w-3.5 h-3.5 border-2 border-surface-border border-t-brand rounded-full animate-spin" />
          </div>
        </div>
      </div>

      <!-- 서비스 중단 시 안내 문구 -->
      <div v-if="!enabled" class="bg-danger-bg rounded-xl px-5 py-4 flex gap-3">
        <span class="text-base shrink-0">⚠️</span>
        <p class="text-sm text-text-tertiary leading-relaxed">
          서비스를 중단할 경우, 티끌 앱 내에 결제 내역(영수증) 자체가 아예 저장되지 않습니다.
        </p>
      </div>

      <!-- 설명 카드 -->
      <div class="bg-white rounded-xl px-5 py-5 flex flex-col gap-3">
        <p class="text-sm font-semibold text-text-primary">자동 투자란?</p>
        <p class="text-sm text-text-tertiary leading-relaxed">
          카드 결제가 발생하면 잔돈을 자동으로 코인에 투자하는 서비스입니다.
          서비스를 유지(On) 상태로 두면 결제 내역 수집부터 투자 실행까지 모두 자동으로 진행됩니다.
        </p>
      </div>

    </div>

    <!-- 서비스 중단 확인 팝업 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showOffConfirm"
          class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          @click.self="showOffConfirm = false"
        >
          <Transition
            enter-active-class="transition-transform duration-200 ease-out"
            enter-from-class="translate-y-full"
            leave-active-class="transition-transform duration-150 ease-in"
            leave-to-class="translate-y-full"
          >
            <div
              v-if="showOffConfirm"
              class="w-full max-w-mobile bg-white rounded-t-3xl px-6 pt-6 pb-10 flex flex-col gap-5"
            >
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-text-primary">자동 투자 중단</h3>
                <button
                  class="w-8 h-8 flex items-center justify-center text-text-tertiary"
                  @click="showOffConfirm = false"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div class="bg-danger-bg rounded-xl p-4">
                <p class="text-sm text-text-tertiary leading-relaxed">
                  서비스를 중단할 경우, 티끌 앱 내에 결제 내역(영수증) 자체가 아예 저장되지 않습니다.
                </p>
              </div>

              <div class="flex flex-col gap-3">
                <button
                  class="w-full py-4 rounded-xl bg-danger text-white text-md font-bold active:opacity-80"
                  @click="confirmOff"
                >
                  서비스 중단
                </button>
                <button
                  class="w-full py-4 rounded-xl bg-surface text-md font-semibold text-text-primary active:bg-surface-border"
                  @click="showOffConfirm = false"
                >
                  취소
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
