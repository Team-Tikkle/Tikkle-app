import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ApiEnvelope, Notice, NoticeSummary } from '@/types'
import type { AxiosError } from 'axios'

// 숨김 처리된 공지를 조회하면 서버가 404와 함께 내려주는 코드
const NOTICE_NOT_FOUND = 'NOTICE-001'

export const useNoticeStore = defineStore('notice', () => {
  // 목록(본문 제외). 서버가 상단 고정 우선 + 게시일시 내림차순으로 정렬해 주므로
  // 클라이언트에서 다시 정렬하지 않는다.
  const notices = ref<NoticeSummary[]>([])

  // GET /api/notices
  async function fetchNotices(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<ApiEnvelope<NoticeSummary[]>>('/api/notices')
    notices.value = envelope.data
  }

  // GET /api/notices/{id} — 본문 포함 상세.
  // 숨김 처리된 공지(404 NOTICE-001)는 null을 반환하고,
  // 그 외 오류는 호출자가 처리하도록 그대로 던진다.
  async function fetchNotice(id: number): Promise<Notice | null> {
    const { default: api } = await import('@/utils/api')
    try {
      const { data: envelope } = await api.get<ApiEnvelope<Notice>>(`/api/notices/${id}`)
      return envelope.data
    } catch (err) {
      const code = (err as AxiosError<{ code?: string }>).response?.data?.code
      if (code === NOTICE_NOT_FOUND) return null
      throw err
    }
  }

  return {
    notices,
    fetchNotices,
    fetchNotice,
  }
})
