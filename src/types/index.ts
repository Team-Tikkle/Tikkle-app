// User & Onboarding
export type RiskType = 'STABLE' | 'NEUTRAL' | 'AGGRESSIVE'
export type RoundUpRule = 'UNDER_1000' | 'UNDER_500' | 'UNDER_100'

export interface UserProfile {
  id: string
  name: string              // display name returned by GET /api/users/me
  email?: string            // email returned by GET /api/users/me
  risk_type: RiskType
  rule: RoundUpRule
  is_auto: boolean
  kis_account_number?: string
  onboarding_completed: boolean
}

// Payments & Transactions
export type TransactionStatus = 'PENDING' | 'INVESTED' | 'CANCELED' | 'EXPIRED'

export interface Transaction {
  id: string
  merchant: string
  amount: number
  round_up_amount: number
  category: string
  status: TransactionStatus
  created_at: string
  expired_at?: string
}

export interface PaymentSummary {
  total_payment: number
  monthly_payment: number
  total_invested_change: number
  monthly_invested: number
  total_uninvested: number
  monthly_uninvested: number
}

// Portfolio & Investment
export interface StockHolding {
  ticker: string
  name: string
  shares: number
  avg_buy_price: number
  current_price: number
  evaluated_amount: number
  profit_loss: number
  profit_loss_rate: number
  weight_percent: number
}

export interface PortfolioSummary {
  total_invested: number
  total_evaluated: number
  total_profit_loss: number
  profit_loss_rate: number
  holdings: StockHolding[]
}

// News & Insights
export interface NewsArticle {
  id: string
  title: string
  summary: string
  thumbnail_url: string
  source_url: string
  published_at: string
}

export interface EducationContent {
  id: string
  title: string
  body: string
  target_risk_types: RiskType[]
  tags: string[]
}

// Category-specific round-up rule (overrides global rule per spending category)
export interface CategoryRoundUpRule {
  category: string
  type: 'fixed' | 'percent'
  value: number // unit in KRW if fixed (100 | 500 | 1000), percentage if percent (1-20)
}

// Investment glossary term (GET /api/insights/terms)
export interface InvestmentTerm {
  id: string
  term: string
  description: string
}

// Curated recommended video (GET /api/insights/videos)
export interface RecommendedVideo {
  id: string
  title: string
  thumbnail_url: string
  video_url: string
}

// AI Stock Recommendation
export interface StockRecommendation {
  ticker: string
  name: string
  reason: string
  category: string
}
