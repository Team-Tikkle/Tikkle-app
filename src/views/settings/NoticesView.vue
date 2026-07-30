<script setup lang="ts">
/**
 * 공지사항 목록 (/settings/notices)
 * 서버가 상단 고정 우선 + 게시일시 내림차순으로 정렬해 주므로 그대로 렌더링한다.
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useNoticeStore } from '@/stores/useNoticeStore'
import { fmtDateDot } from '@/utils/format'

const router = useRouter()
const noticeStore = useNoticeStore()

const isLoading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    if (noticeStore.notices.length === 0) {
      await noticeStore.fetchNotices()
    }
  } catch {
    errorMsg.value = '공지사항을 불러오지 못했어요.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-surface pb-10">
    <AppHeader title="공지사항" :show-back="true" />

    <LoadingSpinner v-if="isLoading" />

    <div
      v-else-if="errorMsg"
      class="mx-4 mt-3 bg-danger-bg border border-danger rounded-xl px-4 py-3 text-sm text-danger"
    >
      {{ errorMsg }}
    </div>

    <EmptyState
      v-else-if="noticeStore.notices.length === 0"
      icon="📢"
      message="등록된 공지사항이 없습니다"
    />

    <div v-else class="px-4 pt-4">
      <div class="bg-white rounded-xl overflow-hidden divide-y divide-surface-border">
        <button
          v-for="notice in noticeStore.notices"
          :key="notice.id"
          class="w-full px-5 py-4 flex items-center gap-3 text-left transition-colors"
          :class="notice.isPinned ? 'bg-brand-bg active:opacity-80' : 'active:bg-surface'"
          @click="router.push({ name: 'settings-notice-detail', params: { id: notice.id } })"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <svg
                v-if="notice.isPinned"
                class="shrink-0 text-brand" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              >
                <path d="M12 17v5" />
                <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
              </svg>
              <span
                class="text-base text-text-primary truncate"
                :class="notice.isPinned ? 'font-bold' : 'font-medium'"
              >
                {{ notice.title }}
              </span>
            </div>
            <p class="text-xs2 text-text-disabled mt-1">
              {{ fmtDateDot(notice.publishedAt) }}
            </p>
          </div>
          <svg
            class="shrink-0" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="#c7c7cc" stroke-width="2.5" stroke-linecap="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
