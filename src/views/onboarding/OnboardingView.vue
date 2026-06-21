<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import type {
  RiskTolerance,
  InvestmentTerm,
  InvestmentStyle,
  PreferredTheme,
  StockCapPref,
  MarketPreference,
  EsgFocus,
  SinIndustryFilter,
  ReturnPreference,
  DiversificationType,
  ExecutionMode,
  CategoryType,
  RuleType,
  CategoryRule,
} from '@/types';

const router = useRouter();
const userStore = useUserStore();
const onboardingStore = useOnboardingStore();

// ── Step tracking ──
// 1: 투자 성향  2: 카테고리 규칙  3: 거래소·카드 연동
const step = ref(1);
const TOTAL_STEPS = 3;

// ── Step 1 state ──
const prefs = reactive({
  riskTolerance: 'MODERATE' as RiskTolerance,
  investmentTerm: 'LONG_TERM' as InvestmentTerm,
  investmentStyle: 'VALUE' as InvestmentStyle,
  preferredTheme: 'NONE' as PreferredTheme,
  stockCapPreference: 'BLUE_CHIP' as StockCapPref,
  marketPreference: 'DOMESTIC' as MarketPreference,
  esgFocus: 'NONE' as EsgFocus,
  sinIndustryFilter: 'NONE' as SinIndustryFilter,
  returnPreference: 'GROWTH' as ReturnPreference,
  diversificationType: 'DIVERSIFIED' as DiversificationType,
  executionMode: 'AUTO' as ExecutionMode,
});

// ── Step 2 state ──
const kisAppKey = ref('');
const kisAppSecret = ref('');
const cardCompany = ref('국민카드');
const cardLast4 = ref('');

const isCardLast4Valid = computed(() => /^\d{4}$/.test(cardLast4.value));

const isStep3Valid = computed(
  () =>
    kisAppKey.value.trim() &&
    kisAppSecret.value.trim() &&
    isCardLast4Valid.value,
);

// ── Step 2 state: 잔돈 규칙 ──
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

// 잔돈 적립 방식 — 6개 옵션을 한 화면에서 버튼으로 선택한다.
// value는 백엔드 RuleType과 1:1 대응.
const RULE_OPTIONS: { value: RuleType; label: string; desc: string }[] = [
  { value: 'ROUND_UP_10000', label: '1만원 올림', desc: '1만원 단위 올림 잔돈' },
  { value: 'ROUND_UP_50000', label: '5만원 올림', desc: '5만원 단위 올림 잔돈' },
  { value: 'PERCENT_5', label: '5%', desc: '결제액의 5%' },
  { value: 'PERCENT_10', label: '10%', desc: '결제액의 10%' },
  { value: 'PERCENT_20', label: '20%', desc: '결제액의 20%' },
  { value: 'PERCENT_30', label: '30%', desc: '결제액의 30%' },
];

// 제출 시 모든 카테고리에 일괄 적용할 규칙
const selectedRule = ref<RuleType>('ROUND_UP_10000');

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

// ── Submit (Step 3) ──
async function handleSubmit() {
  if (isLoading.value) return;
  isLoading.value = true;
  errorMsg.value = '';

  try {
    onboardingStore.setPreferences({ ...prefs });
    onboardingStore.setCredentials({
      kisAppKey: kisAppKey.value.trim(),
      kisAppSecret: kisAppSecret.value.trim(),
      kisAccountNum: '',
      targetCardCompany: cardCompany.value,
      targetCardLast4: cardLast4.value,
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

// ── Label maps ──
const RISK_LABELS: Record<RiskTolerance, string> = {
  SAFE: '안정형',
  MODERATE: '중립형',
  AGGRESSIVE: '공격형',
};
const TERM_LABELS: Record<InvestmentTerm, string> = {
  SHORT_TERM: '단기',
  LONG_TERM: '장기',
};
const STYLE_LABELS: Record<InvestmentStyle, string> = {
  VALUE: '가치투자',
  MOMENTUM: '모멘텀투자',
};
const THEME_LABELS: Record<PreferredTheme, string> = {
  TECH: '기술',
  BIO: '바이오',
  SEMICONDUCTOR: '반도체',
  GREEN: '친환경',
  ENTERTAINMENT: '엔터',
  NONE: '없음',
};
const CAP_LABELS: Record<StockCapPref, string> = {
  BLUE_CHIP: '대형주',
  NEW_LISTING: '신규상장',
};
const MARKET_LABELS: Record<MarketPreference, string> = {
  DOMESTIC: '국내',
  FOREIGN: '해외',
  BOTH: '국내+해외',
};
const ESG_LABELS: Record<EsgFocus, string> = {
  NONE: '없음',
  ESG_DRIVEN: 'ESG 중시',
};
const SIN_LABELS: Record<SinIndustryFilter, string> = {
  NONE: '필터 없음',
  WEAPON: '무기 제외',
  TOBACCO: '담배 제외',
  FOSSIL_FUEL: '화석연료 제외',
};
const RETURN_LABELS: Record<ReturnPreference, string> = {
  DIVIDEND: '배당',
  GROWTH: '성장',
};
const DIVERS_LABELS: Record<DiversificationType, string> = {
  CONCENTRATED: '집중투자',
  DIVERSIFIED: '분산투자',
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
      <!-- ── Step 1: 투자 성향 ── -->
      <div v-if="step === 1" class="px-6 pt-6 flex flex-col gap-6">
        <span class="text-sm font-semibold text-brand">투자 성향 설정</span>

        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            투자 성향을<br />알려주세요
          </h2>
          <p class="text-base text-text-tertiary leading-relaxed">
            9가지 항목으로 나에게 맞는 투자 전략을 만들어요.
          </p>
        </div>

        <!-- Risk Tolerance -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">위험 성향</p>
          <div class="flex gap-2">
            <button
              v-for="(label, key) in RISK_LABELS"
              :key="key"
              class="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
              :class="
                prefs.riskTolerance === key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-text-secondary border-surface-border'
              "
              @click="prefs.riskTolerance = key as RiskTolerance"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Investment Term -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">투자 기간</p>
          <div class="flex gap-2">
            <button
              v-for="(label, key) in TERM_LABELS"
              :key="key"
              class="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
              :class="
                prefs.investmentTerm === key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-text-secondary border-surface-border'
              "
              @click="prefs.investmentTerm = key as InvestmentTerm"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Investment Style -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">투자 스타일</p>
          <div class="flex gap-2">
            <button
              v-for="(label, key) in STYLE_LABELS"
              :key="key"
              class="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
              :class="
                prefs.investmentStyle === key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-text-secondary border-surface-border'
              "
              @click="prefs.investmentStyle = key as InvestmentStyle"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Preferred Theme -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">관심 테마</p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="(label, key) in THEME_LABELS"
              :key="key"
              class="py-3 rounded-xl text-sm font-semibold border transition-all"
              :class="
                prefs.preferredTheme === key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-text-secondary border-surface-border'
              "
              @click="prefs.preferredTheme = key as PreferredTheme"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Stock Cap Preference -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">
            선호 종목 규모
          </p>
          <div class="flex gap-2">
            <button
              v-for="(label, key) in CAP_LABELS"
              :key="key"
              class="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
              :class="
                prefs.stockCapPreference === key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-text-secondary border-surface-border'
              "
              @click="prefs.stockCapPreference = key as StockCapPref"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Market Preference -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">투자 시장</p>
          <div class="flex gap-2">
            <button
              v-for="(label, key) in MARKET_LABELS"
              :key="key"
              class="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
              :class="
                prefs.marketPreference === key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-text-secondary border-surface-border'
              "
              @click="prefs.marketPreference = key as MarketPreference"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- ESG Focus -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">ESG 투자</p>
          <div class="flex gap-2">
            <button
              v-for="(label, key) in ESG_LABELS"
              :key="key"
              class="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
              :class="
                prefs.esgFocus === key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-text-secondary border-surface-border'
              "
              @click="prefs.esgFocus = key as EsgFocus"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Sin Industry Filter -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">제외 산업</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="(label, key) in SIN_LABELS"
              :key="key"
              class="py-3 rounded-xl text-sm font-semibold border transition-all"
              :class="
                prefs.sinIndustryFilter === key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-text-secondary border-surface-border'
              "
              @click="prefs.sinIndustryFilter = key as SinIndustryFilter"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Return Preference -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">수익 방식</p>
          <div class="flex gap-2">
            <button
              v-for="(label, key) in RETURN_LABELS"
              :key="key"
              class="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
              :class="
                prefs.returnPreference === key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-text-secondary border-surface-border'
              "
              @click="prefs.returnPreference = key as ReturnPreference"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Diversification Type -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-secondary">분산 투자</p>
          <div class="flex gap-2">
            <button
              v-for="(label, key) in DIVERS_LABELS"
              :key="key"
              class="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
              :class="
                prefs.diversificationType === key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-text-secondary border-surface-border'
              "
              @click="prefs.diversificationType = key as DiversificationType"
            >
              {{ label }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Step 2: 잔돈 규칙 & 매매 방식 ── -->
      <div v-else-if="step === 2" class="px-6 pt-6 flex flex-col gap-7">
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

          <!-- 6개 규칙을 한 화면에서 버튼으로 선택 -->
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in RULE_OPTIONS"
              :key="opt.value"
              class="py-3 rounded-xl border transition-all flex flex-col items-center gap-0.5"
              :class="
                selectedRule === opt.value
                  ? 'bg-brand border-brand'
                  : 'bg-white border-surface-border'
              "
              @click="selectedRule = opt.value"
            >
              <span
                class="text-sm font-semibold"
                :class="
                  selectedRule === opt.value
                    ? 'text-white'
                    : 'text-text-secondary'
                "
                >{{ opt.label }}</span
              >
              <span
                class="text-xs2"
                :class="
                  selectedRule === opt.value
                    ? 'text-white/80'
                    : 'text-text-tertiary'
                "
                >{{ opt.desc }}</span
              >
            </button>
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
      </div>

      <!-- ── Step 3: 거래소·카드 연동 ── -->
      <div v-else-if="step === 3" class="px-6 pt-6 flex flex-col gap-6">
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
              v-model="kisAppKey"
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
              v-model="kisAppSecret"
              type="password"
              placeholder="Secret Key를 붙여넣으세요"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>

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
        class="w-full py-4 rounded-xl text-md font-semibold text-white bg-brand active:bg-brand-hover transition-colors"
        :disabled="step === 3 && !isStep3Valid"
        :class="
          step === 3 && !isStep3Valid
            ? 'bg-text-disabled'
            : 'bg-brand active:bg-brand-hover'
        "
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
