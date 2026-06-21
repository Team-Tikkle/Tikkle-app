import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AxiosError } from 'axios'
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
  CategoryRule,
  OnboardingRequest,
} from '@/types'

// Business error code → Korean UI message
const ERROR_MESSAGES: Record<string, string> = {
  'COMMON-002':      '잘못된 입력값입니다. 카드 번호 4자리 혹은 7개 카테고리 규칙 설정을 확인해 주세요.',
  'ONBOARDING-001':  '이미 온보딩 등록을 완료한 사용자입니다.',
  'ONBOARDING-002':  '중복된 카테고리 규칙이 포함되어 있습니다.',
  'USER-001':        '사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.',
}

// The API requires exactly 7 CategoryRule entries. These defaults are applied
// until the user explicitly configures per-category rules in the flow.
const DEFAULT_CATEGORY_RULES: CategoryRule[] = [
  { category: 'CAFE',     ruleType: 'ROUND_UP_10000' },
  { category: 'MART',     ruleType: 'ROUND_UP_10000' },
  { category: 'FOOD',     ruleType: 'ROUND_UP_10000' },
  { category: 'SHOPPING', ruleType: 'ROUND_UP_10000' },
  { category: 'TRAFFIC',  ruleType: 'ROUND_UP_10000' },
  { category: 'CULTURE',  ruleType: 'ROUND_UP_10000' },
  { category: 'ETC',      ruleType: 'ROUND_UP_10000' },
]

export const useOnboardingStore = defineStore('onboarding', () => {

  // ── Step 1 (Survey): investment profile ──
  // riskTolerance is the canonical API value set by the new OnboardingView.
  const riskTolerance = ref<RiskTolerance>('MODERATE')
  const executionMode = ref<ExecutionMode>('AUTO')

  // Investment preference fields — defaulted here; future survey steps
  // can update these via setPreferences() before submitOnboarding() is called.
  const investmentTerm      = ref<InvestmentTerm>('LONG_TERM')
  const investmentStyle     = ref<InvestmentStyle>('VALUE')
  const preferredTheme      = ref<PreferredTheme>('NONE')
  const stockCapPreference  = ref<StockCapPref>('BLUE_CHIP')
  const marketPreference    = ref<MarketPreference>('DOMESTIC')
  const esgFocus            = ref<EsgFocus>('NONE')
  const sinIndustryFilter   = ref<SinIndustryFilter>('NONE')
  const returnPreference    = ref<ReturnPreference>('GROWTH')
  const diversificationType = ref<DiversificationType>('DIVERSIFIED')

  // ── Step 2 (ApiKey): KIS credentials + card info ──
  const kisAppKey         = ref('')
  const kisAppSecret      = ref('')
  const kisAccountNum     = ref('')
  const targetCardCompany = ref('')
  const targetCardLast4   = ref('')   // must be exactly 4 digits

  // ── Category rules (exactly 7) ──
  const categoryRules = ref<CategoryRule[]>([...DEFAULT_CATEGORY_RULES])

  // ── Actions ──

  // setPreferences — used by the new consolidated OnboardingView (all 9 axes).
  // Accepts RiskTolerance directly so no reverse-mapping is needed.
  function setPreferences(params: {
    riskTolerance:       RiskTolerance
    investmentTerm:      InvestmentTerm
    investmentStyle:     InvestmentStyle
    preferredTheme:      PreferredTheme
    stockCapPreference:  StockCapPref
    marketPreference:    MarketPreference
    esgFocus:            EsgFocus
    sinIndustryFilter:   SinIndustryFilter
    returnPreference:    ReturnPreference
    diversificationType: DiversificationType
    executionMode:       ExecutionMode
  }) {
    riskTolerance.value      = params.riskTolerance
    investmentTerm.value     = params.investmentTerm
    investmentStyle.value    = params.investmentStyle
    preferredTheme.value     = params.preferredTheme
    stockCapPreference.value = params.stockCapPreference
    marketPreference.value   = params.marketPreference
    esgFocus.value           = params.esgFocus
    sinIndustryFilter.value  = params.sinIndustryFilter
    returnPreference.value   = params.returnPreference
    diversificationType.value = params.diversificationType
    executionMode.value      = params.executionMode
  }

  function setCredentials(params: {
    kisAppKey: string
    kisAppSecret: string
    kisAccountNum: string
    targetCardCompany: string
    targetCardLast4: string
  }) {
    kisAppKey.value         = params.kisAppKey
    kisAppSecret.value      = params.kisAppSecret
    kisAccountNum.value     = params.kisAccountNum
    targetCardCompany.value = params.targetCardCompany
    targetCardLast4.value   = params.targetCardLast4
  }

  function setCategoryRules(rules: CategoryRule[]) {
    categoryRules.value = rules
  }

  // ── POST /api/onboarding ──
  // Assembles the full OnboardingRequest from stored state, dispatches it,
  // and throws a localized Error for any business error code so callers can
  // display the message directly in the UI.
  async function submitOnboarding(): Promise<void> {
    const payload: OnboardingRequest = {
      kisAppKey:           kisAppKey.value,
      kisAppSecret:        kisAppSecret.value,
      kisAccountNum:       kisAccountNum.value,
      targetCardCompany:   targetCardCompany.value,
      targetCardLast4:     targetCardLast4.value,
      riskTolerance:       riskTolerance.value,
      investmentTerm:      investmentTerm.value,
      investmentStyle:     investmentStyle.value,
      preferredTheme:      preferredTheme.value,
      stockCapPreference:  stockCapPreference.value,
      marketPreference:    marketPreference.value,
      esgFocus:            esgFocus.value,
      sinIndustryFilter:   sinIndustryFilter.value,
      returnPreference:    returnPreference.value,
      diversificationType: diversificationType.value,
      executionMode:       executionMode.value,
      categoryRules:       categoryRules.value,
    }

    const { default: api } = await import('@/utils/api')

    try {
      await api.post<{ code: string; message: string; data: null }>(
        '/api/onboarding',
        payload,
      )
      // HTTP 201 + code === 'SUCCESS' — caller handles navigation & store update
    } catch (err) {
      // Extract backend business error code from the response body
      const axiosErr = err as AxiosError<{ code?: string; message?: string }>
      const code = axiosErr.response?.data?.code

      if (code && ERROR_MESSAGES[code]) {
        throw new Error(ERROR_MESSAGES[code])
      }

      // Re-throw unknown network/server errors as-is
      throw err
    }
  }

  return {
    // state (read-only from outside — mutations go through setters)
    riskTolerance,
    executionMode,
    kisAppKey,
    kisAppSecret,
    kisAccountNum,
    targetCardCompany,
    targetCardLast4,
    investmentTerm,
    investmentStyle,
    preferredTheme,
    stockCapPreference,
    marketPreference,
    esgFocus,
    sinIndustryFilter,
    returnPreference,
    diversificationType,
    categoryRules,
    // actions
    setPreferences,
    setCredentials,
    setCategoryRules,
    submitOnboarding,
  }
})
