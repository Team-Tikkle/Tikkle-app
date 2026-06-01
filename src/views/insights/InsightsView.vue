<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import BottomNav from '@/components/common/BottomNav.vue'

type InsightsTab = 'market' | 'guide'
const activeTab = ref<InsightsTab>('market')

// ── Mock news data (from Figma) ──
const newsItems = [
  {
    id: 'n1',
    title: '삼성전자, 2분기 실적 시장 예상치 상회',
    summary: '반도체 수요 증가에 힘입어 영업이익이 전분기 대비 28% 급증했다.',
    tag: '테크',
    timeAgo: '2시간 전',
  },
  {
    id: 'n2',
    title: 'KOSPI, 월간 기준 신고점 경신',
    summary: '글로벌 경기 우려에도 외국인 순매수 지속으로 지수 강세 흐름 유지.',
    tag: '시장',
    timeAgo: '4시간 전',
  },
  {
    id: 'n3',
    title: 'EV 배터리 섹터 강세 지속',
    summary: 'LG에너지솔루션, SK이노베이션이 섹터 상승을 주도하며 투자자 관심 집중.',
    tag: '에너지',
    timeAgo: '6시간 전',
  },
  {
    id: 'n4',
    title: '미 연준, 기준금리 동결 결정',
    summary: '9월까지 금리를 현 수준으로 유지하기로 결정. 국내 증시에는 긍정적 영향 예상.',
    tag: '거시경제',
    timeAgo: '10시간 전',
  },
]

// ── Mock education data (from Figma) ──
const guideItems = [
  {
    id: 'g1',
    title: 'ETF가 무엇인가요?',
    desc: '상장지수펀드의 개념과 잔돈 투자에서의 활용 방법을 알아봅니다',
    level: '입문',
    levelColor: 'text-brand bg-brand-bg',
    readTime: '읽기 3분',
  },
  {
    id: 'g2',
    title: '분산 투자란 무엇인가요?',
    desc: '달걀을 한 바구니에 담지 않는 투자의 핵심 원리를 이해합니다',
    level: '입문',
    levelColor: 'text-brand bg-brand-bg',
    readTime: '읽기 4분',
  },
  {
    id: 'g3',
    title: '적립식 투자 전략',
    desc: '잔돈 투자의 핵심, 달러 코스트 애버리징(DCA) 전략을 배웁니다',
    level: '초급',
    levelColor: 'text-success bg-green-50',
    readTime: '읽기 5분',
  },
  {
    id: 'g4',
    title: '주식 vs 펀드 차이점',
    desc: '개별 주식과 펀드 투자의 리스크와 수익 구조를 비교합니다',
    level: '초급',
    levelColor: 'text-success bg-green-50',
    readTime: '읽기 6분',
  },
]

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
        @click="activeTab = tab.key as InsightsTab"
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
      <div
        v-for="item in newsItems"
        :key="item.id"
        class="bg-white rounded-xl p-4"
      >
        <div class="flex items-start gap-3">
          <!-- Trend icon -->
          <div class="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center text-brand shrink-0">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="trendUpIcon" />
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-text-primary leading-snug mb-1.5">
              {{ item.title }}
            </h3>
            <p class="text-sm text-text-tertiary leading-relaxed line-clamp-2 mb-2">
              {{ item.summary }}
            </p>
            <div class="flex items-center gap-2">
              <span class="text-xs2 font-semibold text-brand bg-brand-bg px-2 py-0.5 rounded-pill">
                {{ item.tag }}
              </span>
              <span class="text-xs2 text-text-disabled">{{ item.timeAgo }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════ Tab 2: 초보자 가이드 ═══════════ -->
    <div v-else class="px-4 pt-4 flex flex-col gap-3">

      <!-- Personalized recommendation banner -->
      <div class="bg-brand-bg rounded-xl px-4 py-3">
        <p class="text-sm font-bold text-brand">
          위험중립형 투자 성향에 맞는 콘텐츠를 추천드립니다
        </p>
      </div>

      <div
        v-for="item in guideItems"
        :key="item.id"
        class="bg-white rounded-xl p-4"
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
            <p class="text-sm text-text-tertiary leading-relaxed line-clamp-2 mb-2">
              {{ item.desc }}
            </p>
            <div class="flex items-center gap-2">
              <span
                class="text-xs2 font-semibold px-2 py-0.5 rounded-pill"
                :class="item.levelColor"
              >
                {{ item.level }}
              </span>
              <span class="text-xs2 text-text-disabled">{{ item.readTime }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BottomNav />
  </div>
</template>
