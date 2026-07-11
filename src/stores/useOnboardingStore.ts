import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AxiosError } from 'axios'
import type {
  RiskTolerance,
  TrendSensitivity,
  CryptoTheme,
  DiversificationType,
  MemeAcceptance,
  TwoFactorProvider,
  CategoryRule,
} from '@/types'

const ERROR_MESSAGES: Record<string, string> = {
  'COMMON-002':        '잘못된 입력값입니다.',
  'USER-001':          '사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.',
  'UPBIT_INVALID_KEY': '업비트 API 키가 유효하지 않거나 필수 권한이 부족합니다. 키를 다시 확인해 주세요.',
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

  // ── 투자 성향 설문 (Q1~Q5) ──
  const riskTolerance       = ref<RiskTolerance>('HOLD')               // Q1. 하락장 방어 심리
  const trendSensitivity    = ref<TrendSensitivity>('PARTIAL_TREND')   // Q2. 트렌드 민감도
  const cryptoThemes        = ref<CryptoTheme[]>([])                   // Q3. 관심 테마 (다중)
  const diversificationType = ref<DiversificationType>('BALANCED')     // Q4. 분산도
  const memeAcceptance      = ref<MemeAcceptance>('NONE')              // Q5. 밈 코인 수용도

  // ── 업비트 Open API 키 + 결제 카드 + 2차 인증 수단 ──
  const upbitAccessKey    = ref('')
  const upbitSecretKey    = ref('')
  const targetCardLast4   = ref('')                    // must be exactly 4 digits
  const twoFactorProvider = ref<TwoFactorProvider | ''>('')

  // ── Category rules (exactly 7) ──
  const categoryRules = ref<CategoryRule[]>([...DEFAULT_CATEGORY_RULES])

  // ── Actions ──

  // setPreferences — Q1~Q5 설문 결과를 한 번에 반영한다.
  function setPreferences(params: {
    riskTolerance:       RiskTolerance
    trendSensitivity:    TrendSensitivity
    cryptoThemes:        CryptoTheme[]
    diversificationType: DiversificationType
    memeAcceptance:      MemeAcceptance
  }) {
    riskTolerance.value       = params.riskTolerance
    trendSensitivity.value    = params.trendSensitivity
    cryptoThemes.value        = [...params.cryptoThemes]
    diversificationType.value = params.diversificationType
    memeAcceptance.value      = params.memeAcceptance
  }

  function setCredentials(params: {
    upbitAccessKey:    string
    upbitSecretKey:    string
    targetCardLast4:   string
    twoFactorProvider: TwoFactorProvider
  }) {
    upbitAccessKey.value    = params.upbitAccessKey
    upbitSecretKey.value    = params.upbitSecretKey
    targetCardLast4.value   = params.targetCardLast4
    twoFactorProvider.value = params.twoFactorProvider
  }

  function setCategoryRules(rules: CategoryRule[]) {
    categoryRules.value = rules
  }

  // 초기 설정을 3개의 PATCH로 분리 저장한다.
  // 1. PATCH /api/settings/profile  — 투자 성향
  // 2. PATCH /api/settings/kbank    — 케이뱅크 카드 + 2차 인증
  // 3. PATCH /api/settings/upbit    — 업비트 API 키 (키 유효성 실시간 검증)
  async function submitOnboarding(): Promise<void> {
    const { default: api } = await import('@/utils/api')

    function mapErr(err: unknown): never {
      const code = (err as AxiosError<{ code?: string }>).response?.data?.code
      throw new Error(code && ERROR_MESSAGES[code] ? ERROR_MESSAGES[code] : '설정 저장에 실패했습니다.')
    }

    // 1. 투자 성향
    try {
      await api.patch('/api/settings/profile', {
        riskTolerance:       riskTolerance.value,
        trendSensitivity:    trendSensitivity.value,
        cryptoThemes:        cryptoThemes.value,
        diversificationType: diversificationType.value,
        memeAcceptance:      memeAcceptance.value,
      })
    } catch (err) { mapErr(err) }

    // 2. 케이뱅크 카드 (step 1에서 이미 검증·저장됨 — 여기서 재호출 불필요)
    // 업비트 API 키는 온보딩 step 2에서 이미 검증·저장됨 — 여기서 재호출 불필요

    // 업비트 API 키는 온보딩 step 2에서 이미 검증·저장됨 — 여기서 재호출 불필요
  }

  return {
    // state (read-only from outside — mutations go through setters)
    riskTolerance,
    trendSensitivity,
    cryptoThemes,
    diversificationType,
    memeAcceptance,
    upbitAccessKey,
    upbitSecretKey,
    targetCardLast4,
    twoFactorProvider,
    categoryRules,
    // actions
    setPreferences,
    setCredentials,
    setCategoryRules,
    submitOnboarding,
  }
})
