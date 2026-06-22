import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  PaymentFeedStatus,
  PaymentFeedItem,
  Page,
  PaymentDashboard,
  ApiEnvelope,
} from '@/types'

export const usePaymentStore = defineStore('payment', () => {
  // ── Spare-change proposal approval (from NEED_APPROVAL notification) ──
  // Both endpoints take no body and authenticate via the JWT interceptor.
  async function approvePaymentEvent(eventId: string) {
    const { default: api } = await import('@/utils/api')
    await api.post(`/api/payments/${eventId}/approve`)
  }

  async function rejectPaymentEvent(eventId: string) {
    const { default: api } = await import('@/utils/api')
    await api.post(`/api/payments/${eventId}/reject`)
  }

  // ── Paged payment feed (GET /api/payments) — low-level fetch ──
  // status defaults to 'ALL' (no filter); month is 'YYYY-MM' (e.g. "2026-06").
  // Infinite scroll: the backend decides the chunk size, so only `page`
  // (Spring's 0-based index) is sent to fetch the next chunk.
  async function fetchPaymentFeed(params: {
    status?: PaymentFeedStatus
    month: string
    page?: number
  }): Promise<Page<PaymentFeedItem>> {
    const { default: api } = await import('@/utils/api')
    const { status = 'ALL', month, page = 0 } = params
    const { data: envelope } = await api.get<ApiEnvelope<Page<PaymentFeedItem>>>(
      '/api/payments',
      { params: { status, month, page } },
    )
    return envelope.data
  }

  // ── Monthly dashboard (GET /api/payments/dashboard) — low-level fetch ──
  // month is 'YYYY-MM' (e.g. "2026-06").
  async function fetchPaymentDashboard(month: string): Promise<PaymentDashboard> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<ApiEnvelope<PaymentDashboard>>(
      '/api/payments/dashboard',
      { params: { month } },
    )
    return envelope.data
  }

  // ── Feed & dashboard state for the 결제 내역 tab ──
  function currentMonth(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const feed        = ref<PaymentFeedItem[]>([])
  const feedStatus  = ref<PaymentFeedStatus>('ALL')
  const feedMonth   = ref(currentMonth())
  const feedPage    = ref(0)
  const feedLast    = ref(false)
  const feedLoading = ref(false)
  const dashboard   = ref<PaymentDashboard | null>(null)

  // Load the first chunk, resetting any previous filter/page state.
  async function loadFeed(opts?: { status?: PaymentFeedStatus; month?: string }) {
    if (opts?.status) feedStatus.value = opts.status
    if (opts?.month)  feedMonth.value  = opts.month
    feedPage.value = 0
    feedLast.value = false
    feed.value     = []
    await loadMoreFeed()
  }

  // Append the next chunk (called by the infinite-scroll observer).
  async function loadMoreFeed() {
    if (feedLoading.value || feedLast.value) return
    feedLoading.value = true
    try {
      const pageData = await fetchPaymentFeed({
        status: feedStatus.value,
        month:  feedMonth.value,
        page:   feedPage.value,
      })
      feed.value.push(...pageData.content)
      feedLast.value = pageData.last
      feedPage.value += 1
    } finally {
      feedLoading.value = false
    }
  }

  // Load the monthly dashboard (summary cards, category chart, pending count).
  async function loadDashboard(month?: string) {
    if (month) feedMonth.value = month
    dashboard.value = await fetchPaymentDashboard(feedMonth.value)
  }

  return {
    approvePaymentEvent,
    rejectPaymentEvent,
    fetchPaymentFeed,
    fetchPaymentDashboard,
    // feed / dashboard state for the 결제 내역 tab
    feed,
    feedStatus,
    feedMonth,
    feedLast,
    feedLoading,
    dashboard,
    loadFeed,
    loadMoreFeed,
    loadDashboard,
  }
})
