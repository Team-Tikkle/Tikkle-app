import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AxiosError } from 'axios'
import type { CategoryRule, CategoryType, ExecutionMode } from '@/types'

export interface SettingsData {
  executionMode: ExecutionMode
  spareChangeRules: CategoryRule[]
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
  const executionMode   = ref<ExecutionMode>('AUTO')
  const spareChangeRules = ref<CategoryRule[]>([])

  // GET /api/settings
  // 현재 매매 방식과 전체 카테고리 잔돈 규칙을 조회한다.
  // 미설정 카테고리는 서버가 NONE으로 반환한다.
  async function fetchSettings(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    try {
      const { data: envelope } = await api.get<{
        code: string
        message: string
        data: SettingsData
      }>('/api/settings')
      executionMode.value    = envelope.data.executionMode
      spareChangeRules.value = envelope.data.spareChangeRules
    } catch (err) {
      mapError(err)
    }
  }

  // PATCH /api/settings/execution-mode
  // 매매 방식을 변경한다. 성공 시 로컬 상태도 즉시 반영한다.
  async function updateExecutionMode(mode: ExecutionMode): Promise<void> {
    const { default: api } = await import('@/utils/api')
    try {
      await api.patch('/api/settings/execution-mode', { executionMode: mode })
      executionMode.value = mode
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

  // PATCH /api/settings/linked-account
  // KIS 증권사 계정 정보(앱 키·시크릿키·계좌번호)를 변경한다.
  async function updateLinkedAccount(params: {
    kisAppKey: string
    kisAppSecret: string
    kisAccountNum: string
  }): Promise<void> {
    const { default: api } = await import('@/utils/api')
    try {
      await api.patch('/api/settings/linked-account', params)
    } catch (err) {
      mapError(err)
    }
  }

  return {
    executionMode,
    spareChangeRules,
    fetchSettings,
    updateExecutionMode,
    updateSpareChangeRules,
    updateLinkedAccount,
  }
})
