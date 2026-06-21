<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { CategoryType, RuleType } from '@/types'

const settingsStore = useSettingsStore()

// ── 백엔드 7개 카테고리 ──
const CATEGORIES: { type: CategoryType; label: string; icon: string }[] = [
  { type: 'CAFE',     label: '카페·디저트',  icon: '☕' },
  { type: 'MART',     label: '편의점·마트',  icon: '🏪' },
  { type: 'FOOD',     label: '식사·배달',    icon: '🍽️' },
  { type: 'SHOPPING', label: '쇼핑',         icon: '🛍️' },
  { type: 'TRAFFIC',  label: '교통·주유',    icon: '🚌' },
  { type: 'CULTURE',  label: '문화·여가',    icon: '🎬' },
  { type: 'ETC',      label: '기타',         icon: '📦' },
]

const ROUND_UP_OPTIONS: { value: RuleType; label: string }[] = [
  { value: 'ROUND_UP_10000', label: '10,000원' },
  { value: 'ROUND_UP_50000', label: '50,000원' },
]

const PERCENT_OPTIONS: { value: RuleType; label: string }[] = [
  { value: 'PERCENT_5',  label: '5%' },
  { value: 'PERCENT_10', label: '10%' },
  { value: 'PERCENT_20', label: '20%' },
  { value: 'PERCENT_30', label: '30%' },
]

// ── 로컬 편집 상태 ──
const localRules = reactive<Record<CategoryType, RuleType>>(
  Object.fromEntries(CATEGORIES.map(c => [c.type, 'ROUND_UP_10000'])) as Record<CategoryType, RuleType>
)

// ── 자동/수동 매매 로컬 상태 ──
const localExecutionMode = ref<'AUTO' | 'MANUAL'>('AUTO')
const isTogglingMode = ref(false)

async function toggleExecutionMode() {
  if (isTogglingMode.value) return
  isTogglingMode.value = true
  const next = localExecutionMode.value === 'AUTO' ? 'MANUAL' : 'AUTO'
  try {
    await settingsStore.updateExecutionMode(next)
    localExecutionMode.value = next
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '매매 방식 변경에 실패했습니다.'
  } finally {
    isTogglingMode.value = false
  }
}

// ── UI 상태 ──
const isLoading    = ref(true)
const isSaving     = ref(false)
const errorMsg     = ref('')
const openCategory = ref<CategoryType | null>(null)

// 시트 안에서 올림/비율 탭 — 열 때 현재 ruleType에서 파생
const sheetMode = ref<'ROUND_UP' | 'PERCENT'>('ROUND_UP')

function ruleToMode(r: RuleType): 'ROUND_UP' | 'PERCENT' {
  if (r.startsWith('PERCENT')) return 'PERCENT'
  return 'ROUND_UP'
}

// ── 초기 조회 ──
onMounted(async () => {
  try {
    await settingsStore.fetchSettings()
    localExecutionMode.value = settingsStore.executionMode
    for (const rule of settingsStore.spareChangeRules) {
      if (rule.category in localRules) {
        localRules[rule.category] = rule.ruleType
      }
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '설정을 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
})

// ── 바텀 시트 ──
function openSheet(type: CategoryType) {
  openCategory.value = type
  sheetMode.value    = ruleToMode(localRules[type])
}

function closeSheet() {
  openCategory.value = null
}

function selectRule(rule: RuleType) {
  if (openCategory.value) localRules[openCategory.value] = rule
}

// ── 규칙 요약 라벨 ──
const ALL_OPTIONS = [...ROUND_UP_OPTIONS, ...PERCENT_OPTIONS]

function ruleSummary(rule: RuleType): string {
  const found = ALL_OPTIONS.find(o => o.value === rule)
  if (!found) return rule
  return rule.startsWith('ROUND_UP') ? `${found.label} 단위 올림` : `${found.label} 적립`
}

// ── 확인 버튼: 해당 카테고리 규칙만 즉시 저장 ──
async function confirmRule() {
  if (!openCategory.value || isSaving.value) return
  isSaving.value = true
  errorMsg.value = ''
  const category = openCategory.value
  const ruleType = localRules[category]
  try {
    await settingsStore.updateSpareChangeRules([{ category, ruleType }])
    openCategory.value = null
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '저장에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <AppHeader title="카테고리별 잔돈 규칙" :show-back="true" />

    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <span class="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else>
      <!-- Error banner -->
      <div
        v-if="errorMsg"
        class="mx-4 mt-3 bg-danger-bg border border-danger rounded-xl px-4 py-3 text-sm text-danger"
      >
        {{ errorMsg }}
      </div>

      <!-- 매매 방식 -->
      <div class="px-4 pt-3">
        <div class="bg-white rounded-xl px-5 py-4 flex items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="text-base font-medium text-text-primary">자동 매매</span>
            <span class="text-sm text-text-tertiary">
              {{ localExecutionMode === 'AUTO' ? '잔돈이 모이면 자동으로 투자합니다' : '매매 전 직접 확인 후 실행합니다' }}
            </span>
          </div>
          <!-- 토글 스위치 -->
          <button
            class="relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-50"
            :class="localExecutionMode === 'AUTO' ? 'bg-brand' : 'bg-surface-border'"
            :disabled="isTogglingMode"
            @click="toggleExecutionMode"
          >
            <span
              class="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200"
              :class="localExecutionMode === 'AUTO' ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </div>

      <!-- Category list -->
      <div class="flex-1 overflow-y-auto px-4 pt-3 pb-6">
        <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2 px-1">카테고리별 잔돈 규칙</p>
        <p class="text-xs2 text-text-tertiary mb-2 px-1 leading-relaxed">
          ※ 5,000원 미만의 잔돈이 발생하면 투자가 진행되지 않습니다.
        </p>
        <div class="bg-white rounded-xl overflow-hidden divide-y divide-surface-border">
          <button
            v-for="cat in CATEGORIES"
            :key="cat.type"
            class="w-full px-5 py-4 flex items-center justify-between active:bg-surface transition-colors"
            @click="openSheet(cat.type)"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl w-7 text-center leading-none">{{ cat.icon }}</span>
              <span class="text-base font-medium text-text-primary">{{ cat.label }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold px-2.5 py-1 rounded-pill bg-brand-bg text-brand">
                {{ ruleSummary(localRules[cat.type]) }}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" stroke-width="2.5" stroke-linecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </button>
        </div>
      </div>

    </template>

    <!-- ── 바텀 시트 ── -->
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
              <!-- 시트 헤더 -->
              <div class="flex items-center justify-between">
                <h3 class="text-md font-bold text-text-primary">
                  {{ CATEGORIES.find(c => c.type === openCategory)?.icon }}
                  {{ CATEGORIES.find(c => c.type === openCategory)?.label }} 잔돈 규칙
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

              <!-- 방식 탭 -->
              <div class="bg-surface-alt rounded-xl p-1 flex gap-1">
                <button
                  class="flex-1 py-2.5 rounded-lg text-base font-semibold transition-all"
                  :class="sheetMode === 'ROUND_UP'
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-tertiary'"
                  @click="sheetMode = 'ROUND_UP'; selectRule('ROUND_UP_10000')"
                >올림</button>
                <button
                  class="flex-1 py-2.5 rounded-lg text-base font-semibold transition-all"
                  :class="sheetMode === 'PERCENT'
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-tertiary'"
                  @click="sheetMode = 'PERCENT'; selectRule('PERCENT_5')"
                >비율</button>
              </div>

              <!-- 올림 옵션 -->
              <div v-if="sheetMode === 'ROUND_UP'">
                <p class="text-sm font-semibold text-text-secondary mb-3">올림 단위</p>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="opt in ROUND_UP_OPTIONS"
                    :key="opt.value"
                    class="py-3 rounded-xl border-2 text-base font-semibold transition-all"
                    :class="localRules[openCategory!] === opt.value
                      ? 'border-brand bg-brand-bg text-brand'
                      : 'border-surface-border text-text-tertiary'"
                    @click="selectRule(opt.value)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- 비율 옵션 -->
              <div v-else-if="sheetMode === 'PERCENT'">
                <p class="text-sm font-semibold text-text-secondary mb-3">적립 비율</p>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="opt in PERCENT_OPTIONS"
                    :key="opt.value"
                    class="py-3 rounded-xl border-2 text-base font-semibold transition-all"
                    :class="localRules[openCategory!] === opt.value
                      ? 'border-brand bg-brand-bg text-brand'
                      : 'border-surface-border text-text-tertiary'"
                    @click="selectRule(opt.value)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <button
                class="w-full py-4 rounded-xl text-md font-semibold text-white flex items-center justify-center gap-2 transition-colors"
                :class="isSaving ? 'bg-text-disabled' : 'bg-brand active:bg-brand-hover'"
                :disabled="isSaving"
                @click="confirmRule"
              >
                <span
                  v-if="isSaving"
                  class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                />
                {{ isSaving ? '저장 중...' : '확인' }}
              </button>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
