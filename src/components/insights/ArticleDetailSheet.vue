<script setup lang="ts">
import { ref, watch } from 'vue'
import type { InsightArticle } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { useInsightStore } from '@/stores/useInsightStore'

// `articleId` drives the sheet: a non-null id opens it and triggers a detail
// fetch; null keeps it closed. The parent owns the id and listens for `close`.
const props = defineProps<{ articleId: string | null }>()
const emit = defineEmits<{ close: [] }>()

const insightStore = useInsightStore()

const article = ref<InsightArticle | null>(null)
const isLoading = ref(false)

// Fetch the full article body each time a new id is supplied
watch(
  () => props.articleId,
  async (id) => {
    if (!id) {
      article.value = null
      return
    }
    isLoading.value = true
    article.value = null
    try {
      article.value = await insightStore.fetchArticle(id)
    } finally {
      isLoading.value = false
    }
  },
)

function close() {
  emit('close')
}
</script>

<template>
  <!-- Backdrop fades in/out; the panel slides up from the bottom -->
  <Transition name="sheet-fade">
    <div
      v-if="articleId"
      class="fixed inset-0 z-[60] bg-black/40"
      @click.self="close"
    >
      <!-- Panel pinned to the bottom, centered within the 430px mobile frame -->
      <Transition name="sheet-slide" appear>
        <div
          v-if="articleId"
          class="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile
                 h-[90vh] bg-surface rounded-t-2xl flex flex-col overflow-hidden"
        >
          <!-- Grab handle + close button -->
          <div class="relative pt-3 pb-2 shrink-0">
            <div class="mx-auto w-10 h-1 rounded-full bg-surface-border" />
            <button
              class="absolute top-2 right-4 w-8 h-8 flex items-center justify-center text-text-tertiary"
              aria-label="닫기"
              @click="close"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Scrollable body -->
          <div class="flex-1 overflow-y-auto px-5 pb-8">
            <LoadingSpinner v-if="isLoading" />

            <template v-else-if="article">
              <h2 class="text-xl font-bold text-text-primary leading-snug mb-4">
                {{ article.title }}
              </h2>
              <!-- Optional header image from the detail endpoint -->
              <img
                v-if="article.thumbnail_url"
                :src="article.thumbnail_url"
                alt=""
                class="w-full rounded-xl object-cover mb-4"
              >
              <!-- Article body — preserves backend line breaks -->
              <p class="text-base text-text-secondary leading-relaxed whitespace-pre-line">
                {{ article.body }}
              </p>
            </template>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
/* Backdrop fade */
.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

/* Panel slide up from the bottom */
.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translate(-50%, 100%);
}
</style>
