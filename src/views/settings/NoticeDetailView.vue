<script setup lang="ts">
/**
 * 공지사항 상세 (/settings/notices/:id)
 * 본문은 plain text이며 \n\n 으로 문단을 구분하므로 whitespace-pre-wrap 으로 렌더링한다.
 * 숨김 처리된 공지(404 NOTICE-001)는 스토어가 null을 주므로 안내 화면을 띄운다.
 */
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useNoticeStore } from '@/stores/useNoticeStore'
import { fmtDateDot } from '@/utils/format'
import type { Notice } from '@/types'

const route = useRoute()
const noticeStore = useNoticeStore()

const notice = ref<Notice | null>(null)
const isLoading = ref(true)
const errorMsg = ref('')

// 로딩·에러가 아닌데 notice가 null이면 그것이 not-found 상태다.
onMounted(async () => {
  const id = Number(route.params.id)
  // :id가 숫자가 아니면 요청 없이 종료 — notice가 null로 남아 안내 화면이 뜬다.
  if (!Number.isFinite(id)) {
    isLoading.value = false
    return
  }
  try {
    notice.value = await noticeStore.fetchNotice(id)
  } catch {
    errorMsg.value = '공지사항을 불러오지 못했어요.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col pb-10">
    <AppHeader title="공지사항" :show-back="true" />

    <LoadingSpinner v-if="isLoading" />

    <div
      v-else-if="errorMsg"
      class="mx-4 mt-3 bg-danger-bg border border-danger rounded-xl px-4 py-3 text-sm text-danger"
    >
      {{ errorMsg }}
    </div>

    <EmptyState
      v-else-if="!notice"
      icon="📢"
      message="찾을 수 없는 공지사항입니다"
    />

    <div v-else-if="notice" class="px-4 pt-4">
      <div class="bg-white rounded-xl px-5 py-5">
        <!-- 제목 + 게시일 -->
        <div class="flex items-center gap-1.5">
          <svg
            v-if="notice.isPinned"
            class="shrink-0 text-brand" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
          </svg>
          <h1 class="text-lg font-bold text-text-primary leading-snug">
            {{ notice.title }}
          </h1>
        </div>
        <p class="text-xs2 text-text-disabled mt-1.5">
          {{ fmtDateDot(notice.publishedAt) }}
        </p>

        <div class="h-px bg-surface-border my-4" />

        <!-- 본문 (plain text) -->
        <p class="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words">{{ notice.content }}</p>
      </div>
    </div>
  </div>
</template>
