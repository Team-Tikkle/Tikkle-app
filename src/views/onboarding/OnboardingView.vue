<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useAsyncAction } from '@/composables/useAsyncAction';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type {
  RiskTolerance,
  TrendSensitivity,
  CryptoTheme,
  DiversificationType,
  MemeAcceptance,
  TwoFactorProvider,
  CategoryType,
  RuleType,
} from '@/types';
import OnboardingUpbitConnect from '@/components/onboarding/OnboardingUpbitConnect.vue';
import OnboardingCardRegister from '@/components/onboarding/OnboardingCardRegister.vue';
import OnboardingSingleChoice from '@/components/onboarding/OnboardingSingleChoice.vue';
import OnboardingThemeChoice from '@/components/onboarding/OnboardingThemeChoice.vue';
import RuleSliderEditor from '@/components/common/RuleSliderEditor.vue';
import {
  RISK_LABELS,
  TREND_LABELS,
  MEME_LABELS,
  DIVERS_LABELS,
} from '@/components/onboarding/onboarding-labels';

const router = useRouter();
const userStore = useUserStore();
const onboardingStore = useOnboardingStore();
const settingsStore = useSettingsStore();

// ── 스텝 추적 ──
// 1: 카드 등록  2: 업비트 연결 + 2차 인증 수단  3~7: 투자 성향 Q1~Q5  8: 잔돈 규칙
const TOTAL_STEPS = 8;

// 부분 완료 유저는 첫 미완료 스텝부터 시작한다.
function getInitialStep(): number {
  const p = userStore.profile;
  if (!p || !p.hasKbankAccount) return 1;
  if (!p.hasUpbitKey)           return 2;
  if (!p.hasInvestmentProfile)  return 3;
  return 1;
}

const step = ref(getInitialStep());

// 기존 유저인데 업비트 키만 만료된 경우 (kbank·profile 완료, upbit만 false)
const isUpbitKeyExpired = computed(() => {
  const p = userStore.profile;
  return !!(p?.hasInvestmentProfile && p?.hasKbankAccount && !p?.hasUpbitKey);
});

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

// ── 잔돈 규칙 (Step 8/8) ──
const ALL_CATEGORIES: CategoryType[] = [
  'CAFE', 'MART', 'FOOD', 'SHOPPING', 'TRAFFIC', 'CULTURE', 'ETC',
];
const selectedRule = ref<RuleType>('ROUND_UP_10000');

// ── UI 상태 ──
const { isLoading, errorMsg, run } = useAsyncAction();
const isValidatingKbank = ref(false);
const isValidatingUpbit = ref(false);

// ── 단계별 진행 가능 여부 ──
const canProceed = computed(() => {
  switch (step.value) {
    case 1: return /^\d{4}$/.test(cardLast4.value);
    case 2: return Boolean(accessKey.value.trim() && secretKey.value.trim()) && twoFactorProvider.value !== '';
    case 7: return cryptoThemes.value.length > 0;
    default: return true;
  }
});

async function goNext() {
  if (step.value >= TOTAL_STEPS) return;

  // step 1: 케이뱅크 카드 즉시 저장
  if (step.value === 1) {
    isValidatingKbank.value = true;
    errorMsg.value = '';
    try {
      await settingsStore.updateKbank({ targetCardLast4: cardLast4.value });
    } catch (err) {
      errorMsg.value = err instanceof Error ? err.message : '케이뱅크 카드 등록에 실패했습니다.';
      isValidatingKbank.value = false;
      return;
    }
    isValidatingKbank.value = false;
  }

  // step 2: 업비트 키 즉시 검증·저장
  if (step.value === 2) {
    isValidatingUpbit.value = true;
    errorMsg.value = '';
    try {
      await settingsStore.updateUpbit({
        upbitAccessKey:    accessKey.value.trim(),
        upbitSecretKey:    secretKey.value.trim(),
        twoFactorProvider: twoFactorProvider.value,
      });
    } catch (err) {
      errorMsg.value = err instanceof Error ? err.message : '업비트 키 검증에 실패했습니다.';
      isValidatingUpbit.value = false;
      return;
    }
    isValidatingUpbit.value = false;

    // 키 만료 후 재연동 완료 → 더 이상 남은 미완료 단계가 없으므로 홈으로
    if (isUpbitKeyExpired.value) {
      if (userStore.profile) userStore.profile.hasUpbitKey = true;
      router.replace('/');
      return;
    }
  }

  step.value++;
  errorMsg.value = '';
}

function goBack() {
  if (step.value > 1) step.value--;
}

function handleSubmit() {
  run(async () => {
    onboardingStore.setPreferences({
      riskTolerance: prefs.riskTolerance,
      trendSensitivity: prefs.trendSensitivity,
      cryptoThemes: [...cryptoThemes.value],
      diversificationType: prefs.diversificationType,
      memeAcceptance: prefs.memeAcceptance,
    });
    // 온보딩에서 고른 잔돈 규칙을 전 카테고리에 동일 적용해 저장한다.
    // (투자 성향 프로필 저장보다 먼저 — 실패 시 hasInvestmentProfile이 false로 남아
    //  재시작 시 온보딩 설문 단계로 다시 라우팅되도록)
    await settingsStore.updateSpareChangeRules(
      ALL_CATEGORIES.map((category) => ({ category, ruleType: selectedRule.value })),
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
      <OnboardingCardRegister v-if="step === 1" v-model="cardLast4" />

      <template v-else-if="step === 2">
        <!-- 업비트 키 만료 배너 -->
        <div
          v-if="isUpbitKeyExpired"
          class="mx-6 mt-6 bg-danger-bg border border-danger rounded-xl px-4 py-3.5 flex items-start gap-3"
        >
          <svg class="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p class="text-sm text-danger leading-relaxed">
            보안을 위해 업비트 권한이 만료되었습니다. 업비트 API 키를 다시 연동해 주세요.
          </p>
        </div>

        <!-- ── DEV ONLY: @skip 핸들러 — 이 속성만 삭제하면 됩니다 ── -->
        <OnboardingUpbitConnect
          v-model:accessKey="accessKey"
          v-model:secretKey="secretKey"
          v-model:twoFactorProvider="twoFactorProvider"
          @skip="() => { userStore.completeOnboarding(); router.replace('/'); }"
        />
      </template>

      <OnboardingSingleChoice
        v-else-if="step === 3"
        tag="Q1 · 가격이 떨어질 때"
        question="보유 중인 코인이 갑자기 10% 하락한다면 어떻게 대응하시겠습니까?"
        :options="RISK_LABELS"
        v-model="prefs.riskTolerance"
      />

      <OnboardingSingleChoice
        v-else-if="step === 4"
        tag="Q2 · 코인 고르는 기준"
        question="투자할 코인을 고르는 주요 기준은 무엇인가요?"
        :options="TREND_LABELS"
        v-model="prefs.trendSensitivity"
      />

      <OnboardingSingleChoice
        v-else-if="step === 5"
        tag="Q3 · 밈 코인"
        question="인터넷 유행으로 만들어진 '밈 코인(Meme Coin)' 투자는 어떤가요?"
        :options="MEME_LABELS"
        v-model="prefs.memeAcceptance"
      />

      <OnboardingSingleChoice
        v-else-if="step === 6"
        tag="Q4 · 투자 분산"
        question="선호하는 자산 분배 방식은 무엇인가요?"
        :options="DIVERS_LABELS"
        v-model="prefs.diversificationType"
      />

      <OnboardingThemeChoice v-else-if="step === 7" v-model="cryptoThemes" />

      <!-- Step 8: 잔돈 규칙 -->
      <div v-else-if="step === 8" class="px-6 pt-6 flex flex-col gap-7">
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
        class="w-full py-4 rounded-xl text-md font-semibold text-white transition-colors flex items-center justify-center gap-2"
        :class="(canProceed && !isValidatingKbank && !isValidatingUpbit) ? 'bg-brand active:bg-brand-hover' : 'bg-text-disabled'"
        :disabled="!canProceed || isValidatingKbank || isValidatingUpbit"
        @click="goNext"
      >
        <span
          v-if="isValidatingKbank || isValidatingUpbit"
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        {{ isValidatingKbank ? '저장 중...' : isValidatingUpbit ? '검증 중...' : '다음' }}
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
