// User & Onboarding
export type RiskType = 'STABLE' | 'NEUTRAL' | 'AGGRESSIVE'
export type RoundUpRule = 'UNDER_1000' | 'UNDER_500' | 'UNDER_100'

// ── Onboarding API payload types (POST /api/onboarding) ──
export type RiskTolerance     = 'SAFE' | 'MODERATE' | 'AGGRESSIVE'
export type InvestmentTerm    = 'SHORT_TERM' | 'LONG_TERM'
export type InvestmentStyle   = 'VALUE' | 'MOMENTUM'
export type PreferredTheme    = 'TECH' | 'BIO' | 'SEMICONDUCTOR' | 'GREEN' | 'ENTERTAINMENT' | 'NONE'
export type StockCapPref      = 'BLUE_CHIP' | 'NEW_LISTING'
export type MarketPreference  = 'DOMESTIC' | 'FOREIGN' | 'BOTH'
export type EsgFocus          = 'NONE' | 'ESG_DRIVEN'
export type SinIndustryFilter = 'NONE' | 'WEAPON' | 'TOBACCO' | 'FOSSIL_FUEL'
export type ReturnPreference  = 'DIVIDEND' | 'GROWTH'
export type DiversificationType = 'CONCENTRATED' | 'DIVERSIFIED'
export type ExecutionMode     = 'AUTO' | 'MANUAL'

// Exactly 7 unique categories required by the backend
export type CategoryType = 'CAFE' | 'MART' | 'FOOD' | 'SHOPPING' | 'TRAFFIC' | 'CULTURE' | 'ETC'
export type RuleType =
  | 'ROUND_UP_10000' | 'ROUND_UP_50000'
  | 'PERCENT_5' | 'PERCENT_10' | 'PERCENT_20' | 'PERCENT_30'

export interface CategoryRule {
  category: CategoryType
  ruleType: RuleType
}

export interface OnboardingRequest {
  kisAppKey:           string
  kisAppSecret:        string
  kisAccountNum:       string
  targetCardCompany:   string
  targetCardLast4:     string       // exactly 4-digit numeric string
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
  categoryRules:       CategoryRule[] // length must be exactly 7
}

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
  press?: string            // publishing news outlet name
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
export interface GlossaryTerm {
  id: string
  term: string
  description: string
}

// Beginner article (GET /api/insights/articles, /api/insights/articles/{id})
// The list endpoint omits `body`; the detail endpoint includes it.
export interface InsightArticle {
  id: string
  title: string
  thumbnail_url: string
  published_at: string
  body?: string
}

// Curated recommended video (GET /api/insights/videos)
export interface RecommendedVideo {
  id: string
  title: string
  thumbnail_url: string
  video_url: string
  channel_name?: string
}

// Payment scraping (POST /api/payments — HMAC signed, no JWT)
export interface PaymentRequest {
  userId:          number   // unique user identifier
  cardCompany:     string   // named card issuer, e.g. "신한카드"
  cardNumberLast4: string   // last 4 digits of the card number
  merchant:        string   // merchant name from push notification
  amount:          number   // total payment amount in KRW
  transactionId:   string   // deterministic SHA-256 hex hash (idempotency key)
}

// 결제 1건 처리 결과의 행동 유형.
// 앞 2종은 로컬 푸시 발생 대상(투자 정보 유효), 뒤 IGNORE_* 3종은 무시 대상
// (ticker/stockName = null, spareChange = 0 — 파싱 말고 조기 종료).
// 코인은 24시간 거래되므로 예약 매매(SCHEDULED_*) 유형은 없다.
export type PaymentActionType =
  | 'ORDER_REQUESTED'        // 자동 → 즉시 매수 접수
  | 'NEED_APPROVAL'          // 수동 → 매수 제안
  | 'IGNORE_DUPLICATE'       // 중복 transactionId
  | 'IGNORE_CARD_MISMATCH'   // 등록된 대상 카드와 불일치
  | 'IGNORE_NO_SPARE_CHANGE' // 잔돈 0원

export interface PaymentResult {
  actionType:    PaymentActionType
  merchant:      string
  paymentAmount: number          // 결제 금액
  spareChange:   number          // 발생한 잔돈 (IGNORE_* 케이스는 0)
  ticker:        string | null   // 매수 종목 코드 (IGNORE_* 케이스는 null)
  stockName:     string | null   // 매수 종목명 (IGNORE_* 케이스는 null)
}

export interface PaymentResponse {
  code:    string   // "SUCCESS" | "COMMON-001" | "PAYMENT-001"
  message: string
  data:    PaymentResult
}

// AI Stock Recommendation
export interface StockRecommendation {
  ticker: string
  name: string
  reason: string
  category: string
}
