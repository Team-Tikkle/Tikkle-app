<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import BottomNav from '@/components/common/BottomNav.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ArticleDetailSheet from '@/components/insights/ArticleDetailSheet.vue'
import { useInsightStore } from '@/stores/useInsightStore'
import { useModalBackHandler } from '@/composables/useAndroidBack'

const router = useRouter()
const route = useRoute()
const insightStore = useInsightStore()

type InsightsTab = 'market' | 'guide'
const activeTab = ref<InsightsTab>(route.query.tab === 'guide' ? 'guide' : 'market')

function setTab(tab: InsightsTab) {
  activeTab.value = tab
  router.replace({ query: tab === 'market' ? {} : { tab } })
}

// Per-tab loading flags so each section can show its own spinner
const marketLoading = ref(true)
const guideLoading = ref(true)

// Currently expanded article in the bottom sheet (null = closed)
const selectedArticleId = ref<string | null>(null)

// Format an ISO timestamp into a compact "x시간 전" relative label.
// Returns '' for missing/unparseable dates so the UI never shows "NaN".
function timeAgo(iso?: string): string {
  if (!iso) return ''
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ''
  const minutes = Math.floor((Date.now() - time) / 60_000)
  if (minutes < 60) return `${Math.max(minutes, 1)}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

// 외부 링크 확인 모달
const externalUrl = ref<string | null>(null)

function promptExternal(url: string) {
  if (url && url !== '#') externalUrl.value = url
}

function confirmExternal() {
  if (externalUrl.value) window.open(externalUrl.value, '_blank', 'noopener')
  externalUrl.value = null
}

// 안드로이드 뒤로가기 버튼이 앱 종료 안내 대신 이 모달을 닫도록 등록한다.
useModalBackHandler(() => externalUrl.value !== null, () => { externalUrl.value = null })

function goToGlossary() {
  router.push({ name: 'insights-glossary' })
}

onMounted(() => {
  // Fetch both tabs up-front so switching tabs is instant
  insightStore.fetchMarketTopics().finally(() => (marketLoading.value = false))
  Promise.all([
    insightStore.fetchArticles(),
    insightStore.fetchVideos(),
  ]).finally(() => (guideLoading.value = false))
})

// Trend arrow icon (up)
const trendUpIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`

// Book icon
const bookIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
</script>

<template>
  <div class="min-h-screen bg-surface pb-24">
    <AppHeader title="인사이트" />

    <!-- ── Tabs ── -->
    <div class="bg-white border-b border-surface-border flex">
      <button
        v-for="tab in [{ key: 'market', label: '오늘의 마켓 토픽' }, { key: 'guide', label: '초보자 가이드' }]"
        :key="tab.key"
        class="flex-1 py-3.5 text-base font-semibold transition-all relative"
        :class="activeTab === tab.key ? 'text-brand' : 'text-text-tertiary'"
        @click="setTab(tab.key as InsightsTab)"
      >
        {{ tab.label }}
        <!-- Active underline -->
        <span
          v-if="activeTab === tab.key"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
        />
      </button>
    </div>

    <!-- ═══════════ Tab 1: 오늘의 마켓 토픽 ═══════════ -->
    <div v-if="activeTab === 'market'" class="px-4 pt-4 flex flex-col gap-3">
      <LoadingSpinner v-if="marketLoading" />

      <EmptyState
        v-else-if="insightStore.marketTopics.length === 0"
        icon="📈"
        message="표시할 마켓 토픽이 없습니다"
      />

      <button
        v-for="item in insightStore.marketTopics"
        v-else
        :key="item.id"
        class="bg-white rounded-xl p-4 text-left active:bg-surface transition-colors"
        @click="promptExternal(item.source_url)"
      >
        <div class="flex items-start gap-3">
          <!-- Thumbnail when the API provides one; trend icon as fallback -->
          <img
            v-if="item.thumbnail_url"
            :src="item.thumbnail_url"
            alt=""
            class="w-16 h-16 rounded-lg object-cover bg-surface shrink-0"
            loading="lazy"
          >
          <div
            v-else
            class="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center text-brand shrink-0"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="trendUpIcon" />
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-text-primary leading-snug mb-1.5">
              {{ item.title }}
            </h3>
            <!-- Press · relative time -->
            <div class="flex items-center gap-1.5 text-xs2 text-text-disabled">
              <span v-if="item.press" class="font-medium text-text-tertiary">{{ item.press }}</span>
              <span v-if="item.press && timeAgo(item.published_at)">·</span>
              <span v-if="timeAgo(item.published_at)">{{ timeAgo(item.published_at) }}</span>
            </div>
          </div>
        </div>
      </button>
    </div>

    <!-- ═══════════ Tab 2: 초보자 가이드 ═══════════ -->
    <div v-else class="px-4 pt-4 flex flex-col gap-6">

      <!-- ── Section A: Investment glossary entry card ── -->
      <button
        class="w-full flex items-center gap-3 bg-brand rounded-xl px-4 py-4 text-left active:opacity-90 transition-opacity"
        @click="goToGlossary"
      >
        <div class="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="bookIcon" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-bold text-white">투자 용어집 바로가기</h3>
          <p class="text-sm text-white/80">투자 용어를 한눈에 살펴보세요</p>
        </div>
        <svg class="text-white/80 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <!-- ── Section B: Beginner articles ── -->
      <section class="flex flex-col gap-3">
        <h2 class="text-base font-bold text-text-primary px-0.5">초보자를 위한 글</h2>

        <LoadingSpinner v-if="guideLoading" />

        <EmptyState
          v-else-if="insightStore.articles.length === 0"
          icon="📚"
          message="등록된 글이 없습니다"
        />

        <div v-else class="flex flex-col gap-2">
        <button
          v-for="item in insightStore.articles"
          :key="item.id"
          class="bg-white rounded-xl p-4 text-left active:bg-surface transition-colors w-full"
          @click="selectedArticleId = item.id"
        >
          <div class="flex items-start gap-3">
            <!-- Book icon -->
            <div class="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center text-brand shrink-0">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="bookIcon" />
            </div>

            <div class="flex-1 min-w-0">
              <h3 class="text-base font-semibold text-text-primary leading-snug mb-1.5">
                {{ item.title }}
              </h3>
              <div
                v-if="timeAgo(item.published_at)"
                class="flex items-center text-xs2 text-text-disabled"
              >
                {{ timeAgo(item.published_at) }}
              </div>
            </div>
          </div>
        </button>
        </div>
      </section>

      <!-- ── Section C: Recommended videos ── -->
      <section class="flex flex-col gap-3">
        <h2 class="text-base font-bold text-text-primary px-0.5">추천 영상</h2>

        <LoadingSpinner v-if="guideLoading" />

        <EmptyState
          v-else-if="insightStore.videos.length === 0"
          icon="🎬"
          message="추천 영상이 없습니다"
        />

        <button
          v-for="video in insightStore.videos"
          v-else
          :key="video.id"
          class="bg-white rounded-xl overflow-hidden text-left active:opacity-90 transition-opacity"
          @click="promptExternal(video.video_url)"
        >
          <!-- Thumbnail with play overlay -->
          <div class="relative aspect-video bg-surface">
            <img
              :src="video.thumbnail_url"
              :alt="video.title"
              class="w-full h-full object-cover"
            >
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
              </span>
            </div>
          </div>
          <div class="p-4">
            <h3 class="text-base font-semibold text-text-primary leading-snug">
              {{ video.title }}
            </h3>
            <p v-if="video.channel_name" class="text-sm text-text-tertiary mt-1">
              {{ video.channel_name }}
            </p>
          </div>
        </button>
      </section>
    </div>

    <!-- Bottom-sheet article detail -->
    <ArticleDetailSheet
      :article-id="selectedArticleId"
      @close="selectedArticleId = null"
    />

    <!-- 외부 링크 확인 모달 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="externalUrl"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          @click.self="externalUrl = null"
        >
          <div class="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
            <div class="px-6 pt-6 pb-5 flex flex-col gap-3">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-brand-bg flex items-center justify-center text-brand shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </div>
                <h3 class="text-base font-bold text-text-primary">외부 사이트로 이동</h3>
              </div>
              <p class="text-sm text-text-secondary leading-relaxed">
                티끌 앱을 벗어나 외부 사이트로 이동합니다.
              </p>
              <p class="text-xs text-text-secondary break-all bg-surface rounded-lg px-3 py-2 font-mono leading-relaxed">
                {{ externalUrl }}
              </p>
            </div>
            <div class="flex border-t border-surface-border">
              <button
                class="flex-1 py-4 text-base font-medium text-text-tertiary active:bg-surface transition-colors"
                @click="externalUrl = null"
              >
                취소
              </button>
              <div class="w-px bg-surface-border" />
              <button
                class="flex-1 py-4 text-base font-semibold text-brand active:bg-brand-bg transition-colors"
                @click="confirmExternal"
              >
                이동
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <BottomNav />
  </div>
</template>
