/**
 * 데모/스크린샷용 목 데이터.
 *
 * VITE_USE_MOCK=true 일 때만 쓰인다. 로그인 우회(VITE_SKIP_AUTH)와는 별개라,
 * 실제 계정으로 로그인한 상태에서도 화면 데이터만 목으로 바꿔 볼 수 있다.
 * false 또는 미설정이면 이 모듈은 참조되지 않고 API 경로만 탄다.
 *
 * 보유 코인의 매입 단가는 2026-08-21 기준 업비트 실시세 근처로 잡아,
 * 실시간 시세가 붙었을 때 손익이 자연스럽게 보이도록 했다(수익·손실 혼재).
 */
import type { PaymentDashboard, PaymentFeedItem, Portfolio } from '@/types'

// 프로덕션 빌드(`vite build`, MODE='production')에서는 플래그와 무관하게 강제로 꺼진다.
// MODE 비교는 빌드 시 리터럴로 치환되므로 아래 분기와 목 데이터가 통째로
// 트리셰이킹돼 번들에 남지 않는다.
//
// 실기기 데모 빌드가 필요하면 별도 모드를 쓴다 — `vite build --mode demo`
// (+ .env.demo 에 VITE_USE_MOCK=true). 운영 빌드는 그대로 안전하다.
const IS_PROD_BUILD = import.meta.env.MODE === 'production'

export const USE_MOCK = !IS_PROD_BUILD && import.meta.env.VITE_USE_MOCK === 'true'

if (USE_MOCK) {
  console.warn('[mocks] 목 데이터 모드입니다 — 홈 보유자산·결제 내역이 예시 데이터로 대체됩니다. (VITE_USE_MOCK=false 로 끄기)')
}

// ── 홈: 보유 자산 ────────────────────────────────────────────────────────────
export const mockPortfolio: Portfolio = {
  totalPrincipalAmount: 158_340,
  holdingMarketCodes: [
    'KRW-BTC', 'KRW-ETH', 'KRW-SOL', 'KRW-XRP', 'KRW-DOGE', 'KRW-ADA', 'KRW-LINK',
  ],
  holdings: [
    // 원화잔액 — 시세가 없는 현금 항목(화면 최상단에 별도 표시)
    { market: 'KRW',      coinName: '원화',     quantity: 3_240,       averagePurchasePrice: 1,          principalAmount: 3_240 },
    { market: 'KRW-BTC',  coinName: '비트코인',  quantity: 0.00049274,  averagePurchasePrice: 96_400_000, principalAmount: 47_500 },
    { market: 'KRW-ETH',  coinName: '이더리움',  quantity: 0.01158501,  averagePurchasePrice: 3_470_000,  principalAmount: 40_200 },
    { market: 'KRW-SOL',  coinName: '솔라나',    quantity: 0.19207048,  averagePurchasePrice: 113_500,    principalAmount: 21_800 },
    { market: 'KRW-XRP',  coinName: '리플',      quantity: 10.18372703, averagePurchasePrice: 1_905,      principalAmount: 19_400 },
    { market: 'KRW-LINK', coinName: '체인링크',  quantity: 0.79715302,  averagePurchasePrice: 14_050,     principalAmount: 11_200 },
    { market: 'KRW-DOGE', coinName: '도지코인',  quantity: 80.19801980, averagePurchasePrice: 101,        principalAmount: 8_100 },
    { market: 'KRW-ADA',  coinName: '에이다',    quantity: 22.11538462, averagePurchasePrice: 312,        principalAmount: 6_900 },
  ],
}

// ── 결제 내역: 피드 ──────────────────────────────────────────────────────────
// 상태 4종(PENDING/IN_PROGRESS/INVESTED/CANCELED)과 카테고리 7종을 모두 포함한다.
export const mockPaymentFeed: PaymentFeedItem[] = [
  {
    id: 1042, merchant: '스타벅스 강남2호점', amount: 5_400, roundUpAmount: 4_600,
    category: 'CAFE', status: 'PENDING',
    targetCoinMarket: 'KRW-BTC', targetCoinName: '비트코인',
    investedVolume: null, investedPrice: null,
    createdAt: '2026-08-21T14:32:10', expiredAt: '2026-08-21T23:50:00',
  },
  {
    id: 1041, merchant: '배달의민족', amount: 18_700, roundUpAmount: 1_300,
    category: 'FOOD', status: 'IN_PROGRESS',
    targetCoinMarket: 'KRW-ETH', targetCoinName: '이더리움',
    investedVolume: null, investedPrice: null,
    createdAt: '2026-08-21T12:05:44', expiredAt: '2026-08-21T21:05:44',
  },
  {
    id: 1040, merchant: '올리브영 신논현', amount: 32_900, roundUpAmount: 2_100,
    category: 'SHOPPING', status: 'INVESTED',
    targetCoinMarket: 'KRW-SOL', targetCoinName: '솔라나',
    investedVolume: 0.01681345, investedPrice: 124_900,
    createdAt: '2026-08-21T11:20:02', expiredAt: '2026-08-21T20:20:02',
  },
  {
    id: 1039, merchant: '서울교통공사', amount: 1_550, roundUpAmount: 450,
    category: 'TRAFFIC', status: 'INVESTED',
    targetCoinMarket: 'KRW-XRP', targetCoinName: '리플',
    investedVolume: 0.24779736, investedPrice: 1_816,
    createdAt: '2026-08-20T19:41:55', expiredAt: '2026-08-21T04:41:55',
  },
  {
    id: 1038, merchant: 'CGV 강남', amount: 15_000, roundUpAmount: 5_000,
    category: 'CULTURE', status: 'INVESTED',
    targetCoinMarket: 'KRW-BTC', targetCoinName: '비트코인',
    investedVolume: 0.00004740, investedPrice: 105_498_000,
    createdAt: '2026-08-20T18:02:13', expiredAt: '2026-08-21T03:02:13',
  },
  {
    id: 1037, merchant: '이마트24 삼성점', amount: 8_900, roundUpAmount: 1_100,
    category: 'MART', status: 'CANCELED',
    targetCoinMarket: null, targetCoinName: null,
    investedVolume: null, investedPrice: null,
    createdAt: '2026-08-20T09:15:30', expiredAt: '2026-08-20T18:15:30',
  },
  {
    id: 1036, merchant: '투썸플레이스 선릉', amount: 6_300, roundUpAmount: 3_700,
    category: 'CAFE', status: 'INVESTED',
    targetCoinMarket: 'KRW-DOGE', targetCoinName: '도지코인',
    investedVolume: 31.89655172, investedPrice: 116,
    createdAt: '2026-08-19T16:48:07', expiredAt: '2026-08-20T01:48:07',
  },
  {
    id: 1035, merchant: '쿠팡', amount: 47_300, roundUpAmount: 2_700,
    category: 'SHOPPING', status: 'INVESTED',
    targetCoinMarket: 'KRW-ETH', targetCoinName: '이더리움',
    investedVolume: 0.00082292, investedPrice: 3_281_000,
    createdAt: '2026-08-19T13:22:41', expiredAt: '2026-08-19T22:22:41',
  },
  {
    id: 1034, merchant: '김밥천국 논현점', amount: 9_500, roundUpAmount: 500,
    category: 'FOOD', status: 'INVESTED',
    targetCoinMarket: 'KRW-ADA', targetCoinName: '에이다',
    investedVolume: 1.73010381, investedPrice: 289,
    createdAt: '2026-08-18T12:31:19', expiredAt: '2026-08-18T21:31:19',
  },
  {
    id: 1033, merchant: '카카오T', amount: 12_400, roundUpAmount: 2_600,
    category: 'TRAFFIC', status: 'INVESTED',
    targetCoinMarket: 'KRW-LINK', targetCoinName: '체인링크',
    investedVolume: 0.16290726, investedPrice: 15_960,
    createdAt: '2026-08-18T08:07:52', expiredAt: '2026-08-18T17:07:52',
  },
  {
    id: 1032, merchant: '교보문고 광화문', amount: 23_000, roundUpAmount: 2_000,
    category: 'CULTURE', status: 'CANCELED',
    targetCoinMarket: null, targetCoinName: null,
    investedVolume: null, investedPrice: null,
    createdAt: '2026-08-17T15:55:03', expiredAt: '2026-08-18T00:55:03',
  },
  {
    id: 1031, merchant: '메가커피 역삼점', amount: 2_500, roundUpAmount: 1_500,
    category: 'CAFE', status: 'INVESTED',
    targetCoinMarket: 'KRW-SOL', targetCoinName: '솔라나',
    investedVolume: 0.01201040, investedPrice: 124_900,
    createdAt: '2026-08-17T09:12:38', expiredAt: '2026-08-17T18:12:38',
  },
  {
    id: 1030, merchant: '무신사', amount: 68_000, roundUpAmount: 2_000,
    category: 'SHOPPING', status: 'INVESTED',
    targetCoinMarket: 'KRW-BTC', targetCoinName: '비트코인',
    investedVolume: 0.00001896, investedPrice: 105_498_000,
    createdAt: '2026-08-16T21:03:27', expiredAt: '2026-08-17T06:03:27',
  },
  {
    id: 1029, merchant: '다이소 강남점', amount: 7_800, roundUpAmount: 2_200,
    category: 'ETC', status: 'INVESTED',
    targetCoinMarket: 'KRW-XRP', targetCoinName: '리플',
    investedVolume: 1.21145374, investedPrice: 1_816,
    createdAt: '2026-08-16T14:40:11', expiredAt: '2026-08-16T23:40:11',
  },
]

// ── 결제 내역: 월간 대시보드 ─────────────────────────────────────────────────
// 합계는 위 피드에서 실제로 계산한 값이라 화면 간 숫자가 어긋나지 않는다.
export const mockDashboard: PaymentDashboard = {
  totalPayment:        259_250,
  totalInvestedChange: 22_750,
  totalUninvested:     5_900,
  pendingCount:        1,
  categorySpending: [
    { category: 'SHOPPING', amount: 148_200 },
    { category: 'CULTURE',  amount: 38_000 },
    { category: 'FOOD',     amount: 28_200 },
    { category: 'CAFE',     amount: 14_200 },
    { category: 'TRAFFIC',  amount: 13_950 },
    { category: 'MART',     amount: 8_900 },
    { category: 'ETC',      amount: 7_800 },
  ],
}
