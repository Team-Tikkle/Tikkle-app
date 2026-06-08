<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import { useUserStore } from '@/stores/useUserStore'
import type { CategoryRoundUpRule } from '@/types'

const router = useRouter()
const userStore = useUserStore()

// ── 20 spending categories with icons ──
const CATEGORIES: { name: string; icon: string }[] = [
  { name: '식음료',    icon: '🍽️' },
  { name: '카페',      icon: '☕' },
  { name: '배달',      icon: '🛵' },
  { name: '편의점',    icon: '🏪' },
  { name: '식당',      icon: '🍜' },
  { name: '교통',      icon: '🚌' },
  { name: '택시',      icon: '🚕' },
  { name: '쇼핑',      icon: '🛍️' },
  { name: '의류',      icon: '👕' },
  { name: '뷰티',      icon: '💄' },
  { name: '마트/슈퍼', icon: '🛒' },
  { name: '의료/약국', icon: '💊' },
  { name: '여가/취미', icon: '🎮' },
  { name: '문화생활',  icon: '🎬' },
  { name: '여행',      icon: '✈️' },
  { name: '숙박',      icon: '🏨' },
  { name: '통신',      icon: '📱' },
  { name: '교육',      icon: '📚' },
  { name: '구독',      icon: '🔄' },
  { name: '기타',      icon: '📦' },
]

// Local editable copy of rules, keyed by category name
const localRules = reactive<Record<string, CategoryRoundUpRule>>(
  Object.fromEntries(
    CATEGORIES.map(({ name }) => {
      const saved = userStore.categoryRules.find((r) => r.category === name)
      return [
        name,
        saved
          ? { ...saved }
          : { category: name, type: 'fixed' as const, value: 1000 },
      ]
    }),
  ),
)

// Which category's bottom sheet is open (null = none)
const openCategory = ref<string | null>(null)

// Fixed unit options
const FIXED_OPTIONS: { label: string; value: number }[] = [
  { label: '100원',   value: 100 },
  { label: '500원',   value: 500 },
  { label: '1,000원', value: 1000 },
]

// Percent options
const PERCENT_OPTIONS = [1, 3, 5, 10, 20]

function openSheet(name: string) {
  openCategory.value = name
}

function closeSheet() {
  openCategory.value = null
}

// Summary label shown on the category row
function ruleSummary(rule: CategoryRoundUpRule): string {
  if (rule.type === 'fixed') {
    return `${rule.value.toLocaleString('ko-KR')}원 올림`
  }
  return `${rule.value}%`
}

// Save all rules to Pinia and navigate back
function saveAll() {
  userStore.saveCategoryRules(Object.values(localRules))
  router.back()
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <AppHeader title="소비 카테고리별 잔돈 규칙" :show-back="true" />

    <!-- Category list -->
    <div class="flex-1 overflow-y-auto px-4 pt-3 pb-32">
      <div class="bg-white rounded-xl overflow-hidden divide-y divide-surface-border">
        <button
          v-for="cat in CATEGORIES"
          :key="cat.name"
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface transition-colors"
          @click="openSheet(cat.name)"
        >
          <!-- Icon + name -->
          <div class="flex items-center gap-3">
            <span class="text-xl w-7 text-center leading-none">{{ cat.icon }}</span>
            <span class="text-base font-medium text-text-primary">{{ cat.name }}</span>
          </div>

          <!-- Current rule badge + chevron -->
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-brand bg-brand-bg px-2.5 py-1 rounded-pill">
              {{ ruleSummary(localRules[cat.name]) }}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" stroke-width="2.5" stroke-linecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </button>
      </div>
    </div>

    <!-- Save button (sticky bottom) -->
    <div class="sticky bottom-0 bg-surface px-6 pt-3 pb-8 border-t border-surface-border">
      <button
        class="w-full py-4 rounded-xl bg-brand text-white text-md font-semibold active:bg-brand-hover"
        @click="saveAll"
      >
        저장
      </button>
    </div>

    <!-- ════ Bottom sheet overlay ════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="openCategory !== null"
          class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          @click.self="closeSheet"
        >
          <Transition
            enter-active-class="transition-transform duration-200 ease-out"
            enter-from-class="translate-y-full"
            leave-active-class="transition-transform duration-150 ease-in"
            leave-to-class="translate-y-full"
          >
            <div
              v-if="openCategory !== null"
              class="w-full max-w-mobile bg-white rounded-t-3xl px-6 pt-5 pb-10 flex flex-col gap-5"
            >
              <!-- Sheet header -->
              <div class="flex items-center justify-between">
                <h3 class="text-md font-bold text-text-primary">
                  {{ CATEGORIES.find(c => c.name === openCategory)?.icon }}
                  {{ openCategory }} 잔돈 규칙
                </h3>
                <button
                  class="w-8 h-8 flex items-center justify-center text-text-tertiary"
                  @click="closeSheet"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <!-- Type toggle -->
              <div>
                <p class="text-sm font-semibold text-text-secondary mb-2">적립 방식</p>
                <div class="bg-surface-alt rounded-xl p-1 flex gap-1">
                  <button
                    class="flex-1 py-2.5 rounded-lg text-base font-semibold transition-all"
                    :class="localRules[openCategory!].type === 'fixed'
                      ? 'bg-white text-text-primary shadow-sm'
                      : 'text-text-tertiary'"
                    @click="localRules[openCategory!].type = 'fixed'; localRules[openCategory!].value = 1000"
                  >
                    올림 잔돈
                  </button>
                  <button
                    class="flex-1 py-2.5 rounded-lg text-base font-semibold transition-all"
                    :class="localRules[openCategory!].type === 'percent'
                      ? 'bg-white text-text-primary shadow-sm'
                      : 'text-text-tertiary'"
                    @click="localRules[openCategory!].type = 'percent'; localRules[openCategory!].value = 5"
                  >
                    비율
                  </button>
                </div>
              </div>

              <!-- Fixed unit options -->
              <div v-if="localRules[openCategory!].type === 'fixed'">
                <p class="text-sm font-semibold text-text-secondary mb-3">올림 단위</p>
                <div class="flex gap-2">
                  <button
                    v-for="opt in FIXED_OPTIONS"
                    :key="opt.value"
                    class="flex-1 py-3 rounded-xl border-2 text-base font-semibold transition-all"
                    :class="localRules[openCategory!].value === opt.value
                      ? 'border-brand bg-brand-bg text-brand'
                      : 'border-surface-border text-text-tertiary'"
                    @click="localRules[openCategory!].value = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- Percent options -->
              <div v-else>
                <p class="text-sm font-semibold text-text-secondary mb-3">적립 비율</p>
                <div class="flex gap-2 flex-wrap">
                  <button
                    v-for="pct in PERCENT_OPTIONS"
                    :key="pct"
                    class="px-4 py-2.5 rounded-xl border-2 text-base font-semibold transition-all"
                    :class="localRules[openCategory!].value === pct
                      ? 'border-brand bg-brand-bg text-brand'
                      : 'border-surface-border text-text-tertiary'"
                    @click="localRules[openCategory!].value = pct"
                  >
                    {{ pct }}%
                  </button>
                </div>
              </div>

              <!-- Confirm button -->
              <button
                class="w-full py-4 rounded-xl bg-brand text-white text-md font-semibold active:bg-brand-hover"
                @click="closeSheet"
              >
                확인
              </button>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
