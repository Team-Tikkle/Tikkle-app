// User & Onboarding
export type RiskType = 'STABLE' | 'NEUTRAL' | 'AGGRESSIVE'
export type RoundUpRule = 'UNDER_1000' | 'UNDER_500' | 'UNDER_100'

// ── Onboarding API payload types (POST /api/onboarding) ──
// 코인 투자 성향 설문 Q1~Q5
export type RiskTolerance       = 'SELL_IMMEDIATELY' | 'HOLD' | 'BUY_MORE'        // Q1. 하락장 방어 심리
export type TrendSensitivity    = 'FUNDAMENTAL_ONLY' | 'PARTIAL_TREND' | 'FULL_TREND' // Q2. 트렌드 민감도
export type CryptoTheme         = 'LAYER_1' | 'DEFI' | 'AI' | 'WEB3_GAMING' | 'RWA' | 'MEME' // Q3. 관심 테마 (다중)
export type DiversificationType = 'CONCENTRATED' | 'BALANCED' | 'DIVERSIFIED'     // Q4. 포트폴리오 분산도
export type MemeAcceptance      = 'NONE' | 'SMALL' | 'ACTIVE'                     // Q5. 밈 코인 수용도
export type ExecutionMode       = 'AUTO' | 'MANUAL'                              // 매매 방식

// Exactly 7 unique categories required by the backend
export type CategoryType = 'CAFE' | 'MART' | 'FOOD' | 'SHOPPING' | 'TRAFFIC' | 'CULTURE' | 'ETC'
export type RuleType =
  | 'ROUND_UP_10000' | 'ROUND_UP_20000' | 'ROUND_UP_30000' | 'ROUND_UP_40000' | 'ROUND_UP_50000'
  | 'PERCENT_10' | 'PERCENT_15' | 'PERCENT_20' | 'PERCENT_25' | 'PERCENT_30'

export interface CategoryRule {
  category: CategoryType
  ruleType: RuleType
}

export interface OnboardingRequest {
  upbitAccessKey:      string
  upbitSecretKey:      string
  targetCardCompany:   string
  targetCardLast4:     string       // exactly 4-digit numeric string
  riskTolerance:       RiskTolerance
  trendSensitivity:    TrendSensitivity
  cryptoThemes:        CryptoTheme[]
  diversificationType: DiversificationType
  memeAcceptance:      MemeAcceptance
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

// ── Payment feed & dashboard (GET /api/payments, /api/payments/dashboard) ──
// These endpoints return camelCase fields straight from the backend.

// Status filter for the feed; mirrors the 결제 내역 tab. 'ALL' = no filter.
export type PaymentFeedStatus = 'ALL' | 'PENDING' | 'INVESTED' | 'CANCELED'

// One row in the paged payment feed.
export interface PaymentFeedItem {
  id:               number
  merchant:         string
  amount:           number
  roundUpAmount:    number
  category:         CategoryType
  status:           TransactionStatus
  expiredAt:        string  // ISO-8601, e.g. "2026-06-22T10:30:00"
  targetCoinMarket: string | null  // e.g. "KRW-BTC" (PENDING 상태에서만 존재)
  targetCoinName:   string | null  // e.g. "비트코인"
  createdAt:        string
}

// ── Spring Data Page envelope ──
export interface PageSort {
  empty:    boolean
  sorted:   boolean
  unsorted: boolean
}

export interface Pageable {
  offset:     number
  sort:       PageSort
  paged:      boolean
  pageNumber: number
  pageSize:   number
  unpaged:    boolean
}

export interface Page<T> {
  first:            boolean
  last:             boolean
  size:             number
  content:          T[]
  number:           number
  sort:             PageSort
  numberOfElements: number
  pageable:         Pageable
  empty:            boolean
}

// ── Dashboard (GET /api/payments/dashboard) ──
export interface CategorySpending {
  category: CategoryType
  amount:   number
}

export interface PaymentDashboard {
  totalPayment:        number  // 총 결제 금액
  totalInvestedChange: number  // 투자된 잔돈 합계
  totalUninvested:     number  // 미투자 잔돈 합계
  pendingCount:        number  // 대기 중 건수
  categorySpending:    CategorySpending[]
}

// Generic backend response envelope: { code, message, data }
export interface ApiEnvelope<T> {
  code:    string
  message: string
  data:    T
}

// Portfolio (GET /api/portfolios) — coin holdings combined with live Upbit prices
export interface PortfolioHolding {
  market:               string  // 페어 코드, e.g. "KRW-BTC"
  coinName:             string  // 코인명, e.g. "비트코인"
  quantity:             number  // 보유 수량
  averagePurchasePrice: number  // 평균 매입 단가
  principalAmount:      number  // 매입 원금
  currentPrice:         number  // 현재가 (실시간 시세)
  evaluationAmount:     number  // 평가 금액
}

export interface Portfolio {
  totalPrincipalAmount:  number   // 총 투자금
  totalEvaluationAmount: number   // 총 평가금 (= 총 자산)
  holdingMarketCodes:    string[] // 보유 코인 페어 코드 목록
  holdings:              PortfolioHolding[]
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
  paymentEventId:    number | null  // 승인/거부 대상 식별자 (NEED_APPROVAL 시 존재)
  actionType:        PaymentActionType
  cleanMerchantName: string         // 정제된 가맹점명
  paymentAmount:     number         // 결제 금액
  spareChange:       number         // 발생한 잔돈 (IGNORE_* 케이스는 0)
  market:            string | null  // 매수 종목 코드 (IGNORE_* 케이스는 null)
  coinName:          string | null  // 매수 종목명 (IGNORE_* 케이스는 null)
  executedPrice:     number | null  // 체결가 (ORDER_REQUESTED 시)
  executedVolume:    number | null  // 체결 수량 (ORDER_REQUESTED 시)
}

export interface PaymentResponse {
  code:    string   // "SUCCESS" | "COMMON-001" | "PAYMENT-001"
  message: string
  data:    PaymentResult
}
