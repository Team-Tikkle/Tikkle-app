import type {
  UserProfile,
  Transaction,
  PaymentSummary,
  PortfolioSummary,
  NewsArticle,
  EducationContent,
  StockRecommendation,
} from '@/types'

export const mockUser: UserProfile = {
  id: 'user-001',
  risk_type: 'NEUTRAL',
  rule: 'UNDER_1000',
  is_auto: true,
  kis_account_number: '50123456789',
  onboarding_completed: false,
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
    created_at: '2026-05-31T11:30:00Z',
    expired_at: '2026-06-01T11:30:00Z',
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
    created_at: '2026-06-01T08:45:00Z',
    expired_at: '2026-06-02T08:45:00Z',
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
      ticker: '005930',
      name: '삼성전자',
      shares: 2,
      avg_buy_price: 71_000,
      current_price: 74_800,
      evaluated_amount: 149_600,
      profit_loss: 7_600,
      profit_loss_rate: 5.35,
      weight_percent: 45,
    },
    {
      ticker: '035420',
      name: 'NAVER',
      shares: 1,
      avg_buy_price: 185_000,
      current_price: 192_500,
      evaluated_amount: 192_500,
      profit_loss: 7_500,
      profit_loss_rate: 4.05,
      weight_percent: 35,
    },
    {
      ticker: '000660',
      name: 'SK하이닉스',
      shares: 1,
      avg_buy_price: 128_000,
      current_price: 131_400,
      evaluated_amount: 131_400,
      profit_loss: 3_400,
      profit_loss_rate: 2.66,
      weight_percent: 20,
    },
  ],
}

export const mockNewsArticles: NewsArticle[] = [
  {
    id: 'news-001',
    title: '반도체 업종 강세 이어져…삼성전자·SK하이닉스 동반 상승',
    summary: 'AI 수요 증가에 힘입어 반도체 대형주가 나란히 52주 신고가에 근접했습니다.',
    thumbnail_url: 'https://placehold.co/400x200/4F46E5/white?text=반도체',
    source_url: '#',
    published_at: '2026-06-01T06:00:00Z',
  },
  {
    id: 'news-002',
    title: '한국은행, 기준금리 동결…시장 예상에 부합',
    summary: '한국은행 금통위가 기준금리를 3.50%로 동결하며 관망세를 유지했습니다.',
    thumbnail_url: 'https://placehold.co/400x200/0EA5E9/white?text=금리',
    source_url: '#',
    published_at: '2026-05-31T10:30:00Z',
  },
  {
    id: 'news-003',
    title: 'NAVER, AI 검색 고도화로 광고 매출 반등 기대',
    summary: '네이버가 생성형 AI 기반 검색 서비스를 강화하며 광고 시장 회복을 이끌 전망입니다.',
    thumbnail_url: 'https://placehold.co/400x200/10B981/white?text=NAVER',
    source_url: '#',
    published_at: '2026-05-30T14:00:00Z',
  },
]

export const mockEducationContent: EducationContent[] = [
  {
    id: 'edu-001',
    title: '분산 투자란 무엇인가요?',
    body: '여러 종목에 나눠 투자해 위험을 줄이는 전략입니다. 한 종목이 하락해도 다른 종목이 손실을 상쇄할 수 있어요.',
    target_risk_types: ['STABLE', 'NEUTRAL'],
    tags: ['기초', '리스크관리'],
  },
  {
    id: 'edu-002',
    title: 'PER(주가수익비율)이란?',
    body: '주가를 주당순이익(EPS)으로 나눈 값으로, 기업의 이익 대비 주가 수준을 나타냅니다. 낮을수록 저평가 가능성이 있어요.',
    target_risk_types: ['NEUTRAL', 'AGGRESSIVE'],
    tags: ['지표', '가치투자'],
  },
  {
    id: 'edu-003',
    title: '적립식 투자의 힘 — 코스트 에버리징',
    body: '매달 일정 금액을 꾸준히 투자하면 평균 매수 단가를 낮출 수 있어요. 티끌모아 태산 전략의 핵심입니다.',
    target_risk_types: ['STABLE', 'NEUTRAL', 'AGGRESSIVE'],
    tags: ['기초', '전략'],
  },
]

export const mockStockRecommendations: StockRecommendation[] = [
  {
    ticker: '005930',
    name: '삼성전자',
    reason: 'HBM 수요 증가와 파운드리 회복으로 하반기 실적 개선 기대',
    category: '반도체',
  },
  {
    ticker: '035420',
    name: 'NAVER',
    reason: 'AI 검색 전환 속도가 빠르며 광고 회복 사이클 진입 중',
    category: 'IT/플랫폼',
  },
  {
    ticker: '373220',
    name: 'LG에너지솔루션',
    reason: '북미 전기차 배터리 수요 회복에 따른 수주 모멘텀 강화',
    category: '2차전지',
  },
]
