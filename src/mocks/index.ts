import type {
  UserProfile,
  Transaction,
  PaymentSummary,
  PortfolioSummary,
  StockRecommendation,
} from '@/types'

// Helper: generate an ISO string relative to now
function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString()
}
function minutesFromNow(m: number): string {
  return new Date(Date.now() + m * 60_000).toISOString()
}

export const mockUser: UserProfile = {
  id: 'user-001',
  name: '티끌 사용자',
  risk_type: 'NEUTRAL',
  rule: 'UNDER_1000',
  is_auto: true,
  kis_account_number: '50123456789',
  onboarding_completed: true, // set to false to test the onboarding flow
}

export const mockTransactions: Transaction[] = [
  {
    id: 'tx-001',
    merchant: '스타벅스 강남점',
    amount: 6500,
    round_up_amount: 500,
    category: '카페',
    status: 'INVESTED',
    created_at: '2026-05-31T09:14:00Z',
  },
  {
    id: 'tx-002',
    merchant: 'GS25 역삼점',
    amount: 3200,
    round_up_amount: 800,
    category: '편의점',
    status: 'PENDING',
    created_at: new Date(Date.now() - 1 * 3_600_000).toISOString(), // 1h ago
    expired_at: hoursFromNow(23),                                    // expires in ~23h (hours display)
  },
  {
    id: 'tx-003',
    merchant: '배달의민족',
    amount: 18500,
    round_up_amount: 500,
    category: '배달',
    status: 'INVESTED',
    created_at: '2026-05-30T19:22:00Z',
  },
  {
    id: 'tx-004',
    merchant: '올리브영 홍대점',
    amount: 42300,
    round_up_amount: 700,
    category: '쇼핑',
    status: 'CANCELED',
    created_at: '2026-05-29T15:05:00Z',
  },
  {
    id: 'tx-005',
    merchant: '맥도날드 신촌점',
    amount: 8900,
    round_up_amount: 100,
    category: '식당',
    status: 'PENDING',
    created_at: new Date(Date.now() - 23.5 * 3_600_000).toISOString(), // ~23.5h ago
    expired_at: minutesFromNow(30),                                     // expires in 30min (minutes display, red)
  },
  {
    id: 'tx-006',
    merchant: '버거킹 홍대점',
    amount: 12400,
    round_up_amount: 600,
    category: '식음료',
    status: 'PENDING',
    created_at: new Date(Date.now() - 25 * 3_600_000).toISOString(),   // 25h ago
    expired_at: hoursFromNow(-1),                                       // expired 1h ago (만료됨)
  },
]

export const mockPaymentSummary: PaymentSummary = {
  total_payment: 1_240_000,
  monthly_payment: 320_000,
  total_invested_change: 48_500,
  monthly_invested: 12_300,
  total_uninvested: 9_200,
  monthly_uninvested: 2_800,
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

export const mockStockRecommendations: StockRecommendation[] = [
  {
    ticker: 'BTC',
    name: '비트코인',
    reason: '현물 ETF 자금 유입이 이어지며 기관 매수세가 강해지고 있어요',
    category: '메이저',
  },
  {
    ticker: 'ETH',
    name: '이더리움',
    reason: '스테이킹 수요와 L2 생태계 확장으로 활용도가 높아지고 있어요',
    category: '메이저',
  },
  {
    ticker: 'SOL',
    name: '솔라나',
    reason: '빠른 처리 속도와 디파이·NFT 생태계 성장으로 거래가 늘고 있어요',
    category: '알트코인',
  },
]
