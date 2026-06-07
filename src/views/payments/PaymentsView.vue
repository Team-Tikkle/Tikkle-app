<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePaymentStore } from '@/stores/usePaymentStore'
import AppHeader from '@/components/common/AppHeader.vue'
import BottomNav from '@/components/common/BottomNav.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { TransactionStatus } from '@/types'

const paymentStore = usePaymentStore()
onMounted(() => {
  paymentStore.fetchTransactions()
  paymentStore.fetchSummary()
})

// ── Remaining time for PENDING items ──
// A reactive tick counter — increments every 60s to force re-evaluation
const tick = ref(0)
let tickTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => { tickTimer = setInterval(() => tick.value++, 60_000) })
onUnmounted(() => { if (tickTimer) clearInterval(tickTimer) })

function getRemainingTime(expiredAt: string | undefined): { label: string; colorClass: string } | null {
  if (!expiredAt) return null
  // Reading tick.value makes this expression reactive to the 60s timer
  void tick.value
  const diffMs = new Date(expiredAt).getTime() - Date.now()
  if (diffMs <= 0) return { label: '만료됨', colorClass: 'text-gray-400' }
  const totalMinutes = Math.floor(diffMs / 60_000)
  const hours   = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours >= 1) {
    const label = minutes > 0 ? `${hours}시간 ${minutes}분 남음` : `${hours}시간 남음`
    return { label, colorClass: 'text-amber-500' }
  }
  return { label: `${minutes}분 남음`, colorClass: 'text-red-500' }
}

// ── Filter ──
type FilterKey = 'ALL' | TransactionStatus
const activeFilter = ref<FilterKey>('ALL')

const filteredTx = computed(() => {
  if (activeFilter.value === 'ALL') return paymentStore.transactions
  return paymentStore.transactions.filter((t) => t.status === activeFilter.value)
})

// ── Bar chart mock data (category spending) ──
const categories = [
  { label: '식비',  amount: 18500, color: '#0051ff' },
  { label: '교통',  amount: 8200,  color: '#3380ff' },
  { label: '쇼핑',  amount: 23600, color: '#66aaff' },
  { label: '기타',  amount: 5850,  color: '#b3d4ff' },
]
const maxAmount = Math.max(...categories.map((c) => c.amount))

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

// Category icon SVGs (simple, inline)
const categoryIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`
</script>

<template>
  <div class="min-h-screen bg-surface pb-24">
    <AppHeader title="결제 내역" />

    <div class="px-4 pt-3 flex flex-col gap-3">

      <!-- ── Summary stats ── -->
      <div v-if="paymentStore.summary" class="grid grid-cols-3 gap-2">
        <!-- Total payment -->
        <div class="bg-white rounded-xl p-3 flex flex-col gap-1.5">
          <span class="text-xs2 text-text-tertiary leading-none">총 결제 금액</span>
          <span class="text-base font-bold text-text-primary">₩{{ fmt(paymentStore.summary.total_payment) }}</span>
        </div>
        <!-- Invested -->
        <div class="bg-brand-bg rounded-xl p-3 flex flex-col gap-1.5">
          <span class="text-xs2 text-brand-300 leading-none">투자된 잔돈</span>
          <span class="text-base font-bold text-brand">₩{{ fmt(paymentStore.summary.total_invested_change) }}</span>
        </div>
        <!-- Uninvested -->
        <div class="bg-warning-bg rounded-xl p-3 flex flex-col gap-1.5">
          <span class="text-xs2 text-warning leading-none">미투자 잔돈</span>
          <span class="text-base font-bold text-warning">₩{{ fmt(paymentStore.summary.total_uninvested) }}</span>
        </div>
      </div>

      <!-- ── Category bar chart ── -->
      <div class="bg-white rounded-xl px-5 py-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-md font-bold text-text-primary">소비 카테고리</h2>
          <div class="bg-surface-alt rounded-lg px-3 py-1.5 flex items-center gap-1">
            <span class="text-sm font-semibold text-text-primary">2026년 5월</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div class="flex flex-col gap-3">
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
            @click="activeFilter = f"
          >
            {{ f === 'ALL' ? '전체' : f === 'INVESTED' ? '투자 완료' : f === 'PENDING' ? '대기 중' : '취소' }}

            <!-- Count badge on PENDING chip — shows count up to 9, then "9+" -->
            <span
              v-if="f === 'PENDING' && paymentStore.pendingTransactions.length > 0"
              class="min-w-[18px] h-[18px] px-1 rounded-full text-xs2 font-bold flex items-center justify-center leading-none"
              :class="activeFilter === 'PENDING' ? 'bg-white text-brand' : 'bg-danger text-white'"
            >
              {{ paymentStore.pendingTransactions.length > 9 ? '9+' : paymentStore.pendingTransactions.length }}
            </span>
          </button>
        </div>

        <EmptyState v-if="filteredTx.length === 0" message="해당하는 결제 내역이 없어요." />

        <div class="flex flex-col divide-y divide-surface-border">
          <div
            v-for="tx in filteredTx"
            :key="tx.id"
            class="py-3.5 flex items-center gap-3 first:pt-0"
            :class="tx.status === 'PENDING' ? 'cursor-pointer' : ''"
            @click="tx.status === 'PENDING' && $router.push(`/payments/${tx.id}/select-stock`)"
          >
            <!-- Merchant icon placeholder -->
            <div class="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center shrink-0 text-brand">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="categoryIcon" />
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-base font-medium text-text-primary truncate">{{ tx.merchant }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs2 text-text-tertiary">{{ tx.category }}</span>
                <span class="text-xs2 text-text-disabled">{{ fmtDate(tx.created_at) }}</span>
              </div>
            </div>

            <!-- Amount + badge -->
            <div class="flex flex-col items-end gap-1.5 shrink-0">
              <span class="text-base font-semibold text-text-primary">₩{{ fmt(tx.amount) }}</span>
              <div class="flex items-center gap-1.5">
                <span class="text-xs2 text-text-tertiary">잔돈 ₩{{ fmt(tx.round_up_amount) }}</span>
                <span
                  class="text-xs2 font-medium px-2 py-0.5 rounded-pill"
                  :class="statusConfig[tx.status].class"
                >
                  {{ statusConfig[tx.status].label }}
                </span>
              </div>
              <!-- Remaining time — only shown for PENDING items -->
              <template v-if="tx.status === 'PENDING'">
                <span
                  v-if="getRemainingTime(tx.expired_at)"
                  class="text-xs2 font-medium"
                  :class="getRemainingTime(tx.expired_at)!.colorClass"
                >
                  {{ getRemainingTime(tx.expired_at)!.label }}
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>

    </div>

    <BottomNav />
  </div>
</template>
