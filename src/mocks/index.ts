import type { UserProfile } from '@/types'

export const mockUser: UserProfile = {
  id: 'user-001',
  name: '티끌 사용자',
  risk_type: 'NEUTRAL',
  rule: 'UNDER_1000',
  is_auto: true,
  kis_account_number: '50123456789',
  hasInvestmentProfile: true,
  hasKbankAccount: true,
  hasUpbitKey: true,
}
