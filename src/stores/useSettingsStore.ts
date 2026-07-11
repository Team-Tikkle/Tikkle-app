import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AxiosError } from 'axios'
import { Preferences } from '@capacitor/preferences'
import type { CategoryRule, CategoryType } from '@/types'

export interface SettingsData {
  spareChangeRules: CategoryRule[]
  isInvestmentEnabled: boolean
  linkedAccount: {
    targetCardCompany: string
    targetCardLast4:   string
    twoFactorProvider: string
  } | null
  investmentProfile: {
    riskTolerance:       string
    trendSensitivity:    string
    cryptoThemes:        string[]
    diversificationType: string
    memeAcceptance:      string
  } | null
}

const ERROR_MESSAGES: Record<string, string> = {
  'COMMON-002':   '잘못된 입력값입니다.',
  'USER-001':     '사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.',
  'SETTINGS-001': '설정 정보를 찾을 수 없습니다.',
}

function mapError(err: unknown): never {
  const code = (err as AxiosError<{ code?: string }>).response?.data?.code
  throw new Error(code && ERROR_MESSAGES[code] ? ERROR_MESSAGES[code] : '설정 변경에 실패했습니다.')
}

export const useSettingsStore = defineStore('settings', () => {
  const spareChangeRules    = ref<CategoryRule[]>([])
  const isInvestmentEnabled = ref<boolean>(true)
  const linkedAccount       = ref<SettingsData['linkedAccount']>(null)

  // GET /api/settings
  // 전체 카테고리 잔돈 규칙을 조회한다. 미설정 카테고리는 서버가 NONE으로 반환한다.
  async function fetchSettings(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    try {
      const { data: envelope } = await api.get<{
        code: string
        message: string
        data: SettingsData
      }>('/api/settings')
      spareChangeRules.value    = envelope.data.spareChangeRules
      isInvestmentEnabled.value = envelope.data.isInvestmentEnabled
      linkedAccount.value       = envelope.data.linkedAccount
    } catch (err) {
      mapError(err)
    }
  }

  // PATCH /api/settings/spare-change-rules
  // 카테고리별 잔돈 규칙을 부분 갱신한다. NONE은 해당 카테고리 적립 비활성화.
  // rules 배열에 포함된 카테고리만 갱신되고 나머지는 서버에서 유지된다.
  async function updateSpareChangeRules(rules: { category: CategoryType; ruleType: string }[]): Promise<void> {
    const { default: api } = await import('@/utils/api')
    try {
      await api.patch('/api/settings/spare-change-rules', { rules })
      // 응답을 기다리지 않고 낙관적 업데이트 — 변경된 카테고리만 덮어쓴다.
      for (const updated of rules) {
        const existing = spareChangeRules.value.find(r => r.category === updated.category)
        if (existing) {
          existing.ruleType = updated.ruleType as CategoryRule['ruleType']
        } else {
          spareChangeRules.value.push(updated as CategoryRule)
        }
      }
    } catch (err) {
      mapError(err)
    }
  }

  // PATCH /api/settings/investment
  // 자동 투자 활성화 상태를 변경하고 CapacitorStorage에도 동기화한다.
  // Android NotificationListener가 이 값을 읽어 서버 전송 여부를 판단한다.
  async function updateInvestmentEnabled(enabled: boolean): Promise<void> {
    const { default: api } = await import('@/utils/api')
    try {
      await api.patch('/api/settings/investment', { isInvestmentEnabled: enabled })
      isInvestmentEnabled.value = enabled
      await Preferences.set({ key: 'isInvestmentEnabled', value: String(enabled) })
    } catch (err) {
      mapError(err)
    }
  }

  // PATCH /api/settings/kbank — 케이뱅크 카드 등록/수정
  async function updateKbank(params: {
    targetCardLast4: string
  }): Promise<void> {
    const { default: api } = await import('@/utils/api')
    try {
      await api.patch('/api/settings/kbank', params)
    } catch (err) {
      mapError(err)
    }
  }

  // PATCH /api/settings/upbit — 업비트 API 키 변경 (서버에서 권한 실시간 검증)
  async function updateUpbit(params: {
    upbitAccessKey:    string
    upbitSecretKey:    string
    twoFactorProvider: string
  }): Promise<void> {
    const { default: api } = await import('@/utils/api')
    try {
      await api.patch('/api/settings/upbit', params)
    } catch (err) {
      mapError(err)
    }
  }

  return {
    spareChangeRules,
    isInvestmentEnabled,
    linkedAccount,
    fetchSettings,
    updateSpareChangeRules,
    updateInvestmentEnabled,
    updateKbank,
    updateUpbit,
  }
})
