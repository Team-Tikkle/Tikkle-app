<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePaymentStore } from '@/stores/usePaymentStore'

const route = useRoute()
const paymentStore = usePaymentStore()

// Reactive pending count — drives the red dot on the payments tab.
// Source: dashboard.pendingCount (GET /api/payments/dashboard).
const hasPending = computed(() => (paymentStore.dashboard?.pendingCount ?? 0) > 0)

// BottomNav renders on every tab, so load the dashboard once if no view has yet,
// otherwise the dot wouldn't appear until the 결제 내역 tab is opened.
onMounted(() => {
  if (!paymentStore.dashboard) paymentStore.loadDashboard()
})

const tabs = [
  {
    name: 'home',
    path: '/',
    label: '홈',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/></svg>`,
  },
  {
    name: 'payments',
    path: '/payments',
    label: '결제내역',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  },
  {
    name: 'insights',
    path: '/insights',
    label: '인사이트',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  },
  {
    name: 'settings',
    path: '/settings',
    label: '설정',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  },
]
</script>

<template>
  <!-- Bottom navigation bar — fixed at viewport bottom, centered to 430px -->
  <nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-white border-t border-surface-border z-50">
    <div class="flex">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.path"
        class="flex-1 flex flex-col items-center pt-2.5 pb-3 gap-1 transition-colors"
        :class="route.name === tab.name ? 'text-brand' : 'text-text-tertiary'"
      >
        <!-- Icon wrapper — relative so we can position the red dot badge -->
        <span class="relative w-[22px] h-[22px]">
          <!-- SVG icon -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="w-full h-full" v-html="tab.icon" />

          <!-- Red dot badge on "결제내역" when there are pending transactions -->
          <span
            v-if="tab.name === 'payments' && hasPending"
            class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger"
          />
        </span>

        <span
          class="text-xs2 leading-none"
          :class="route.name === tab.name ? 'font-semibold' : 'font-medium'"
        >
          {{ tab.label }}
        </span>
      </RouterLink>
    </div>
  </nav>
</template>
