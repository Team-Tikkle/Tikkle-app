<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import type {
  RiskTolerance,
  TrendSensitivity,
  CryptoTheme,
  DiversificationType,
  MemeAcceptance,
  ExecutionMode,
  CategoryType,
  RuleType,
  CategoryRule,
} from '@/types';

const router = useRouter();
const userStore = useUserStore();
const onboardingStore = useOnboardingStore();

// ── Step tracking ──
// 1: 업비트 연결  2: 카드 등록  3~7: 투자 성향 Q1~Q5  8: 매매 방식 & 잔돈 규칙
const step = ref(1);
const TOTAL_STEPS = 8;

// ── 업비트 Open API 키 + 결제 카드 ──
const accessKey = ref('');
const secretKey = ref('');
const cardCompany = ref('국민카드');
const cardLast4 = ref('');

const isCardLast4Valid = computed(() => /^\d{4}$/.test(cardLast4.value));

// Step 1: 업비트 키 검증 / Step 2: 카드 검증
const isStep1Valid = computed(
  () => accessKey.value.trim() && secretKey.value.trim(),
);
const isStep2Valid = computed(
  () => cardCompany.value.trim() && isCardLast4Valid.value,
);

// ── 투자 성향 설문 (Q1~Q5) + 매매 방식 ──
const prefs = reactive({
  riskTolerance: 'HOLD' as RiskTolerance,
  trendSensitivity: 'PARTIAL_TREND' as TrendSensitivity,
  diversificationType: 'BALANCED' as DiversificationType,
  memeAcceptance: 'NONE' as MemeAcceptance,
  executionMode: 'AUTO' as ExecutionMode,
});
// Q3: 관심 테마 (다중 선택)
const cryptoThemes = ref<CryptoTheme[]>([]);

function toggleTheme(theme: CryptoTheme) {
  const i = cryptoThemes.value.indexOf(theme);
  if (i >= 0) cryptoThemes.value.splice(i, 1);
  else cryptoThemes.value.push(theme);
}

// 단계별 진행 가능 여부 (검증이 필요한 단계만 막는다)
const canProceed = computed(() => {
  switch (step.value) {
    case 1:
      return Boolean(isStep1Valid.value);
    case 2:
      return Boolean(isStep2Valid.value);
    case 7:
      return cryptoThemes.value.length > 0; // Q5(관심 테마): 최소 1개 선택
    default:
      return true;
  }
});

// ── 잔돈 규칙 (Step 8) ──
// 온보딩에서는 하나의 규칙을 모든 카테고리에 일괄 적용한다.
// 카테고리별 세부 조정은 가입 후 설정 화면(CategoryRulesView)에서 가능.
const ALL_CATEGORIES: CategoryType[] = [
  'CAFE',
  'MART',
  'FOOD',
  'SHOPPING',
  'TRAFFIC',
  'CULTURE',
  'ETC',
];

// 잔돈 발생 방식 토글 (올림 / 비율)
const ruleMode = ref<'ROUND_UP' | 'PERCENT'>('ROUND_UP');

// 각 방식의 슬라이더 옵션 — 백엔드 RuleType과 1:1 대응
const ROUND_UP_OPTIONS: { value: RuleType; amount: number; tick: string }[] = [
  { value: 'ROUND_UP_10000', amount: 10000, tick: '1만' },
  { value: 'ROUND_UP_20000', amount: 20000, tick: '2만' },
  { value: 'ROUND_UP_30000', amount: 30000, tick: '3만' },
  { value: 'ROUND_UP_40000', amount: 40000, tick: '4만' },
  { value: 'ROUND_UP_50000', amount: 50000, tick: '5만' },
];
const PERCENT_OPTIONS: { value: RuleType; percent: number; tick: string }[] = [
  { value: 'PERCENT_10', percent: 10, tick: '10%' },
  { value: 'PERCENT_15', percent: 15, tick: '15%' },
  { value: 'PERCENT_20', percent: 20, tick: '20%' },
  { value: 'PERCENT_25', percent: 25, tick: '25%' },
  { value: 'PERCENT_30', percent: 30, tick: '30%' },
];

// 방식별 슬라이더 위치 — 토글을 오가도 각자의 선택이 보존된다
const roundUpIndex = ref(0);
const percentIndex = ref(0);

// 현재 활성화된 옵션 목록 / 슬라이더 인덱스
const activeOptions = computed(() =>
  ruleMode.value === 'ROUND_UP' ? ROUND_UP_OPTIONS : PERCENT_OPTIONS,
);
const activeIndex = computed<number>({
  get: () =>
    ruleMode.value === 'ROUND_UP' ? roundUpIndex.value : percentIndex.value,
  set: (v) => {
    if (ruleMode.value === 'ROUND_UP') roundUpIndex.value = v;
    else percentIndex.value = v;
  },
});

// 제출 시 모든 카테고리에 일괄 적용할 규칙
const selectedRule = computed<RuleType>(
  () => activeOptions.value[activeIndex.value].value,
);

// 카드 상단 현재 값 + 설명
const ruleValueLabel = computed(() =>
  ruleMode.value === 'ROUND_UP'
    ? `${ROUND_UP_OPTIONS[roundUpIndex.value].amount.toLocaleString('ko-KR')}원`
    : `${PERCENT_OPTIONS[percentIndex.value].percent}%`,
);
const ruleDescription = computed(() =>
  ruleMode.value === 'ROUND_UP'
    ? `결제 후 ${ROUND_UP_OPTIONS[roundUpIndex.value].amount.toLocaleString('ko-KR')}원 단위로 올림한 잔돈을 적립합니다`
    : `결제 금액의 ${PERCENT_OPTIONS[percentIndex.value].percent}%를 잔돈으로 자동 적립합니다`,
);

// 슬라이더 진행 막대 — 채워진 구간(파랑) / 남은 구간(회색)
const sliderFillStyle = computed(() => {
  const max = activeOptions.value.length - 1;
  const pct = max > 0 ? (activeIndex.value / max) * 100 : 0;
  return {
    background: `linear-gradient(to right, #0051ff 0%, #0051ff ${pct}%, #e5e5ea ${pct}%, #e5e5ea 100%)`,
  };
});

// ── UI state ──
const isLoading = ref(false);
const errorMsg = ref('');

// ── Navigation ──
function goNext() {
  if (step.value < TOTAL_STEPS) {
    step.value++;
    errorMsg.value = '';
  }
}

function goBack() {
  if (step.value > 1) step.value--;
}

// TEMP(스킵): 백엔드 API 미연동 상태에서 온보딩을 건너뛰고 홈으로 이동한다.
// 백엔드 준비 후 이 함수와 템플릿의 스킵 버튼 블록을 함께 삭제하면 된다.
function skipOnboarding() {
  userStore.completeOnboarding();
  router.replace('/');
}

// ── Submit (Step 8) ──
async function handleSubmit() {
  if (isLoading.value) return;
  isLoading.value = true;
  errorMsg.value = '';

  try {
    onboardingStore.setCredentials({
      upbitAccessKey: accessKey.value.trim(),
      upbitSecretKey: secretKey.value.trim(),
      targetCardCompany: cardCompany.value,
      targetCardLast4: cardLast4.value,
    });
    onboardingStore.setPreferences({
      riskTolerance: prefs.riskTolerance,
      trendSensitivity: prefs.trendSensitivity,
      cryptoThemes: [...cryptoThemes.value],
      diversificationType: prefs.diversificationType,
      memeAcceptance: prefs.memeAcceptance,
      executionMode: prefs.executionMode,
    });
    onboardingStore.setCategoryRules(
      ALL_CATEGORIES.map(
        (category) =>
          ({ category, ruleType: selectedRule.value }) as CategoryRule,
      ),
    );

    await onboardingStore.submitOnboarding();

    userStore.completeOnboarding();
    router.replace('/');
  } catch (err: unknown) {
    errorMsg.value =
      err instanceof Error
        ? err.message
        : '오류가 발생했습니다. 다시 시도해 주세요.';
  } finally {
    isLoading.value = false;
  }
}

// ── Q1~Q5 설문 라벨 ──
const RISK_LABELS: Record<RiskTolerance, { title: string; desc: string }> = {
  SELL_IMMEDIATELY: {
    title: '즉시 매도',
    desc: '더 큰 손실을 막기 위해 바로 처분합니다.',
  },
  HOLD: {
    title: '그대로 보유',
    desc: '일시적인 하락이라 판단하고 시장을 관망합니다.',
  },
  BUY_MORE: {
    title: '추가 매수',
    desc: '저가 매수의 기회로 삼아 보유량을 늘립니다.',
  },
};
const TREND_LABELS: Record<TrendSensitivity, { title: string; desc: string }> = {
  FUNDAMENTAL_ONLY: {
    title: '대형 우량주 위주',
    desc: '비트코인, 이더리움 등 검증되고 안정적인 코인을 선호합니다.',
  },
  PARTIAL_TREND: {
    title: '우량주 + 트렌드',
    desc: '대형 코인을 기본으로 두고, 유행하는 코인을 일부 섞어 투자합니다.',
  },
  FULL_TREND: {
    title: '트렌드 적극 추종',
    desc: '현재 시장에서 가장 인기 있고 화제가 되는 코인 위주로 투자합니다.',
  },
};
const THEME_LABELS: Record<CryptoTheme, { title: string; sub: string }> = {
  LAYER_1: {
    title: '메이저 코인',
    sub: '비트코인, 이더리움 등 시장을 주도하는 대표 코인',
  },
  DEFI: {
    title: '스마트 금융 (디파이)',
    sub: '은행 없이 코인으로 예금·대출을 하는 금융 서비스',
  },
  AI: { title: 'AI 테마', sub: '인공지능 기술 및 데이터 혁신 관련 프로젝트' },
  WEB3_GAMING: {
    title: '게임·문화 (웹3)',
    sub: '게임 아이템 소유 및 엔터테인먼트 중심 생태계',
  },
  RWA: {
    title: '실물 자산 (RWA)',
    sub: '부동산, 금, 국채 등 실제 자산과 연동된 코인',
  },
  MEME: { title: '트렌드 밈(Meme)', sub: '커뮤니티 팬덤 기반 코인' },
};
const DIVERS_LABELS: Record<
  DiversificationType,
  { title: string; desc: string }
> = {
  CONCENTRATED: {
    title: '집중 투자',
    desc: '확신이 있는 1~2개의 코인에 비중을 크게 둡니다.',
  },
  BALANCED: {
    title: '균형 분산',
    desc: '관리가 용이한 3~5개의 코인으로 적절히 나누어 투자합니다.',
  },
  DIVERSIFIED: {
    title: '넓은 분산',
    desc: '변동성 대비를 위해 최대한 다양한 코인에 폭넓게 나누어 담습니다.',
  },
};
const MEME_LABELS: Record<MemeAcceptance, { title: string; desc: string }> = {
  NONE: {
    title: '투자 안 함',
    desc: '변동성이 너무 커서 포트폴리오에 포함하지 않습니다.',
  },
  SMALL: {
    title: '소액 체험',
    desc: '전체 투자금에 영향이 없는 소액 범위 내에서만 투자합니다.',
  },
  ACTIVE: {
    title: '적극 수용',
    desc: '높은 단기 수익률을 위해 비중 있게 투자할 의향이 있습니다.',
  },
};
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <!-- Status bar placeholder -->
    <div class="bg-white h-12 shrink-0" />

    <!-- TEMP(스킵): 백엔드 준비 후 이 블록 삭제 -->
    <div class="bg-white px-6 pb-2 flex justify-end">
      <button
        class="px-3 py-1 rounded-pill bg-surface-alt text-text-tertiary text-xs2 font-semibold active:opacity-70"
        @click="skipOnboarding"
      >
        스킵하고 홈으로 →
      </button>
    </div>

    <!-- Progress bar -->
    <div class="bg-white px-6 pt-1 pb-4">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm text-text-tertiary"
          >{{ step }} / {{ TOTAL_STEPS }} 단계</span
        >
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

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto pb-36">
      <!-- ── Step 1: 업비트 계좌 연결 ── -->
      <div v-if="step === 1" class="px-6 pt-6 flex flex-col gap-6">
        <span class="text-sm font-semibold text-brand">거래소 연동</span>

        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            업비트 계정을<br />연결해 주세요
          </h2>
          <p class="text-base text-text-tertiary leading-relaxed">
            업비트 Open API 키를 연동합니다. 키 발급 시 출금 권한은 켜지 않아도
            됩니다.
          </p>
        </div>

        <!-- Info banner -->
        <div class="bg-brand-bg rounded-xl p-4 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <svg
              class="text-brand shrink-0"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span class="text-base font-semibold text-brand"
              >Open API 키 연동</span
            >
          </div>
          <p class="text-sm text-brand-300 leading-relaxed">
            업비트 [마이페이지 → Open API 관리]에서 API 키를 발급받아 입력해
            주세요.
          </p>
        </div>

        <div class="flex flex-col gap-5">
          <!-- Access Key -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary"
              >Access Key</label
            >
            <input
              v-model="accessKey"
              type="text"
              placeholder="Access Key를 붙여넣으세요"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
            <p class="text-xs2 text-text-tertiary">
              업비트 → 마이페이지 → Open API 관리 → Access Key 복사
            </p>
          </div>

          <!-- Secret Key -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary"
              >Secret Key</label
            >
            <input
              v-model="secretKey"
              type="password"
              placeholder="Secret Key를 붙여넣으세요"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>
        </div>
      </div>

      <!-- ── Step 2: 카드 등록 ── -->
      <div v-else-if="step === 2" class="px-6 pt-6 flex flex-col gap-6">
        <span class="text-sm font-semibold text-brand">카드 등록</span>

        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            잔돈 적립에 사용할<br />카드를 등록해 주세요
          </h2>
          <p class="text-base text-text-tertiary leading-relaxed">
            업비트와는 별개로, 잔돈을 모을 결제 카드를 등록합니다.
          </p>
        </div>

        <div class="flex flex-col gap-5">
          <!-- Card company -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary"
              >카드사</label
            >
            <select
              v-model="cardCompany"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all appearance-none"
            >
              <option value="국민카드">국민카드</option>
              <option value="우리카드">우리카드</option>
              <option value="하나카드">하나카드</option>
              <option value="케이뱅크">케이뱅크</option>
            </select>
          </div>

          <!-- Card last 4 digits -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary"
              >카드 번호 끝 4자리</label
            >
            <input
              v-model="cardLast4"
              type="text"
              inputmode="numeric"
              maxlength="4"
              placeholder="0000"
              class="w-full px-4 py-3.5 rounded-xl bg-white border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 transition-all"
              :class="
                cardLast4 && !isCardLast4Valid
                  ? 'border-danger focus:border-danger focus:ring-danger/20'
                  : 'border-surface-border focus:border-brand focus:ring-brand/20'
              "
            />
            <p
              v-if="cardLast4 && !isCardLast4Valid"
              class="text-xs2 text-danger"
            >
              숫자 4자리를 정확히 입력해 주세요.
            </p>
            <p v-else class="text-xs2 text-text-tertiary">
              잔돈 적립 대상 카드의 끝 4자리 숫자를 입력하세요
            </p>
          </div>
        </div>
      </div>

      <!-- ── Step 3: Q1 하락장 방어 ── -->
      <div v-else-if="step === 3" class="px-6 pt-6 flex flex-col gap-6">
        <span class="text-sm font-semibold text-brand"
          >Q1 · 가격이 떨어질 때</span
        >
        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            보유 중인 코인이 갑자기 10% 하락한다면 어떻게 대응하시겠습니까?
          </h2>
        </div>
        <div class="flex flex-col gap-3">
          <button
            v-for="(opt, key) in RISK_LABELS"
            :key="key"
            class="w-full text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-0.5"
            :class="
              prefs.riskTolerance === key
                ? 'border-brand bg-brand-bg'
                : 'border-surface-border bg-white'
            "
            @click="prefs.riskTolerance = key as RiskTolerance"
          >
            <span
              class="text-base font-bold"
              :class="
                prefs.riskTolerance === key ? 'text-brand' : 'text-text-primary'
              "
              >{{ opt.title }}</span
            >
            <span
              class="text-sm"
              :class="
                prefs.riskTolerance === key
                  ? 'text-brand-300'
                  : 'text-text-tertiary'
              "
              >{{ opt.desc }}</span
            >
          </button>
        </div>
      </div>

      <!-- ── Step 4: Q2 트렌드 민감도 ── -->
      <div v-else-if="step === 4" class="px-6 pt-6 flex flex-col gap-6">
        <span class="text-sm font-semibold text-brand"
          >Q2 · 코인 고르는 기준</span
        >
        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            투자할 코인을 고르는 주요 기준은 무엇인가요?
          </h2>
        </div>
        <div class="flex flex-col gap-3">
          <button
            v-for="(opt, key) in TREND_LABELS"
            :key="key"
            class="w-full text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-0.5"
            :class="
              prefs.trendSensitivity === key
                ? 'border-brand bg-brand-bg'
                : 'border-surface-border bg-white'
            "
            @click="prefs.trendSensitivity = key as TrendSensitivity"
          >
            <span
              class="text-base font-bold"
              :class="
                prefs.trendSensitivity === key
                  ? 'text-brand'
                  : 'text-text-primary'
              "
              >{{ opt.title }}</span
            >
            <span
              class="text-sm"
              :class="
                prefs.trendSensitivity === key
                  ? 'text-brand-300'
                  : 'text-text-tertiary'
              "
              >{{ opt.desc }}</span
            >
          </button>
        </div>
      </div>

      <!-- ── Step 5: Q3 밈 코인 수용도 ── -->
      <div v-else-if="step === 5" class="px-6 pt-6 flex flex-col gap-6">
        <span class="text-sm font-semibold text-brand">Q3 · 밈 코인</span>
        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            인터넷 유행으로 만들어진 '밈 코인(Meme Coin)' 투자는 어떤가요?
          </h2>
        </div>
        <div class="flex flex-col gap-3">
          <button
            v-for="(opt, key) in MEME_LABELS"
            :key="key"
            class="w-full text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-0.5"
            :class="
              prefs.memeAcceptance === key
                ? 'border-brand bg-brand-bg'
                : 'border-surface-border bg-white'
            "
            @click="prefs.memeAcceptance = key as MemeAcceptance"
          >
            <span
              class="text-base font-bold"
              :class="
                prefs.memeAcceptance === key
                  ? 'text-brand'
                  : 'text-text-primary'
              "
              >{{ opt.title }}</span
            >
            <span
              class="text-sm"
              :class="
                prefs.memeAcceptance === key
                  ? 'text-brand-300'
                  : 'text-text-tertiary'
              "
              >{{ opt.desc }}</span
            >
          </button>
        </div>
      </div>

      <!-- ── Step 6: Q4 분산도 ── -->
      <div v-else-if="step === 6" class="px-6 pt-6 flex flex-col gap-6">
        <span class="text-sm font-semibold text-brand">Q4 · 투자 분산</span>
        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            선호하는 자산 분배 방식은 무엇인가요?
          </h2>
        </div>
        <div class="flex flex-col gap-3">
          <button
            v-for="(opt, key) in DIVERS_LABELS"
            :key="key"
            class="w-full text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-0.5"
            :class="
              prefs.diversificationType === key
                ? 'border-brand bg-brand-bg'
                : 'border-surface-border bg-white'
            "
            @click="prefs.diversificationType = key as DiversificationType"
          >
            <span
              class="text-base font-bold"
              :class="
                prefs.diversificationType === key
                  ? 'text-brand'
                  : 'text-text-primary'
              "
              >{{ opt.title }}</span
            >
            <span
              class="text-sm"
              :class="
                prefs.diversificationType === key
                  ? 'text-brand-300'
                  : 'text-text-tertiary'
              "
              >{{ opt.desc }}</span
            >
          </button>
        </div>
      </div>

      <!-- ── Step 7: Q5 관심 테마 (다중) ── -->
      <div v-else-if="step === 7" class="px-6 pt-6 flex flex-col gap-6">
        <span class="text-sm font-semibold text-brand">Q5 · 관심 분야</span>
        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            가장 관심 있는 가상자산 분야를 모두 선택해 주세요.
          </h2>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="(opt, key) in THEME_LABELS"
            :key="key"
            class="text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-0.5"
            :class="
              cryptoThemes.includes(key as CryptoTheme)
                ? 'border-brand bg-brand-bg'
                : 'border-surface-border bg-white'
            "
            @click="toggleTheme(key as CryptoTheme)"
          >
            <span
              class="text-base font-bold"
              :class="
                cryptoThemes.includes(key as CryptoTheme)
                  ? 'text-brand'
                  : 'text-text-primary'
              "
              >{{ opt.title }}</span
            >
            <span
              class="text-xs2"
              :class="
                cryptoThemes.includes(key as CryptoTheme)
                  ? 'text-brand-300'
                  : 'text-text-tertiary'
              "
              >{{ opt.sub }}</span
            >
          </button>
        </div>
      </div>

      <!-- ── Step 8: 매매 방식 & 잔돈 규칙 ── -->
      <div v-else-if="step === 8" class="px-6 pt-6 flex flex-col gap-7">
        <span class="text-sm font-semibold text-brand">잔돈 설정</span>

        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            잔돈 규칙과 매매<br />방식을 설정하세요
          </h2>
          <p class="text-base text-text-tertiary leading-relaxed">
            모든 결제에 공통으로 적용돼요. 카테고리별 세부 설정은 가입 후 설정
            화면에서 바꿀 수 있어요.
          </p>
        </div>

        <!-- ── 잔돈 적립 방식 ── -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">
            잔돈 적립 방식
          </p>

          <!-- 방식 토글 -->
          <div class="bg-surface-alt rounded-2xl p-1 flex gap-1">
            <button
              class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              :class="
                ruleMode === 'ROUND_UP'
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-tertiary'
              "
              @click="ruleMode = 'ROUND_UP'"
            >
              올림 잔돈 적립
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              :class="
                ruleMode === 'PERCENT'
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-tertiary'
              "
              @click="ruleMode = 'PERCENT'"
            >
              비율 잔돈 적립
            </button>
          </div>

          <!-- 슬라이더 값 카드 -->
          <div
            class="bg-white border border-surface-border rounded-2xl px-5 py-5 flex flex-col gap-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-tertiary">
                {{ ruleMode === 'ROUND_UP' ? '적립 단위' : '적립 비율' }}
              </span>
              <span class="text-lg font-bold text-text-primary">{{
                ruleValueLabel
              }}</span>
            </div>
            <p class="text-xs text-text-tertiary">{{ ruleDescription }}</p>

            <!-- 단계형 슬라이더 -->
            <input
              v-model.number="activeIndex"
              type="range"
              min="0"
              :max="activeOptions.length - 1"
              step="1"
              class="tikkle-range w-full mt-1"
              :style="sliderFillStyle"
            />

            <!-- 눈금 라벨 -->
            <div class="flex justify-between">
              <span
                v-for="(opt, i) in activeOptions"
                :key="opt.value"
                class="text-xs transition-colors"
                :class="
                  activeIndex === i
                    ? 'text-brand font-semibold'
                    : 'text-text-disabled'
                "
                >{{ opt.tick }}</span
              >
            </div>
          </div>

          <p class="text-xs2 text-text-tertiary leading-relaxed">
            ※ 5,000원 미만의 잔돈이 발생한 경우에는 투자가 진행되지 않습니다.
          </p>
        </div>

        <!-- ── 매매 방식 ── -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">매매 방식</p>
          <div class="bg-surface-alt rounded-2xl p-1 flex gap-1">
            <button
              class="flex-1 py-2.5 rounded-xl flex flex-col items-center gap-0.5 transition-all"
              :class="
                prefs.executionMode === 'AUTO' ? 'bg-white shadow-sm' : ''
              "
              @click="prefs.executionMode = 'AUTO'"
            >
              <span
                class="text-sm font-semibold"
                :class="
                  prefs.executionMode === 'AUTO'
                    ? 'text-text-primary'
                    : 'text-text-tertiary'
                "
                >자동 매매</span
              >
              <span class="text-xs2 text-text-tertiary"
                >AI로 잔돈 자동 투자</span
              >
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl flex flex-col items-center gap-0.5 transition-all"
              :class="
                prefs.executionMode === 'MANUAL' ? 'bg-white shadow-sm' : ''
              "
              @click="prefs.executionMode = 'MANUAL'"
            >
              <span
                class="text-sm font-semibold"
                :class="
                  prefs.executionMode === 'MANUAL'
                    ? 'text-text-primary'
                    : 'text-text-tertiary'
                "
                >수동 매매</span
              >
              <span class="text-xs2 text-text-tertiary"
                >AI 추천 코인 구매 여부 결정</span
              >
            </button>
          </div>
        </div>

        <!-- Error message -->
        <p
          v-if="errorMsg"
          role="alert"
          class="text-sm text-danger text-center px-2"
        >
          {{ errorMsg }}
        </p>
      </div>
    </div>

    <!-- Sticky bottom navigation -->
    <div
      class="fixed bottom-0 left-0 right-0 bg-surface px-6 pt-3 pb-5 flex flex-col gap-2 max-w-mobile mx-auto"
    >
      <!-- Main CTA -->
      <button
        v-if="step < TOTAL_STEPS"
        class="w-full py-4 rounded-xl text-md font-semibold text-white transition-colors"
        :class="
          canProceed ? 'bg-brand active:bg-brand-hover' : 'bg-text-disabled'
        "
        :disabled="!canProceed"
        @click="goNext"
      >
        다음
      </button>
      <button
        v-else
        class="w-full py-4 rounded-xl text-md font-semibold text-white transition-colors flex items-center justify-center gap-2"
        :class="
          isLoading ? 'bg-text-disabled' : 'bg-brand active:bg-brand-hover'
        "
        :disabled="isLoading"
        @click="handleSubmit"
      >
        <span
          v-if="isLoading"
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        {{ isLoading ? '저장 중...' : '시작하기' }}
      </button>

      <!-- Back button (steps 2+) -->
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

<style scoped>
/* 단계형 올림/비율 슬라이더 — Figma range 스타일 */
.tikkle-range {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 9999px;
  outline: none;
  cursor: pointer;
}
.tikkle-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  margin-top: -8px; /* center the 22px thumb on the 6px track */
  border-radius: 9999px;
  background: #0051ff;
  border: 3px solid #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.tikkle-range::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: #0051ff;
  border: 3px solid #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.tikkle-range::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 9999px;
  background: transparent; /* fill comes from the element's inline gradient */
}
.tikkle-range::-moz-range-track {
  height: 6px;
  border-radius: 9999px;
  background: transparent;
}
</style>
