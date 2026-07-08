<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useAsyncAction } from '@/composables/useAsyncAction';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import type {
  RiskTolerance,
  TrendSensitivity,
  CryptoTheme,
  DiversificationType,
  MemeAcceptance,
  TwoFactorProvider,
  CategoryType,
  RuleType,
  CategoryRule,
} from '@/types';
import OnboardingUpbitConnect from '@/components/onboarding/OnboardingUpbitConnect.vue';
import OnboardingCardRegister from '@/components/onboarding/OnboardingCardRegister.vue';
import OnboardingSingleChoice from '@/components/onboarding/OnboardingSingleChoice.vue';
import OnboardingThemeChoice from '@/components/onboarding/OnboardingThemeChoice.vue';
import RuleSliderEditor from '@/components/common/RuleSliderEditor.vue';
import {
  TWO_FACTOR_LABELS,
  RISK_LABELS,
  TREND_LABELS,
  MEME_LABELS,
  DIVERS_LABELS,
} from '@/components/onboarding/onboarding-labels';

const router = useRouter();
const userStore = useUserStore();
const onboardingStore = useOnboardingStore();

// ── 스텝 추적 ──
// 1: 업비트 연결  2: 2차 인증 수단  3: 카드 등록  4~8: 투자 성향 Q1~Q5  9: 잔돈 규칙
const step = ref(1);
const TOTAL_STEPS = 9;

// ── 자격증명 ──
const accessKey         = ref('');
const secretKey         = ref('');
const twoFactorProvider = ref<TwoFactorProvider | ''>('');
const cardLast4         = ref('');

// ── 투자 성향 설문 (Q1~Q5) ──
const prefs = reactive({
  riskTolerance: 'HOLD' as RiskTolerance,
  trendSensitivity: 'PARTIAL_TREND' as TrendSensitivity,
  diversificationType: 'BALANCED' as DiversificationType,
  memeAcceptance: 'NONE' as MemeAcceptance,
});
const cryptoThemes = ref<CryptoTheme[]>([]);

// ── 잔돈 규칙 (Step 8) ──
const ALL_CATEGORIES: CategoryType[] = [
  'CAFE', 'MART', 'FOOD', 'SHOPPING', 'TRAFFIC', 'CULTURE', 'ETC',
];
const selectedRule = ref<RuleType>('ROUND_UP_10000');

// ── UI 상태 ──
const { isLoading, errorMsg, run } = useAsyncAction();

// ── 단계별 진행 가능 여부 ──
const canProceed = computed(() => {
  switch (step.value) {
    case 1: return Boolean(accessKey.value.trim() && secretKey.value.trim());
    case 2: return twoFactorProvider.value !== '';
    case 3: return /^\d{4}$/.test(cardLast4.value);
    case 8: return cryptoThemes.value.length > 0;
    default: return true;
  }
});

function goNext() {
  if (step.value < TOTAL_STEPS) {
    step.value++;
    errorMsg.value = '';
  }
}
function goBack() {
  if (step.value > 1) step.value--;
}

function handleSubmit() {
  run(async () => {
    onboardingStore.setCredentials({
      upbitAccessKey:    accessKey.value.trim(),
      upbitSecretKey:    secretKey.value.trim(),
      targetCardLast4:   cardLast4.value,
      twoFactorProvider: twoFactorProvider.value as TwoFactorProvider,
    });
    onboardingStore.setPreferences({
      riskTolerance: prefs.riskTolerance,
      trendSensitivity: prefs.trendSensitivity,
      cryptoThemes: [...cryptoThemes.value],
      diversificationType: prefs.diversificationType,
      memeAcceptance: prefs.memeAcceptance,
    });
    onboardingStore.setCategoryRules(
      ALL_CATEGORIES.map(
        (category) => ({ category, ruleType: selectedRule.value }) as CategoryRule,
      ),
    );
    await onboardingStore.submitOnboarding();
    userStore.completeOnboarding();
    router.replace('/');
  });
}

</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <!-- 상태바 플레이스홀더 -->
    <div class="bg-white h-12 shrink-0" />

    <!-- 진행 바 -->
    <div class="bg-white px-6 pt-4 pb-4">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm text-text-tertiary">{{ step }} / {{ TOTAL_STEPS }} 단계</span>
        <span class="text-sm font-semibold text-brand"
          >{{ Math.round((step / TOTAL_STEPS) * 100) }}%</span
        >
      </div>
      <div class="h-1.5 bg-surface-border rounded-pill overflow-hidden">
        <div
          class="h-full bg-brand rounded-pill transition-all duration-300"
          :style="{ width: `${Math.round((step / TOTAL_STEPS) * 100)}%` }"
        />
      </div>
    </div>

    <!-- 스크롤 영역 -->
    <div class="flex-1 overflow-y-auto pb-36">
      <!-- ── DEV ONLY: @skip 핸들러 — 이 속성만 삭제하면 됩니다 ── -->
      <OnboardingUpbitConnect v-if="step === 1" v-model:accessKey="accessKey" v-model:secretKey="secretKey" @skip="() => { userStore.completeOnboarding(); router.replace('/'); }" />

      <!-- Step 2: 2차 인증 수단 선택 -->
      <OnboardingSingleChoice
        v-else-if="step === 2"
        tag="2차 인증 수단"
        question="업비트 입금 시 사용할 인증 앱을 선택해 주세요."
        :options="TWO_FACTOR_LABELS"
        v-model="twoFactorProvider"
      />

      <OnboardingCardRegister v-else-if="step === 3" v-model="cardLast4" />

      <OnboardingSingleChoice
        v-else-if="step === 4"
        tag="Q1 · 가격이 떨어질 때"
        question="보유 중인 코인이 갑자기 10% 하락한다면 어떻게 대응하시겠습니까?"
        :options="RISK_LABELS"
        v-model="prefs.riskTolerance"
      />

      <OnboardingSingleChoice
        v-else-if="step === 5"
        tag="Q2 · 코인 고르는 기준"
        question="투자할 코인을 고르는 주요 기준은 무엇인가요?"
        :options="TREND_LABELS"
        v-model="prefs.trendSensitivity"
      />

      <OnboardingSingleChoice
        v-else-if="step === 6"
        tag="Q3 · 밈 코인"
        question="인터넷 유행으로 만들어진 '밈 코인(Meme Coin)' 투자는 어떤가요?"
        :options="MEME_LABELS"
        v-model="prefs.memeAcceptance"
      />

      <OnboardingSingleChoice
        v-else-if="step === 7"
        tag="Q4 · 투자 분산"
        question="선호하는 자산 분배 방식은 무엇인가요?"
        :options="DIVERS_LABELS"
        v-model="prefs.diversificationType"
      />

      <OnboardingThemeChoice v-else-if="step === 8" v-model="cryptoThemes" />

      <!-- Step 9: 잔돈 규칙 -->
      <div v-else-if="step === 9" class="px-6 pt-6 flex flex-col gap-7">
        <span class="text-sm font-semibold text-brand">잔돈 설정</span>
        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            잔돈 규칙을 설정하세요
          </h2>
          <p class="text-base text-text-tertiary leading-relaxed">
            모든 결제에 공통으로 적용돼요. 카테고리별 세부 설정은 가입 후 설정 화면에서 바꿀 수 있어요.
          </p>
        </div>

        <RuleSliderEditor v-model="selectedRule" />

        <p v-if="errorMsg" role="alert" class="text-sm text-danger text-center px-2">
          {{ errorMsg }}
        </p>
      </div>
    </div>

    <!-- 하단 고정 내비게이션 -->
    <div
      class="fixed bottom-0 left-0 right-0 bg-surface px-6 pt-3 pb-5 flex flex-col gap-2 max-w-mobile mx-auto"
    >
      <button
        v-if="step < TOTAL_STEPS"
        class="w-full py-4 rounded-xl text-md font-semibold text-white transition-colors"
        :class="canProceed ? 'bg-brand active:bg-brand-hover' : 'bg-text-disabled'"
        :disabled="!canProceed"
        @click="goNext"
      >
        다음
      </button>
      <button
        v-else
        class="w-full py-4 rounded-xl text-md font-semibold text-white transition-colors flex items-center justify-center gap-2"
        :class="isLoading ? 'bg-text-disabled' : 'bg-brand active:bg-brand-hover'"
        :disabled="isLoading"
        @click="handleSubmit"
      >
        <span
          v-if="isLoading"
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        {{ isLoading ? '저장 중...' : '시작하기' }}
      </button>

      <button
        v-if="step > 1"
        class="w-full py-3 rounded-xl text-base font-medium text-text-secondary active:opacity-70"
        @click="goBack"
      >
        이전
      </button>
    </div>
  </div>
</template>
