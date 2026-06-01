<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import BottomNav from '@/components/common/BottomNav.vue'
import { useUserStore } from '@/stores/useUserStore'

const router = useRouter()
const userStore = useUserStore()

// Withdrawal modal state
const showWithdrawalModal = ref(false)

// Risk type labels
const riskLabel: Record<string, string> = {
  STABLE: '안정형',
  NEUTRAL: '위험중립형',
  AGGRESSIVE: '적극투자형',
}

// Chevron icon (right arrow for menu items)
const chevronRight = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`

// Menu items config
const menuItems = [
  {
    label: '투자 규칙 변경',
    sub: computed(() => {
      const rule = userStore.profile?.rule
      const ruleLabel = rule === 'UNDER_1000' ? '1,000원 단위'
        : rule === 'UNDER_500' ? '500원 단위'
        : '100원 단위'
      const mode = userStore.profile?.is_auto ? '자동 매매' : '수동 매매'
      return `올림 잔돈 / ${ruleLabel} · ${mode}`
    }),
    action: () => router.push('/onboarding'),
    hasChevron: true,
  },
  {
    label: '증권사 계정 및 API 키 관리',
    sub: computed(() => 'KIS 모의 투자 계정 연결됨'),
    action: () => router.push('/onboarding/api-key'),
    hasChevron: true,
  },
]

import { computed } from 'vue'
</script>

<template>
  <div class="min-h-screen bg-surface pb-24">
    <AppHeader title="설정" />

    <div class="px-4 pt-3 flex flex-col gap-3">

      <!-- ── Profile card ── -->
      <div class="bg-white rounded-xl px-5 py-5">
        <div class="flex items-center gap-4">
          <!-- Avatar -->
          <div class="w-[52px] h-[52px] rounded-xl bg-brand-bg flex items-center justify-center text-2xl shrink-0">
            🪙
          </div>
          <!-- Info -->
          <div>
            <p class="text-md font-bold text-text-primary">티끌 사용자</p>
            <p class="text-sm text-text-tertiary mt-0.5">
              {{ riskLabel[userStore.profile?.risk_type ?? 'NEUTRAL'] }} ·
              {{ userStore.profile?.is_auto ? '자동 매매 중' : '수동 매매 중' }}
            </p>
          </div>
        </div>
      </div>

      <!-- ── Investment settings ── -->
      <div class="bg-white rounded-xl overflow-hidden divide-y divide-surface-border">
        <!-- 투자 규칙 변경 -->
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="router.push('/onboarding')"
        >
          <div class="flex flex-col gap-1 text-left">
            <span class="text-base font-medium text-text-primary">투자 규칙 변경</span>
            <span class="text-sm text-text-tertiary">
              올림 잔돈 / 1,000원 단위 · {{ userStore.profile?.is_auto ? '자동 매매' : '수동 매매' }}
            </span>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="chevronRight" />
        </button>
        <!-- 증권사 계정 및 API 키 관리 -->
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="router.push('/onboarding/api-key')"
        >
          <div class="flex flex-col gap-1 text-left">
            <span class="text-base font-medium text-text-primary">증권사 계정 및 API 키 관리</span>
            <span class="text-sm text-text-tertiary">KIS 모의 투자 계정 연결됨</span>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="chevronRight" />
        </button>
      </div>

      <!-- ── General settings ── -->
      <div class="bg-white rounded-xl overflow-hidden divide-y divide-surface-border">
        <button
          v-for="item in ['알림 설정', '개인정보 처리방침', '이용약관', '고객센터']"
          :key="item"
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
        >
          <span class="text-base font-medium text-text-primary">{{ item }}</span>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="chevronRight" />
        </button>
        <!-- App version — non-clickable -->
        <div class="px-5 py-4 flex items-center justify-between">
          <span class="text-base font-medium text-text-tertiary">앱 버전 1.0.0</span>
        </div>
      </div>

      <!-- ── Danger zone: withdrawal ── -->
      <div class="bg-white rounded-xl overflow-hidden">
        <button
          class="w-full px-5 py-4 flex flex-col gap-0.5 active:bg-surface text-left"
          @click="showWithdrawalModal = true"
        >
          <span class="text-base font-medium text-danger">서비스 탈퇴</span>
          <span class="text-sm text-danger-light">탈퇴 시 보유 주식이 즉시 매도됩니다</span>
        </button>
      </div>

    </div>

    <BottomNav />

    <!-- ════ Withdrawal modal (Teleport to body) ════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showWithdrawalModal"
          class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          @click.self="showWithdrawalModal = false"
        >
          <!-- Sheet -->
          <Transition
            enter-active-class="transition-transform duration-200 ease-out"
            enter-from-class="translate-y-full"
            leave-active-class="transition-transform duration-150 ease-in"
            leave-to-class="translate-y-full"
          >
            <div
              v-if="showWithdrawalModal"
              class="w-full max-w-mobile bg-white rounded-t-3xl px-6 pt-6 pb-10 flex flex-col gap-5"
            >
              <!-- Header -->
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-brand">서비스 탈퇴</h3>
                <button
                  class="w-8 h-8 flex items-center justify-center text-text-tertiary"
                  @click="showWithdrawalModal = false"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <!-- Warning box -->
              <div class="bg-danger-bg rounded-xl p-4 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-base font-semibold text-danger">⚠️ 주의</span>
                </div>
                <p class="text-sm text-text-tertiary leading-relaxed">
                  보유 중인 주식이 즉시 시장가로 일괄 매도됩니다.<br>
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>

              <!-- Actions -->
              <div class="flex flex-col gap-3">
                <button
                  class="w-full py-4 rounded-xl bg-danger text-white text-md font-bold active:opacity-80"
                >
                  탈퇴 신청하기
                </button>
                <button
                  class="w-full py-4 rounded-xl bg-surface text-md font-semibold text-text-primary active:bg-surface-border"
                  @click="showWithdrawalModal = false"
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
