<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePaymentStore } from '@/stores/usePaymentStore'
import AppHeader from '@/components/common/AppHeader.vue'
import BottomNav from '@/components/common/BottomNav.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import RemainingTime from '@/components/common/RemainingTime.vue'
import type { TransactionStatus, PaymentFeedStatus, CategoryType, PaymentFeedItem } from '@/types'

const paymentStore = usePaymentStore()
const router = useRouter()

// PENDING 결제 항목 → 결제 승인 페이지. 피드 항목의 id가 곧 eventId.
function goReview(tx: PaymentFeedItem) {
  router.push({
    name: 'payment-review',
    query: {
      eventId:     tx.id,
      merchant:    tx.merchant,
      amount:      tx.amount,
      spareChange: tx.roundUpAmount,
      ticker:      tx.targetCoinMarket ?? undefined,
      stockName:   tx.targetCoinName   ?? undefined,
    },
  })
}
onMounted(() => {
  paymentStore.loadFeed()
  paymentStore.loadDashboard()
})

// ── Month selector (drives both feed and dashboard) ──
function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Last 12 months, newest first.
const monthOptions = computed(() => {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return { value: ym(d), label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` }
  })
})

function onMonthChange(e: Event) {
  const month = (e.target as HTMLSelectElement).value
  if (month === paymentStore.feedMonth) return
  paymentStore.loadFeed({ month })   // keeps the current status filter
  paymentStore.loadDashboard(month)
}

// ── Filter (server-side: changing it refetches the feed) ──
type FilterKey = 'ALL' | Extract<PaymentFeedStatus, 'INVESTED' | 'PENDING' | 'CANCELED'>
const activeFilter = computed<FilterKey>(() => paymentStore.feedStatus as FilterKey)

function setFilter(f: FilterKey) {
  if (paymentStore.feedStatus === f) return
  paymentStore.loadFeed({ status: f })
}

// ── Category metadata (enum → Korean label + chart color) ──
const CATEGORY_META: Record<CategoryType, { label: string; color: string }> = {
  CAFE:     { label: '카페', color: '#0051ff' },
  FOOD:     { label: '식비', color: '#3380ff' },
  MART:     { label: '마트', color: '#66aaff' },
  SHOPPING: { label: '쇼핑', color: '#99c2ff' },
  TRAFFIC:  { label: '교통', color: '#b3d4ff' },
  CULTURE:  { label: '문화', color: '#cce0ff' },
  ETC:      { label: '기타', color: '#e0ecff' },
}

// ── Category bar chart (from dashboard) ──
const categories = computed(() =>
  (paymentStore.dashboard?.categorySpending ?? []).map((c) => ({
    label:  CATEGORY_META[c.category]?.label ?? c.category,
    amount: c.amount,
    color:  CATEGORY_META[c.category]?.color ?? '#b3d4ff',
  })),
)
const maxAmount = computed(() => Math.max(1, ...categories.value.map((c) => c.amount)))

// ── Status badge config ──
const statusConfig: Record<TransactionStatus, { label: string; class: string }> = {
  INVESTED: { label: '투자 완료', class: 'badge-invested' },
  PENDING:  { label: '대기 중',   class: 'badge-pending' },
  CANCELED: { label: '투자 취소', class: 'badge-canceled text-danger' },
  EXPIRED:  { label: '만료',      class: 'badge-expired' },
}

function fmt(n: number) {
  return n.toLocaleString('ko-KR')
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`
}

// Category icon SVGs per category (Lucide-style, inline)
const CATEGORY_ICONS: Record<CategoryType, string> = {
  // 커피컵
  CAFE: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`,
  // 포크+나이프
  FOOD: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  // 쇼핑카트
  MART: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  // 쇼핑백
  SHOPPING: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  // 버스
  TRAFFIC: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`,
  // 필름/티켓
  CULTURE: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
  // 더보기(점 3개)
  ETC: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
}

// ── Infinite scroll: observe a sentinel at the end of the list ──
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) paymentStore.loadMoreFeed()
  }, { rootMargin: '200px' })
  if (sentinel.value) observer.observe(sentinel.value)
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div class="min-h-screen bg-surface pb-24">
    <AppHeader title="결제 내역" />

    <div class="px-4 pt-3 flex flex-col gap-3">

      <!-- ── Month selector — governs every amount/stat on this page ── -->
      <div class="relative self-start">
        <select
          :value="paymentStore.feedMonth"
          class="appearance-none bg-white rounded-xl pl-4 pr-10 py-2.5 text-xl font-bold text-text-primary cursor-pointer focus:outline-none"
          aria-label="조회할 월 선택"
          @change="onMonthChange"
        >
          <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
        <svg
          class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="2.5"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      <!-- ── Summary stats ── -->
      <div v-if="paymentStore.dashboard" class="grid grid-cols-3 gap-2">
        <!-- Total payment -->
        <div class="bg-white rounded-xl p-3 flex flex-col gap-1.5">
          <span class="text-xs2 text-text-tertiary leading-none">총 결제 금액</span>
          <span class="text-base font-bold text-text-primary">₩{{ fmt(paymentStore.dashboard.totalPayment) }}</span>
        </div>
        <!-- Invested -->
        <div class="bg-brand-bg rounded-xl p-3 flex flex-col gap-1.5">
          <span class="text-xs2 text-brand-300 leading-none">투자된 잔돈</span>
          <span class="text-base font-bold text-brand">₩{{ fmt(paymentStore.dashboard.totalInvestedChange) }}</span>
        </div>
        <!-- Uninvested -->
        <div class="bg-warning-bg rounded-xl p-3 flex flex-col gap-1.5">
          <span class="text-xs2 text-warning leading-none">미투자 잔돈</span>
          <span class="text-base font-bold text-warning">₩{{ fmt(paymentStore.dashboard.totalUninvested) }}</span>
        </div>
      </div>

      <!-- ── Category bar chart ── -->
      <div class="bg-white rounded-xl px-5 py-5">
        <h2 class="text-md font-bold text-text-primary mb-4">소비 카테고리</h2>

        <EmptyState v-if="categories.length === 0" message="이번 달 소비 내역이 없어요." />

        <div v-else class="flex flex-col gap-3">
          <div v-for="cat in categories" :key="cat.label" class="flex items-center gap-3">
            <!-- Color dot legend -->
            <div class="w-2 h-2 rounded-full shrink-0" :style="{ background: cat.color }" />
            <span class="text-xs2 text-text-tertiary w-8 shrink-0">{{ cat.label }}</span>
            <!-- Bar -->
            <div class="flex-1 h-4 bg-surface-alt rounded-pill overflow-hidden">
              <div
                class="h-full rounded-pill transition-all"
                :style="{ width: (cat.amount / maxAmount * 100) + '%', background: cat.color }"
              />
            </div>
            <span class="text-xs2 text-text-primary font-medium w-16 text-right shrink-0">
              ₩{{ fmt(cat.amount) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Recent transactions ── -->
      <div class="bg-white rounded-xl px-5 pt-5 pb-3">
        <h2 class="text-md font-bold text-text-primary mb-4">최근 내역</h2>

        <!-- Filter chips -->
        <div class="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">
          <button
            v-for="f in (['ALL','INVESTED','PENDING','CANCELED'] as FilterKey[])"
            :key="f"
            class="px-3 py-1.5 rounded-pill text-sm whitespace-nowrap transition-all shrink-0 border flex items-center gap-1.5"
            :class="activeFilter === f
              ? 'bg-brand text-white border-brand font-semibold'
              : 'bg-white text-text-tertiary border-surface-border font-medium'"
            @click="setFilter(f)"
          >
            {{ f === 'ALL' ? '전체' : f === 'INVESTED' ? '투자 완료' : f === 'PENDING' ? '대기 중' : '취소' }}

            <!-- Count badge on PENDING chip — from dashboard pendingCount (max 9, then "9+") -->
            <span
              v-if="f === 'PENDING' && (paymentStore.dashboard?.pendingCount ?? 0) > 0"
              class="min-w-[18px] h-[18px] px-1 rounded-full text-xs2 font-bold flex items-center justify-center leading-none"
              :class="activeFilter === 'PENDING' ? 'bg-white text-brand' : 'bg-danger text-white'"
            >
              {{ (paymentStore.dashboard!.pendingCount) > 9 ? '9+' : paymentStore.dashboard!.pendingCount }}
            </span>
          </button>
        </div>

        <EmptyState v-if="paymentStore.feed.length === 0 && !paymentStore.feedLoading" message="해당하는 결제 내역이 없어요." />

        <div class="flex flex-col divide-y divide-surface-border">
          <div
            v-for="tx in paymentStore.feed"
            :key="tx.id"
            class="py-3.5 flex items-center gap-3 first:pt-0"
            :class="tx.status === 'PENDING' ? 'cursor-pointer' : ''"
            @click="tx.status === 'PENDING' && goReview(tx)"
          >
            <!-- Category icon -->
            <div class="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center shrink-0 text-brand">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="CATEGORY_ICONS[tx.category] ?? CATEGORY_ICONS.ETC" />
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-base font-medium text-text-primary truncate">{{ tx.merchant }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs2 text-text-tertiary">{{ CATEGORY_META[tx.category]?.label ?? tx.category }}</span>
                <span class="text-xs2 text-text-disabled">{{ fmtDate(tx.createdAt) }}</span>
              </div>
            </div>

            <!-- Amount + badge -->
            <div class="flex flex-col items-end gap-1.5 shrink-0">
              <span class="text-base font-semibold text-text-primary">₩{{ fmt(tx.amount) }}</span>
              <div class="flex items-center gap-1.5">
                <span class="text-xs2 text-text-tertiary">잔돈 ₩{{ fmt(tx.roundUpAmount) }}</span>
                <span
                  class="text-xs2 font-medium px-2 py-0.5 rounded-pill"
                  :class="statusConfig[tx.status].class"
                >
                  {{ statusConfig[tx.status].label }}
                </span>
              </div>
              <!-- Remaining time until the approval deadline — PENDING only -->
              <RemainingTime v-if="tx.status === 'PENDING' && tx.expiredAt" :expired-at="tx.expiredAt" />
            </div>
          </div>
        </div>

        <!-- Infinite-scroll sentinel + loading indicator -->
        <div ref="sentinel" class="h-px" />
        <p v-if="paymentStore.feedLoading" class="text-center text-xs2 text-text-tertiary py-3">불러오는 중…</p>
      </div>

    </div>

    <BottomNav />
  </div>
</template>
