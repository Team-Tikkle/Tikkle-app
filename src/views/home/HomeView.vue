<script setup lang="ts">
import { onMounted } from 'vue'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import { useUserStore } from '@/stores/useUserStore'
import BottomNav from '@/components/common/BottomNav.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const portfolioStore = usePortfolioStore()
const userStore = useUserStore()

onMounted(() => portfolioStore.fetchPortfolio())

function fmt(n: number) {
  return n.toLocaleString('ko-KR')
}

// Portfolio donut chart segments (mock — proportional to weight_percent)
// Figma colors: brand (#0051ff), brand-300 (#3380ff), brand-400 (#66aaff), brand-200 (#99ccff), brand-100 (#b3d4ff)
const chartColors = ['#0051ff', '#3380ff', '#66aaff', '#99ccff', '#b3d4ff']

// Build SVG donut from holdings
function buildDonutPath(holdings: { weight_percent: number }[]) {
  const cx = 60, cy = 60, r = 45, gap = 2
  let startAngle = -90
  const paths: { d: string; color: string }[] = []
  holdings.forEach((h, i) => {
    const pct = h.weight_percent / 100
    const angle = pct * 360
    const endAngle = startAngle + angle - gap
    const start = polarToCartesian(cx, cy, r, startAngle + gap / 2)
    const end   = polarToCartesian(cx, cy, r, endAngle)
    const largeArc = angle > 180 ? 1 : 0
    paths.push({
      d: `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      color: chartColors[i % chartColors.length],
    })
    startAngle += angle
  })
  return paths
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
</script>

<template>
  <div class="min-h-screen bg-surface pb-24">

    <!-- ── Header ── -->
    <div class="bg-white px-6 pt-12 pb-4 flex items-center justify-between sticky top-0 z-40">
      <h1 class="text-xl font-bold text-text-primary">
        {{ userStore.profile?.id ?? 'Username' }}
      </h1>
      <!-- Notification bell icon -->
      <button class="w-10 h-10 flex items-center justify-center text-text-primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </button>
    </div>

    <LoadingSpinner v-if="portfolioStore.isLoading" />

    <template v-else-if="portfolioStore.summary">
      <div class="px-4 flex flex-col gap-3 mt-1">

        <!-- ── Total asset card ── -->
        <div class="bg-white rounded-xl px-6 py-5 flex flex-col gap-2">
          <span class="text-sm text-text-tertiary">총 자산</span>

          <div class="flex items-center gap-3">
            <span class="text-4xl font-bold text-text-primary">
              ₩{{ fmt(portfolioStore.summary.total_evaluated) }}
            </span>
            <!-- Profit rate badge -->
            <span
              class="px-2 py-0.5 rounded-pill text-sm font-bold text-white"
              :class="portfolioStore.summary.profit_loss_rate >= 0 ? 'bg-brand' : 'bg-danger'"
            >
              {{ portfolioStore.summary.profit_loss_rate >= 0 ? '+' : '' }}{{ portfolioStore.summary.profit_loss_rate.toFixed(2) }}%
            </span>
          </div>

          <div class="flex items-center gap-4 text-sm text-text-tertiary">
            <span>총 투자금 ₩{{ fmt(portfolioStore.summary.total_invested) }}</span>
          </div>
          <div class="flex items-center gap-1 text-sm">
            <span class="text-text-tertiary">평가 수익</span>
            <span
              class="font-semibold"
              :class="portfolioStore.summary.total_profit_loss >= 0 ? 'text-brand' : 'text-danger'"
            >
              {{ portfolioStore.summary.total_profit_loss >= 0 ? '+' : '' }}₩{{ fmt(portfolioStore.summary.total_profit_loss) }}
            </span>
          </div>
        </div>

        <!-- ── Portfolio chart card ── -->
        <div class="bg-white rounded-xl px-6 py-5">
          <h2 class="text-md font-bold text-text-primary mb-4">포트폴리오 현황</h2>

          <div class="flex items-center gap-6">
            <!-- SVG donut chart -->
            <svg width="120" height="120" viewBox="0 0 120 120" class="shrink-0">
              <template v-for="(seg, i) in buildDonutPath(portfolioStore.summary.holdings)" :key="i">
                <path
                  :d="seg.d"
                  :stroke="seg.color"
                  stroke-width="18"
                  fill="none"
                  stroke-linecap="round"
                />
              </template>
              <!-- Center text -->
              <text x="60" y="55" text-anchor="middle" font-size="11" fill="#8e8e93" font-family="Inter">보유</text>
              <text x="60" y="71" text-anchor="middle" font-size="13" fill="#1c1c1e" font-weight="700" font-family="Inter">
                {{ portfolioStore.summary.holdings.length }}종목
              </text>
            </svg>

            <!-- Legend -->
            <div class="flex flex-col gap-2 flex-1 min-w-0">
              <div
                v-for="(h, i) in portfolioStore.summary.holdings"
                :key="h.ticker"
                class="flex items-center gap-2"
              >
                <div
                  class="w-2 h-2 rounded-full shrink-0"
                  :style="{ background: chartColors[i % chartColors.length] }"
                />
                <span class="text-sm font-medium text-text-primary truncate">{{ h.name }}</span>
                <span class="text-xs2 text-text-tertiary ml-auto shrink-0">{{ h.weight_percent }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Holdings list ── -->
        <div class="bg-white rounded-xl px-6 py-5">
          <h2 class="text-md font-bold text-text-primary mb-4">보유 종목</h2>

          <div class="flex flex-col divide-y divide-surface-border">
            <div
              v-for="h in portfolioStore.summary.holdings"
              :key="h.ticker"
              class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div class="flex flex-col gap-0.5">
                <span class="text-base font-medium text-text-primary">{{ h.name }}</span>
                <span class="text-sm text-text-tertiary">비중 {{ h.weight_percent }}%</span>
              </div>
              <div class="text-right">
                <p class="text-base font-semibold text-text-primary">₩{{ fmt(h.evaluated_amount) }}</p>
                <p
                  class="text-sm font-normal"
                  :class="h.profit_loss_rate >= 0 ? 'text-danger' : 'text-brand'"
                >
                  {{ h.profit_loss_rate >= 0 ? '+' : '' }}{{ h.profit_loss_rate.toFixed(1) }}%
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </template>

    <BottomNav />
  </div>
</template>
