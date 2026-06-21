<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import { useUpbitMarketStore } from '@/stores/useUpbitMarketStore'
import BottomNav from '@/components/common/BottomNav.vue'

const userStore   = useUserStore()
const marketStore = useUpbitMarketStore()

onMounted(() => {
  if (!userStore.profile?.name) userStore.fetchProfile().catch(() => {})
  marketStore.connect()
})

onUnmounted(() => {
  marketStore.disconnect()
})

function fmtPrice(n: number): string {
  if (n >= 1_000_000) return n.toLocaleString('ko-KR')
  if (n >= 1_000)     return n.toLocaleString('ko-KR')
  if (n >= 1)         return n.toFixed(2)
  return n.toFixed(4)
}

function fmtVolume(n: number): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}조`
  if (n >= 100_000_000_000)   return `${(n / 100_000_000_000).toFixed(0)}천억`
  if (n >= 1_000_000_000)     return `${(n / 1_000_000_000).toFixed(1)}십억`
  return `${(n / 100_000_000).toFixed(0)}억`
}

function coinIconUrl(currency: string): string {
  return `https://static.upbit.com/logos/${currency}.png`
}

const sortedTickers = computed(() => marketStore.getSortedTickers())
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

      <!-- ── 내 자산 placeholder ── -->
      <div class="bg-white rounded-xl px-6 py-5 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-md font-bold text-text-primary">내 자산</span>
          <span class="text-xs font-semibold text-text-disabled bg-surface px-2 py-0.5 rounded-pill">개발 예정</span>
        </div>

        <!-- 총 자산 skeleton area -->
        <div class="flex flex-col gap-3">
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

        <!-- 포트폴리오 / 보유 코인 placeholder -->
        <div class="border-t border-surface-border pt-4 flex flex-col gap-2">
          <span class="text-sm font-semibold text-text-secondary">포트폴리오 · 보유 코인</span>
          <p class="text-sm text-text-tertiary leading-relaxed">
            업비트 계정 연동 후 실시간 포트폴리오와<br>보유 코인 현황이 표시됩니다.
          </p>
        </div>
      </div>

      <!-- ── 실시간 시장 현황 ── -->
      <div class="bg-white rounded-xl px-6 py-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-md font-bold text-text-primary">실시간 시장 현황</h2>
          <!-- 연결 상태 인디케이터 -->
          <div class="flex items-center gap-1.5">
            <span
              class="inline-block w-1.5 h-1.5 rounded-full"
              :class="marketStore.isConnected ? 'bg-brand animate-pulse' : 'bg-surface-border'"
            />
            <span class="text-xs2 text-text-disabled">
              {{ marketStore.isConnected ? '실시간' : '연결 중...' }}
            </span>
          </div>
        </div>

        <!-- 에러 -->
        <p v-if="marketStore.error" class="text-sm text-danger">{{ marketStore.error }}</p>

        <!-- 로딩 (첫 데이터 도착 전) -->
        <div v-else-if="sortedTickers.length === 0" class="flex flex-col gap-3">
          <div
            v-for="i in 5"
            :key="i"
            class="flex items-center justify-between py-2"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-surface shrink-0" />
              <div class="flex flex-col gap-1.5">
                <div class="h-3.5 w-16 bg-surface rounded" />
                <div class="h-3 w-10 bg-surface rounded" />
              </div>
            </div>
            <div class="flex flex-col items-end gap-1.5">
              <div class="h-3.5 w-20 bg-surface rounded" />
              <div class="h-3 w-12 bg-surface rounded" />
            </div>
          </div>
        </div>

        <!-- 티커 목록 -->
        <div v-else class="flex flex-col divide-y divide-surface-border">
          <div
            v-for="ticker in sortedTickers"
            :key="ticker.code"
            class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-surface overflow-hidden shrink-0">
                <img
                  :src="coinIconUrl(ticker.currency)"
                  :alt="ticker.currency"
                  class="w-full h-full object-contain"
                  @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                >
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-base font-medium text-text-primary">{{ ticker.name }}</span>
                <span class="text-xs2 text-text-disabled">
                  24h {{ fmtVolume(ticker.accTradePrice24h) }}
                </span>
              </div>
            </div>

            <div class="text-right">
              <p class="text-base font-semibold text-text-primary">
                ₩{{ fmtPrice(ticker.tradePrice) }}
              </p>
              <p
                class="text-sm font-medium"
                :class="ticker.signedChangeRate > 0 ? 'text-danger'
                      : ticker.signedChangeRate < 0 ? 'text-brand'
                      : 'text-text-tertiary'"
              >
                {{ ticker.signedChangeRate > 0 ? '+' : '' }}{{ (ticker.signedChangeRate * 100).toFixed(2) }}%
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <BottomNav />
  </div>
</template>
