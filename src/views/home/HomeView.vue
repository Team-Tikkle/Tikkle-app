<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import { useUpbitMarketStore } from '@/stores/useUpbitMarketStore'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import BottomNav from '@/components/common/BottomNav.vue'
import type { PortfolioHolding } from '@/types'

const userStore      = useUserStore()
const marketStore    = useUpbitMarketStore()
const portfolioStore = usePortfolioStore()

onMounted(async () => {
  if (!userStore.profile?.name) userStore.fetchProfile().catch(() => {})
  await portfolioStore.fetchPortfolio()
  // 보유 코인 페어 코드로만 실시간 시세를 구독한다.
  const codes = portfolioStore.portfolio?.holdingMarketCodes ?? []
  marketStore.connect(codes)
})

onUnmounted(() => {
  marketStore.disconnect()
})

// 보유 코인 1건의 표시값. 실시간 시세가 도착하면 그 값을, 아직이면 스냅샷을 쓴다.
function holdingView(h: PortfolioHolding) {
  const t          = marketStore.tickers.get(h.market)
  const price      = t ? t.tradePrice : h.currentPrice
  const evaluation = t ? t.tradePrice * h.quantity : h.evaluationAmount
  return {
    price,
    evaluation,
    profitLoss: evaluation - h.principalAmount,
    changeRate: t?.signedChangeRate ?? null,  // null = 아직 실시간 시세 없음(스냅샷)
  }
}

// 보유 코인 + 실시간 표시값을 한 번에. tickers 변동 시 자동 갱신된다.
const holdingRows = computed(() =>
  (portfolioStore.portfolio?.holdings ?? []).map((h) => ({ h, ...holdingView(h) })),
)

// ── 실시간 자산 합계 (보유 코인 평가금 합산) ──
const liveTotalEvaluation = computed(() =>
  holdingRows.value.reduce((sum, r) => sum + r.evaluation, 0),
)
const totalPrincipal = computed(() => portfolioStore.portfolio?.totalPrincipalAmount ?? 0)
const liveTotalProfitLoss = computed(() => liveTotalEvaluation.value - totalPrincipal.value)

// ── 포트폴리오 도넛 차트 (보유 금액 비중, 실시간) ──
const DONUT_COLORS = ['#0051ff', '#3380ff', '#66aaff', '#99c2ff', '#b3d4ff', '#cce0ff', '#e0ecff']

const donutSegments = computed(() => {
  const rows = [...holdingRows.value].sort((a, b) => b.evaluation - a.evaluation)
  const total = rows.reduce((s, r) => s + r.evaluation, 0)
  let offset = 0
  return rows.map((r, i) => {
    const pct = total > 0 ? (r.evaluation / total) * 100 : 0
    const seg = { name: r.h.coinName, pct, color: DONUT_COLORS[i % DONUT_COLORS.length], offset }
    offset += pct
    return seg
  })
})

// ── Portfolio formatting helpers ──
function fmtAmount(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

// "KRW-BTC" → "BTC" (for the Upbit coin logo URL)
function marketCurrency(market: string): string {
  return market.split('-')[1] ?? market
}

// 평가손익 라벨 (예: "+₩1,235 (+1.18%)") — 손실이면 부호를 ₩ 앞에 둔다
function fmtSignedPL(pl: number, principal: number): string {
  const rate = principal > 0 ? (pl / principal) * 100 : 0
  const sign = pl > 0 ? '+' : pl < 0 ? '-' : ''
  return `${sign}₩${fmtAmount(Math.abs(pl))} (${sign}${Math.abs(rate).toFixed(2)}%)`
}

// 상승=빨강, 하락=파랑 (국내 관례, 실시간 시장 현황과 동일)
function plColorClass(pl: number): string {
  return pl > 0 ? 'text-danger' : pl < 0 ? 'text-brand' : 'text-text-tertiary'
}

function fmtPrice(n: number): string {
  if (n >= 1_000_000) return n.toLocaleString('ko-KR')
  if (n >= 1_000)     return n.toLocaleString('ko-KR')
  if (n >= 1)         return n.toFixed(2)
  return n.toFixed(4)
}

function coinIconUrl(currency: string): string {
  return `https://static.upbit.com/logos/${currency}.png`
}
</script>

<template>
  <div class="min-h-screen bg-surface pb-24">

    <!-- ── Header ── -->
    <div class="bg-white px-6 pt-12 pb-4 flex items-center justify-between sticky top-0 z-40">
      <h1 class="text-xl font-bold text-text-primary">
        {{ userStore.profile?.name || '티끌 유저' }}
      </h1>
      <button class="w-10 h-10 flex items-center justify-center text-text-primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </button>
    </div>

    <div class="px-4 flex flex-col gap-3 mt-1">

      <!-- ── 내 자산 ── -->
      <div class="bg-white rounded-xl px-6 py-5 flex flex-col gap-4">
        <span class="text-md font-bold text-text-primary">내 자산</span>

        <!-- 에러 -->
        <p v-if="portfolioStore.error" class="text-sm text-danger">{{ portfolioStore.error }}</p>

        <!-- 로딩 skeleton (첫 데이터 도착 전) -->
        <div v-else-if="!portfolioStore.portfolio" class="flex flex-col gap-3">
          <div class="flex flex-col gap-1.5">
            <span class="text-xs2 text-text-disabled">총 자산</span>
            <div class="h-9 w-48 bg-surface rounded-lg" />
          </div>
          <div class="flex gap-6">
            <div class="flex flex-col gap-1">
              <span class="text-xs2 text-text-disabled">총 투자금</span>
              <div class="h-4 w-24 bg-surface rounded" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs2 text-text-disabled">평가 수익</span>
              <div class="h-4 w-20 bg-surface rounded" />
            </div>
          </div>
        </div>

        <!-- 자산 요약 + 보유 코인 -->
        <template v-else>
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-1.5">
              <span class="text-xs2 text-text-disabled">총 자산</span>
              <span class="text-3xl font-bold text-text-primary">
                ₩{{ fmtAmount(liveTotalEvaluation) }}
              </span>
            </div>
            <div class="flex gap-6">
              <div class="flex flex-col gap-1">
                <span class="text-xs2 text-text-disabled">총 투자금</span>
                <span class="text-sm font-semibold text-text-secondary">
                  ₩{{ fmtAmount(totalPrincipal) }}
                </span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs2 text-text-disabled">평가 수익</span>
                <span class="text-sm font-semibold" :class="plColorClass(liveTotalProfitLoss)">
                  {{ fmtSignedPL(liveTotalProfitLoss, totalPrincipal) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ── 포트폴리오 현황 (보유 금액 비중, 실시간) ── -->
      <div v-if="portfolioStore.portfolio && donutSegments.length > 0" class="bg-white rounded-xl px-6 py-5">
        <h2 class="text-md font-bold text-text-primary mb-4">포트폴리오 현황</h2>

        <div class="flex items-center gap-6">
          <!-- 도넛 차트 -->
          <svg viewBox="0 0 36 36" class="w-28 h-28 shrink-0">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#f2f4f6" stroke-width="6" />
            <circle
              v-for="seg in donutSegments"
              :key="seg.name"
              cx="18"
              cy="18"
              r="14"
              fill="none"
              :stroke="seg.color"
              stroke-width="6"
              :stroke-dasharray="`${seg.pct} ${100 - seg.pct}`"
              :stroke-dashoffset="25 - seg.offset"
              pathLength="100"
            />
          </svg>

          <!-- 범례 -->
          <div class="flex-1 flex flex-col gap-2.5 min-w-0">
            <div v-for="seg in donutSegments" :key="seg.name" class="flex items-center gap-2.5">
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: seg.color }" />
              <span class="text-sm font-medium text-text-primary truncate">{{ seg.name }}</span>
              <span class="text-sm font-semibold text-text-tertiary ml-auto shrink-0">{{ seg.pct.toFixed(0) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 보유 코인 실시간 시세 ── -->
      <div v-if="portfolioStore.portfolio" class="bg-white rounded-xl px-6 py-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-md font-bold text-text-primary">보유 코인 시세</h2>
          <!-- 연결 상태 인디케이터 -->
          <div v-if="holdingRows.length > 0" class="flex items-center gap-1.5">
            <span
              class="inline-block w-1.5 h-1.5 rounded-full"
              :class="marketStore.isConnected ? 'bg-brand animate-pulse' : 'bg-surface-border'"
            />
            <span class="text-xs2 text-text-disabled">
              {{ marketStore.isConnected ? '실시간' : '연결 중...' }}
            </span>
          </div>
        </div>

        <!-- 보유 코인 없음 -->
        <p v-if="holdingRows.length === 0" class="text-sm text-text-tertiary">
          아직 보유한 코인이 없어요.
        </p>

        <!-- 보유 코인 목록 (실시간 시세, 미수신 시 스냅샷) -->
        <div v-else class="flex flex-col divide-y divide-surface-border">
          <div
            v-for="row in holdingRows"
            :key="row.h.market"
            class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-surface overflow-hidden shrink-0">
                <img
                  :src="coinIconUrl(marketCurrency(row.h.market))"
                  :alt="row.h.coinName"
                  class="w-full h-full object-contain"
                  @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                >
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-base font-medium text-text-primary">{{ row.h.coinName }}</span>
                <!-- 현재가 + 등락률 (실시간 시장 현황) -->
                <span class="text-xs2" :class="row.changeRate !== null ? plColorClass(row.changeRate) : 'text-text-disabled'">
                  ₩{{ fmtPrice(row.price) }}
                  <template v-if="row.changeRate !== null">
                    · {{ row.changeRate > 0 ? '+' : '' }}{{ (row.changeRate * 100).toFixed(2) }}%
                  </template>
                </span>
              </div>
            </div>

            <div class="text-right">
              <!-- 평가 금액 (실시간 반영) -->
              <p class="text-base font-semibold text-text-primary">
                ₩{{ fmtAmount(row.evaluation) }}
              </p>
              <!-- 평가손익 -->
              <p class="text-sm font-medium" :class="plColorClass(row.profitLoss)">
                {{ fmtSignedPL(row.profitLoss, row.h.principalAmount) }}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <BottomNav />
  </div>
</template>
