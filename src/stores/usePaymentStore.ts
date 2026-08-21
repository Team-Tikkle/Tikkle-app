import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  PaymentFeedStatus,
  PaymentFeedItem,
  Page,
  PaymentDashboard,
  ApiEnvelope,
  CategoryType,
  InProgressPayment,
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

  // ── 진행 중인 결제 조회 (GET /api/payments/in-progress) ──
  // 앱 재진입 시 화면 복구의 출발점. 없으면 빈 배열.
  // 복구 경로에서 호출되므로 실패해도 앱이 멈추면 안 된다 → 빈 배열로 폴백.
  async function fetchInProgress(): Promise<InProgressPayment[]> {
    try {
      const { default: api } = await import('@/utils/api')
      const { data: envelope } = await api.get<ApiEnvelope<InProgressPayment[]>>(
        '/api/payments/in-progress',
      )
      return envelope.data ?? []
    } catch {
      return []
    }
  }

  // FAILED SSE 이벤트 수신 시 피드 로컬 상태를 CANCELED로 낙관적 업데이트한다.
  // 서버는 이미 CANCELED 처리가 완료된 상태이므로 별도 API 호출은 없다.
  function markFeedItemCanceled(id: number) {
    const item = feed.value.find((tx) => tx.id === id)
    if (item) item.status = 'CANCELED'
  }

  async function updateCategory(id: number, category: CategoryType) {
    const { default: api } = await import('@/utils/api')
    await api.patch(`/api/payments/${id}/category`, { category })
    const item = feed.value.find((tx) => tx.id === id)
    if (!item) return

    // 대시보드 카테고리 차트를 낙관적으로 즉시 반영한다.
    if (dashboard.value) {
      const spending = dashboard.value.categorySpending
      const oldEntry = spending.find((c) => c.category === item.category)
      if (oldEntry) oldEntry.amount -= item.amount
      const newEntry = spending.find((c) => c.category === category)
      if (newEntry) {
        newEntry.amount += item.amount
      } else {
        spending.push({ category, amount: item.amount })
      }
      // 합계가 0 이하가 된 카테고리는 차트에서 제거한다.
      dashboard.value.categorySpending = spending.filter((c) => c.amount > 0)
    }

    item.category = category
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
  const dashboardLoading = ref(false)

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
  // 호출부가 전부 fire-and-forget 이라 여기서 삼키지 않으면 unhandled rejection 이 된다.
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
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[payment] 결제 내역 조회 실패:', err)
    } finally {
      feedLoading.value = false
    }
  }

  // Load the monthly dashboard (summary cards, category chart, pending count).
  // loadMoreFeed 와 같은 이유로 여기서 삼킨다 — BottomNav 등이 await 하지 않는다.
  async function loadDashboard(month?: string) {
    if (month) feedMonth.value = month
    dashboardLoading.value = true
    try {
      dashboard.value = await fetchPaymentDashboard(feedMonth.value)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[payment] 대시보드 조회 실패:', err)
    } finally {
      dashboardLoading.value = false
    }
  }

  return {
    approvePaymentEvent,
    rejectPaymentEvent,
    fetchInProgress,
    markFeedItemCanceled,
    updateCategory,
    // feed / dashboard state for the 결제 내역 tab
    feed,
    feedStatus,
    feedMonth,
    feedLoading,
    dashboard,
    dashboardLoading,
    loadFeed,
    loadMoreFeed,
    loadDashboard,
  }
})
