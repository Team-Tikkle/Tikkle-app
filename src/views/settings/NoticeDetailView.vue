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
const notFound = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  const id = Number(route.params.id)
  if (!Number.isFinite(id)) {
    notFound.value = true
    isLoading.value = false
    return
  }
  try {
    const result = await noticeStore.fetchNotice(id)
    if (result) notice.value = result
    else notFound.value = true
  } catch {
    errorMsg.value = '공지사항을 불러오지 못했어요.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col pb-10">
    <AppHeader :title="notice?.title || '공지사항'" :show-back="true" />

    <LoadingSpinner v-if="isLoading" />

    <div
      v-else-if="errorMsg"
      class="mx-4 mt-3 bg-danger-bg border border-danger rounded-xl px-4 py-3 text-sm text-danger"
    >
      {{ errorMsg }}
    </div>

    <EmptyState
      v-else-if="notFound"
      icon="📢"
      message="찾을 수 없는 공지사항입니다"
    />

    <div v-else-if="notice" class="px-4 pt-4">
      <div class="bg-white rounded-xl px-5 py-5">
        <!-- 제목 + 게시일 -->
        <div class="flex items-center gap-2">
          <span
            v-if="notice.isPinned"
            class="shrink-0 text-xs2 font-semibold text-brand bg-brand-bg px-2 py-0.5 rounded-pill"
          >
            고정
          </span>
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
