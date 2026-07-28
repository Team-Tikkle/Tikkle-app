<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App as CapApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { useUserStore } from '@/stores/useUserStore'
import { useUpbitMarketStore } from '@/stores/useUpbitMarketStore'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import BottomNav from '@/components/common/BottomNav.vue'
import { coinIconUrl, coinIconFallback } from '@/utils/coin'
import { isListenerEnabled, openNotificationAccessSettings, isBatteryExempt, requestBatteryExemption } from '@/utils/tikkleSystem'
import type { PortfolioHolding } from '@/types'

const router         = useRouter()
const userStore      = useUserStore()
const marketStore    = useUpbitMarketStore()
const portfolioStore = usePortfolioStore()

// 리스너(알림 접근) 권한 · 배터리 최적화 예외 자가진단 — 꺼져 있으면 상단 경고 배너 노출
// (웹에서는 항상 숨김). 설정 화면에서 켜고 돌아오는 경우를 위해 앱 복귀(resume) 시에도
// 재확인한다. 두 배너는 서로 독립적이라 둘 다 꺼져 있으면 둘 다 보인다.
const listenerDisabled = ref(false)
const batteryNotExempt = ref(false)
let resumeHandle: PluginListenerHandle | null = null

function refreshPermissionBanners() {
  isListenerEnabled().then((enabled) => { listenerDisabled.value = !enabled })
  isBatteryExempt().then((exempt) => { batteryNotExempt.value = !exempt })
}

onMounted(async () => {
  refreshPermissionBanners()
  resumeHandle = await CapApp.addListener('resume', refreshPermissionBanners)
  if (!userStore.profile?.name) userStore.fetchProfile().catch(() => {})
  await portfolioStore.fetchPortfolio()
  // 보유 코인 페어 코드로만 실시간 시세를 구독한다.
  const codes = portfolioStore.portfolio?.holdingMarketCodes ?? []
  marketStore.connect(codes)
})

onUnmounted(() => {
  resumeHandle?.remove()
  marketStore.disconnect()
})

// 보유 코인 1건의 표시값. 실시간 시세가 도착하면 그 값을, 아직이면 매입 단가를 스냅샷으로 쓴다.
// 원화잔액 항목(market === "KRW")은 시세가 없는 현금이므로 그대로 잔액만 표시한다.
function holdingView(h: PortfolioHolding) {
  const isKRW = h.market === 'KRW'
  if (isKRW) {
    return { isKRW, price: 1, evaluation: h.quantity, profitLoss: 0, changeRate: null as number | null }
  }
  const t          = marketStore.tickers.get(h.market)
  const price      = t ? t.tradePrice : h.averagePurchasePrice
  const evaluation = t ? t.tradePrice * h.quantity : h.principalAmount
  return {
    isKRW,
    price,
    evaluation,
    profitLoss: evaluation - h.principalAmount,
    changeRate: t?.signedChangeRate ?? null,  // null = 아직 실시간 시세 없음(스냅샷)
  }
}

// 보유 코인 + 원화잔액 + 실시간 표시값을 한 번에. 원화잔액을 항상 최상단에 둔다.
const holdingRows = computed(() =>
  (portfolioStore.portfolio?.holdings ?? [])
    .map((h) => ({ h, ...holdingView(h) }))
    .sort((a, b) => Number(b.isKRW) - Number(a.isKRW)),
)

// 원화잔액을 제외한 실제 코인 보유 여부. 원화 행은 항상 존재하므로
// holdingRows.length만으로는 "보유 코인 없음"을 판별할 수 없다.
const hasCoinHoldings = computed(() => holdingRows.value.some((r) => !r.isKRW))

// ── 실시간 자산 합계 (원화잔액 + 보유 코인 평가금 합산 = 총자산) ──
const liveTotalEvaluation = computed(() =>
  holdingRows.value.reduce((sum, r) => sum + r.evaluation, 0),
)
// 총 투자금 = 원금 합계 (원화잔액의 원금은 잔액 자체와 같아 손익에 영향 없음)
const totalPrincipal = computed(() =>
  (portfolioStore.portfolio?.holdings ?? []).reduce((sum, h) => sum + h.principalAmount, 0),
)
const liveTotalProfitLoss = computed(() => liveTotalEvaluation.value - totalPrincipal.value)

// ── 포트폴리오 도넛 차트 (보유 금액 비중, 실시간) ──
// 브랜드 블루를 앵커로 한 analogous(청록↔남보라) 팔레트 — 색상(hue)으로 구분.
const DONUT_COLORS = ['#0051ff', '#3b82f6', '#06b6d4', '#6366f1', '#0ea5e9', '#8b5cf6', '#14b8a6']
const ETC_COLOR = '#d1d5db'        // 옅은 회색 — 기타 묶음
const DONUT_THRESHOLD = 80         // 누적 비중이 이 %에 도달할 때까지만 개별 표시

const donutSegments = computed(() => {
  // 원화잔액은 코인 배분 비중 차트에서 제외한다 (현금은 배분 대상이 아님).
  const rows = holdingRows.value
    .filter((r) => !r.isKRW)
    .sort((a, b) => b.evaluation - a.evaluation)
  const total = rows.reduce((s, r) => s + r.evaluation, 0)
  if (total <= 0) return []

  // 누적 80%에 도달할 때까지 개별 표시, 그 다음부터는 '기타'로 묶는다.
  const shown: { name: string; value: number }[] = []
  const rest:  { name: string; value: number }[] = []
  let cumulative = 0
  for (const r of rows) {
    if (cumulative < DONUT_THRESHOLD) {
      shown.push({ name: r.h.coinName, value: r.evaluation })
      cumulative += (r.evaluation / total) * 100
    } else {
      rest.push({ name: r.h.coinName, value: r.evaluation })
    }
  }

  // 남은 항목이 1개뿐이면 기타로 가리지 않고 그대로 표시한다.
  if (rest.length === 1) {
    shown.push(rest.pop()!)
  }

  const items = shown.map((s, i) => ({ ...s, color: DONUT_COLORS[i % DONUT_COLORS.length] }))
  if (rest.length >= 2) {
    items.push({ name: '기타', value: rest.reduce((s, r) => s + r.value, 0), color: ETC_COLOR })
  }

  let offset = 0
  return items.map((it) => {
    const pct = (it.value / total) * 100
    const seg = { name: it.name, pct, color: it.color, offset }
    offset += pct
    return seg
  })
})

// ── Portfolio formatting helpers ──
function fmtAmount(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
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

</script>

<template>
  <div class="min-h-screen bg-surface pb-24">

    <!-- ── Header ── -->
    <div class="bg-white px-6 flex items-center sticky top-0 z-40 h-[60px]">
      <h1 class="text-xl font-bold text-text-primary">내 보유자산</h1>
    </div>

    <div class="px-4 flex flex-col gap-3 mt-1">

      <!-- ── 알림 접근 권한 경고 배너 (자가진단) ── -->
      <button
        v-if="listenerDisabled"
        class="w-full bg-danger-bg rounded-xl px-4 py-3.5 flex items-center gap-3 text-left active:opacity-80"
        @click="openNotificationAccessSettings()"
      >
        <span class="text-base shrink-0">⚠️</span>
        <span class="flex-1 text-sm text-text-primary leading-relaxed">
          <span class="font-semibold text-danger">알림 접근 권한이 꺼져 있어요.</span>
          결제를 감지할 수 없어 잔돈 적립이 멈춘 상태예요. 눌러서 다시 켜 주세요.
        </span>
        <svg class="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- ── 배터리 최적화 예외 경고 배너 (자가진단) ── -->
      <button
        v-if="batteryNotExempt"
        class="w-full bg-danger-bg rounded-xl px-4 py-3.5 flex items-center gap-3 text-left active:opacity-80"
        @click="requestBatteryExemption()"
      >
        <span class="text-base shrink-0">🔋</span>
        <span class="flex-1 text-sm text-text-primary leading-relaxed">
          <span class="font-semibold text-danger">배터리 사용 최적화 예외가 꺼져 있어요.</span>
          백그라운드에서 결제 감지가 멈출 수 있어요. 눌러서 예외로 설정해 주세요.
        </span>
        <svg class="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- ── 업비트 재연동 필요 (UPBIT-010) — 로그아웃하지 않고 재연동만 유도 ── -->
      <div
        v-if="portfolioStore.upbitKeyInvalid"
        class="bg-white rounded-xl px-6 py-6 flex flex-col items-center gap-4 text-center"
      >
        <div class="w-14 h-14 rounded-full bg-danger-bg flex items-center justify-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="flex flex-col gap-1">
          <p class="text-base font-bold text-text-primary">업비트 재연동이 필요해요</p>
          <p class="text-sm text-text-tertiary leading-relaxed">
            업비트 인증이 만료되었어요. 다시 연동하면 보유 자산을 확인할 수 있어요.
          </p>
        </div>
        <button
          class="w-full py-3 rounded-xl bg-brand text-white text-base font-semibold active:bg-brand-hover"
          @click="router.push('/settings/api-key')"
        >
          업비트 재연동
        </button>
      </div>

      <!-- ── 내 자산 ── -->
      <div v-else class="bg-white rounded-xl px-6 py-5 flex flex-col gap-4">

        <!-- 에러 -->
        <p v-if="portfolioStore.error" class="text-sm text-danger">{{ portfolioStore.error }}</p>

        <!-- 로딩 skeleton (첫 데이터 도착 전) -->
        <div v-else-if="!portfolioStore.portfolio" class="flex flex-col gap-3">
          <div class="flex flex-col gap-1.5">
            <span class="text-md font-bold text-text-secondary">총 자산</span>
            <div class="h-9 w-48 bg-surface rounded-lg" />
          </div>
          <div class="flex gap-6">
            <div class="flex flex-col gap-1">
              <span class="text-xs text-text-tertiary">총 투자금</span>
              <div class="h-4 w-24 bg-surface rounded" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs text-text-tertiary">평가 수익</span>
              <div class="h-4 w-20 bg-surface rounded" />
            </div>
          </div>
        </div>

        <!-- 자산 요약 + 보유 코인 -->
        <template v-else>
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-1.5">
              <span class="text-md font-bold text-text-secondary">총 자산</span>
              <span class="text-3xl font-bold text-text-primary">
                ₩{{ fmtAmount(liveTotalEvaluation) }}
              </span>
            </div>
            <div class="flex gap-6">
              <div class="flex flex-col gap-1">
                <span class="text-xs text-text-tertiary">총 투자금</span>
                <span class="text-sm font-semibold text-text-secondary">
                  ₩{{ fmtAmount(totalPrincipal) }}
                </span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs text-text-tertiary">평가 수익</span>
                <span class="text-sm font-semibold" :class="plColorClass(liveTotalProfitLoss)">
                  {{ fmtSignedPL(liveTotalProfitLoss, totalPrincipal) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ── 포트폴리오 현황 (보유 금액 비중, 실시간) ── -->
      <div v-if="portfolioStore.portfolio" class="bg-white rounded-xl px-6 py-5">
        <h2 class="text-md font-bold text-text-primary mb-4">포트폴리오 현황</h2>

        <div class="flex items-center gap-6">
          <!-- 도넛 차트 — 보유 코인 없으면 빈 링만 표시 -->
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

          <!-- 범례 / 보유 코인 없음 안내 -->
          <div class="flex-1 flex flex-col gap-2.5 min-w-0">
            <p v-if="donutSegments.length === 0" class="text-sm text-text-tertiary">
              아직 보유한 코인이 없어요.
            </p>
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
          <!-- 연결 상태 인디케이터 — 보유 코인이 없으면 애초에 시세 구독을 하지 않으므로 별도 문구 -->
          <div v-if="hasCoinHoldings" class="flex items-center gap-1.5">
            <span
              class="inline-block w-1.5 h-1.5 rounded-full"
              :class="marketStore.isConnected ? 'bg-brand animate-pulse' : 'bg-surface-border'"
            />
            <span class="text-xs2 text-text-disabled">
              {{ marketStore.isConnected ? '실시간' : '연결 중...' }}
            </span>
          </div>
          <div v-else class="flex items-center gap-1.5">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-surface-border" />
            <span class="text-xs2 text-text-disabled">보유 코인 없음</span>
          </div>
        </div>

        <!-- 보유 자산 없음 -->
        <p v-if="holdingRows.length === 0" class="text-sm text-text-tertiary">
          아직 보유한 자산이 없어요.
        </p>

        <!-- 보유 자산 목록 (원화잔액 최상단 고정 + 코인 실시간 시세, 미수신 시 스냅샷) -->
        <div v-else class="flex flex-col divide-y divide-surface-border">
          <div
            v-for="row in holdingRows"
            :key="row.h.market"
            class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div class="flex items-center gap-3">
              <!-- 원화잔액: 전용 아이콘, 코인 아이콘/실시간 시세 없음 -->
              <div
                v-if="row.isKRW"
                class="w-8 h-8 rounded-full bg-brand-bg text-brand flex items-center justify-center shrink-0 text-sm font-bold"
              >
                ₩
              </div>
              <div v-else class="w-8 h-8 rounded-full bg-surface overflow-hidden shrink-0">
                <img
                  :src="coinIconUrl(row.h.market)"
                  :alt="row.h.coinName"
                  class="w-full h-full object-contain"
                  @error="coinIconFallback"
                >
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-base font-medium text-text-primary">{{ row.h.coinName }}</span>
                <!-- 원화잔액: 라벨만 표시 / 코인: 현재가 + 등락률 (실시간 시장 현황) -->
                <span v-if="row.isKRW" class="text-xs2 text-text-disabled">보유 현금</span>
                <span v-else class="text-xs2" :class="row.changeRate !== null ? plColorClass(row.changeRate) : 'text-text-disabled'">
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
              <!-- 평가손익 — 원화잔액은 손익이 없으므로 생략 -->
              <p v-if="!row.isKRW" class="text-sm font-medium" :class="plColorClass(row.profitLoss)">
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
