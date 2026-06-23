import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AxiosError } from 'axios'
import type {
  RiskTolerance,
  TrendSensitivity,
  CryptoTheme,
  DiversificationType,
  MemeAcceptance,
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

  // ── 투자 성향 설문 (Q1~Q5) + 매매 방식 ──
  const riskTolerance       = ref<RiskTolerance>('HOLD')               // Q1. 하락장 방어 심리
  const trendSensitivity    = ref<TrendSensitivity>('PARTIAL_TREND')   // Q2. 트렌드 민감도
  const cryptoThemes        = ref<CryptoTheme[]>([])                   // Q3. 관심 테마 (다중)
  const diversificationType = ref<DiversificationType>('BALANCED')     // Q4. 분산도
  const memeAcceptance      = ref<MemeAcceptance>('NONE')              // Q5. 밈 코인 수용도
  const executionMode       = ref<ExecutionMode>('AUTO')              // 매매 방식

  // ── 업비트 Open API 키 + 결제 카드 ──
  const upbitAccessKey    = ref('')
  const upbitSecretKey    = ref('')
  const targetCardCompany = ref('')
  const targetCardLast4   = ref('')   // must be exactly 4 digits

  // ── Category rules (exactly 7) ──
  const categoryRules = ref<CategoryRule[]>([...DEFAULT_CATEGORY_RULES])

  // ── Actions ──

  // setPreferences — Q1~Q5 설문 결과 + 매매 방식을 한 번에 반영한다.
  function setPreferences(params: {
    riskTolerance:       RiskTolerance
    trendSensitivity:    TrendSensitivity
    cryptoThemes:        CryptoTheme[]
    diversificationType: DiversificationType
    memeAcceptance:      MemeAcceptance
    executionMode:       ExecutionMode
  }) {
    riskTolerance.value       = params.riskTolerance
    trendSensitivity.value    = params.trendSensitivity
    cryptoThemes.value        = [...params.cryptoThemes]
    diversificationType.value = params.diversificationType
    memeAcceptance.value      = params.memeAcceptance
    executionMode.value       = params.executionMode
  }

  function setCredentials(params: {
    upbitAccessKey: string
    upbitSecretKey: string
    targetCardCompany: string
    targetCardLast4: string
  }) {
    upbitAccessKey.value    = params.upbitAccessKey
    upbitSecretKey.value    = params.upbitSecretKey
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
      upbitAccessKey:      upbitAccessKey.value,
      upbitSecretKey:      upbitSecretKey.value,
      targetCardCompany:   targetCardCompany.value,
      targetCardLast4:     targetCardLast4.value,
      riskTolerance:       riskTolerance.value,
      trendSensitivity:    trendSensitivity.value,
      cryptoThemes:        cryptoThemes.value,
      diversificationType: diversificationType.value,
      memeAcceptance:      memeAcceptance.value,
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
    trendSensitivity,
    cryptoThemes,
    diversificationType,
    memeAcceptance,
    executionMode,
    upbitAccessKey,
    upbitSecretKey,
    targetCardCompany,
    targetCardLast4,
    categoryRules,
    // actions
    setPreferences,
    setCredentials,
    setCategoryRules,
    submitOnboarding,
  }
})
