import type {
  UserProfile,
  PortfolioSummary,
} from '@/types'

export const mockUser: UserProfile = {
  id: 'user-001',
  name: '티끌 사용자',
  risk_type: 'NEUTRAL',
  rule: 'UNDER_1000',
  is_auto: true,
  kis_account_number: '50123456789',
  onboarding_completed: true, // set to false to test the onboarding flow
}

export const mockPortfolioSummary: PortfolioSummary = {
  total_invested: 48_500,
  total_evaluated: 53_240,
  total_profit_loss: 4_740,
  profit_loss_rate: 9.77,
  holdings: [
    {
      ticker: 'BTC',
      name: '비트코인',
      shares: 0.0016,
      avg_buy_price: 88_000_000,
      current_price: 93_500_000,
      evaluated_amount: 149_600,
      profit_loss: 7_600,
      profit_loss_rate: 5.35,
      weight_percent: 45,
    },
    {
      ticker: 'ETH',
      name: '이더리움',
      shares: 0.04,
      avg_buy_price: 4_500_000,
      current_price: 4_680_000,
      evaluated_amount: 192_500,
      profit_loss: 7_500,
      profit_loss_rate: 4.05,
      weight_percent: 35,
    },
    {
      ticker: 'XRP',
      name: '리플',
      shares: 40,
      avg_buy_price: 3_200,
      current_price: 3_285,
      evaluated_amount: 131_400,
      profit_loss: 3_400,
      profit_loss_rate: 2.66,
      weight_percent: 20,
    },
  ],
}
