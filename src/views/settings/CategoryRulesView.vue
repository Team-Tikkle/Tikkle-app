<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import AppHeader from '@/components/common/AppHeader.vue';
import CategoryRuleSheet from '@/components/settings/CategoryRuleSheet.vue';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { ruleSummary } from '@/utils/format';
import type { CategoryType, RuleType } from '@/types';

const settingsStore = useSettingsStore();

const CATEGORIES: { type: CategoryType; label: string; icon: string }[] = [
  { type: 'CAFE',     label: '카페·디저트', icon: '☕' },
  { type: 'MART',     label: '편의점·마트', icon: '🏪' },
  { type: 'FOOD',     label: '식사·배달',   icon: '🍽️' },
  { type: 'SHOPPING', label: '쇼핑',        icon: '🛍️' },
  { type: 'TRAFFIC',  label: '교통·주유',   icon: '🚌' },
  { type: 'CULTURE',  label: '문화·여가',   icon: '🎬' },
  { type: 'ETC',      label: '기타',        icon: '📦' },
];

const localRules = reactive<Record<CategoryType, RuleType>>(
  Object.fromEntries(CATEGORIES.map((c) => [c.type, 'ROUND_UP_10000'])) as Record<CategoryType, RuleType>,
);

// 서버에서 받은 초기값 스냅샷 — 변경 여부 감지에 사용
const savedRules = reactive<Record<CategoryType, RuleType>>(
  Object.fromEntries(CATEGORIES.map((c) => [c.type, 'ROUND_UP_10000'])) as Record<CategoryType, RuleType>,
);

const isLoading    = ref(true);
const isSaving     = ref(false);
const errorMsg     = ref('');
const openCategory = ref<CategoryType | null>(null);

onMounted(async () => {
  try {
    await settingsStore.fetchSettings();
    for (const rule of settingsStore.spareChangeRules) {
      // 서버가 미설정 카테고리에 ruleType: null 을 반환하므로,
      // null/빈 값은 건너뛰고 기본값(ROUND_UP_10000)을 유지한다.
      if (rule.category in localRules && rule.ruleType) {
        localRules[rule.category]  = rule.ruleType;
        savedRules[rule.category]  = rule.ruleType;
      }
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '설정을 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
});

const openCategoryMeta = computed(() =>
  CATEGORIES.find((c) => c.type === openCategory.value) ?? null,
);

const sheetRule = computed<RuleType>({
  get: () => (openCategory.value ? localRules[openCategory.value] : 'ROUND_UP_10000'),
  set: (v) => { if (openCategory.value) localRules[openCategory.value] = v; },
});

// 서버 값과 달라진 카테고리가 하나라도 있으면 저장 버튼 활성화
const hasChanges = computed(() =>
  CATEGORIES.some((c) => localRules[c.type] !== savedRules[c.type]),
);

function openSheet(type: CategoryType) { openCategory.value = type; }
function closeSheet() { openCategory.value = null; }

async function saveAll() {
  if (!hasChanges.value || isSaving.value) return;
  isSaving.value = true;
  errorMsg.value = '';
  try {
    const rules = CATEGORIES.map((c) => ({ category: c.type, ruleType: localRules[c.type] }));
    await settingsStore.updateSpareChangeRules(rules);
    // 저장 성공 후 스냅샷 동기화
    for (const c of CATEGORIES) savedRules[c.type] = localRules[c.type];
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '저장에 실패했습니다.';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <AppHeader title="잔돈 규칙 설정" :show-back="true" />

    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <span class="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else>
      <div
        v-if="errorMsg"
        class="mx-4 mt-3 bg-danger-bg border border-danger rounded-xl px-4 py-3 text-sm text-danger"
      >
        {{ errorMsg }}
      </div>

      <!-- 카테고리 목록 -->
      <div class="flex-1 overflow-y-auto px-4 pt-3 pb-32">
        <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2 px-1">
          카테고리별 잔돈 규칙
        </p>
        <p class="text-xs2 text-text-tertiary mb-2 px-1 leading-relaxed">
          ※ 5,100원 미만의 잔돈이 발생하면 투자가 진행되지 않습니다.
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
              <span
                class="text-sm font-semibold px-2.5 py-1 rounded-pill transition-colors"
                :class="localRules[cat.type] !== savedRules[cat.type]
                  ? 'bg-brand text-white'
                  : 'bg-brand-bg text-brand'"
              >
                {{ ruleSummary(localRules[cat.type]) }}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" stroke-width="2.5" stroke-linecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </template>

    <!-- 하단 저장 버튼 -->
    <div class="fixed bottom-0 left-0 right-0 max-w-mobile mx-auto px-4 pb-8 pt-3 bg-surface">
      <button
        class="w-full py-4 rounded-xl text-md font-semibold text-white flex items-center justify-center gap-2 transition-colors"
        :class="(hasChanges && !isSaving) ? 'bg-brand active:bg-brand-hover' : 'bg-text-disabled'"
        :disabled="!hasChanges || isSaving"
        @click="saveAll"
      >
        <span v-if="isSaving" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        {{ isSaving ? '저장 중...' : '저장' }}
      </button>
    </div>

    <CategoryRuleSheet
      :category="openCategoryMeta"
      v-model="sheetRule"
      @close="closeSheet"
    />
  </div>
</template>
