<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import OnboardingSingleChoice from '@/components/onboarding/OnboardingSingleChoice.vue'
import OnboardingThemeChoice from '@/components/onboarding/OnboardingThemeChoice.vue'
import { useOnboardingStore } from '@/stores/useOnboardingStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { RiskTolerance, TrendSensitivity, CryptoTheme, DiversificationType, MemeAcceptance } from '@/types'
import {
  RISK_LABELS,
  TREND_LABELS,
  MEME_LABELS,
  DIVERS_LABELS,
} from '@/components/onboarding/onboarding-labels'

const onboardingStore = useOnboardingStore()
const settingsStore = useSettingsStore()
const { isLoading, errorMsg, run } = useAsyncAction()

const successMsg = ref('')

const prefs = reactive({
  riskTolerance:       'HOLD'          as RiskTolerance,
  trendSensitivity:    'PARTIAL_TREND' as TrendSensitivity,
  diversificationType: 'BALANCED'      as DiversificationType,
  memeAcceptance:      'NONE'          as MemeAcceptance,
})
const cryptoThemes = ref<CryptoTheme[]>([])

onMounted(async () => {
  try {
    await settingsStore.fetchSettings()
    const p = settingsStore.investmentProfile
    if (p) {
      prefs.riskTolerance       = p.riskTolerance       as RiskTolerance
      prefs.trendSensitivity    = p.trendSensitivity    as TrendSensitivity
      prefs.diversificationType = p.diversificationType as DiversificationType
      prefs.memeAcceptance      = p.memeAcceptance      as MemeAcceptance
      cryptoThemes.value        = (p.cryptoThemes ?? []) as CryptoTheme[]
    }
  } catch {
    // 불러오기 실패 시 기본값으로 시작
  }
})

function handleSave() {
  if (cryptoThemes.value.length === 0) {
    errorMsg.value = '관심 테마를 하나 이상 선택해 주세요.'
    return
  }
  successMsg.value = ''
  run(async () => {
    onboardingStore.setPreferences({
      riskTolerance:       prefs.riskTolerance,
      trendSensitivity:    prefs.trendSensitivity,
      cryptoThemes:        [...cryptoThemes.value],
      diversificationType: prefs.diversificationType,
      memeAcceptance:      prefs.memeAcceptance,
    })
    await onboardingStore.submitOnboarding()
    successMsg.value = '투자 성향이 업데이트되었습니다.'
  })
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <AppHeader title="투자 성향 및 관심 테마" :show-back="true" />

    <div class="flex-1 overflow-y-auto pb-36 flex flex-col divide-y divide-surface-border">

      <div class="px-6 pt-6 pb-5 flex flex-col gap-2">
        <h2 class="text-2xl font-bold text-text-primary leading-snug">
          투자 성향을<br>다시 설정해 보세요
        </h2>
        <p class="text-base text-text-tertiary leading-relaxed">
          AI가 잔돈 투자 종목을 추천할 때 아래 성향을 반영합니다. 언제든지 바꿀 수 있어요.
        </p>
      </div>

      <OnboardingSingleChoice
        tag="Q1 · 가격이 떨어질 때"
        question="보유 중인 코인이 갑자기 10% 하락한다면 어떻게 대응하시겠습니까?"
        :options="RISK_LABELS"
        v-model="prefs.riskTolerance"
      />

      <OnboardingSingleChoice
        tag="Q2 · 코인 고르는 기준"
        question="투자할 코인을 고르는 주요 기준은 무엇인가요?"
        :options="TREND_LABELS"
        v-model="prefs.trendSensitivity"
      />

      <OnboardingSingleChoice
        tag="Q3 · 밈 코인"
        question="인터넷 유행으로 만들어진 '밈 코인(Meme Coin)' 투자는 어떤가요?"
        :options="MEME_LABELS"
        v-model="prefs.memeAcceptance"
      />

      <OnboardingSingleChoice
        tag="Q4 · 투자 분산"
        question="선호하는 자산 분배 방식은 무엇인가요?"
        :options="DIVERS_LABELS"
        v-model="prefs.diversificationType"
      />

      <OnboardingThemeChoice v-model="cryptoThemes" />

      <div class="px-6 pt-5 pb-2 flex flex-col gap-2">
        <p v-if="successMsg" class="text-sm text-brand text-center font-medium">{{ successMsg }}</p>
        <p v-if="errorMsg" role="alert" class="text-sm text-danger text-center">{{ errorMsg }}</p>
      </div>
    </div>

    <!-- Sticky CTA -->
    <div class="fixed bottom-0 left-0 right-0 max-w-mobile mx-auto bg-surface px-6 pt-3 pb-8">
      <button
        class="w-full py-4 rounded-xl text-md font-semibold text-white flex items-center justify-center gap-2 transition-colors"
        :class="isLoading ? 'bg-text-disabled' : 'bg-brand active:bg-brand-hover'"
        :disabled="isLoading"
        @click="handleSave"
      >
        <span v-if="isLoading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        {{ isLoading ? '저장 중...' : '저장하기' }}
      </button>
    </div>
  </div>
</template>
