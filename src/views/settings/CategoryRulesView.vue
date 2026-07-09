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
  Object.fromEntries(
    CATEGORIES.map((c) => [c.type, 'ROUND_UP_10000']),
  ) as Record<CategoryType, RuleType>,
);

const isLoading    = ref(true);
const isSaving     = ref(false);
const errorMsg     = ref('');
const openCategory = ref<CategoryType | null>(null);

onMounted(async () => {
  try {
    await settingsStore.fetchSettings();
    for (const rule of settingsStore.spareChangeRules) {
      if (rule.category in localRules) localRules[rule.category] = rule.ruleType;
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

// CategoryRuleSheet의 v-model — 시트가 닫혀 있을 때 쓰기 접근을 막기 위해 computed 사용
const sheetRule = computed<RuleType>({
  get: () => (openCategory.value ? localRules[openCategory.value] : 'ROUND_UP_10000'),
  set: (v) => {
    if (openCategory.value) localRules[openCategory.value] = v;
  },
});

function openSheet(type: CategoryType) {
  openCategory.value = type;
}

function closeSheet() {
  openCategory.value = null;
}

async function confirmRule() {
  if (!openCategory.value || isSaving.value) return;
  isSaving.value = true;
  errorMsg.value = '';
  const category = openCategory.value;
  const ruleType = localRules[category];
  try {
    await settingsStore.updateSpareChangeRules([{ category, ruleType }]);
    openCategory.value = null;
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
      <span
        class="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"
      />
    </div>

    <template v-else>
      <div
        v-if="errorMsg"
        class="mx-4 mt-3 bg-danger-bg border border-danger rounded-xl px-4 py-3 text-sm text-danger"
      >
        {{ errorMsg }}
      </div>

      <!-- 카테고리 목록 -->
      <div class="flex-1 overflow-y-auto px-4 pt-3 pb-6">
        <p
          class="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2 px-1"
        >
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
                class="text-sm font-semibold px-2.5 py-1 rounded-pill bg-brand-bg text-brand"
              >
                {{ ruleSummary(localRules[cat.type]) }}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c7c7cc"
                stroke-width="2.5"
                stroke-linecap="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </template>

    <CategoryRuleSheet
      :category="openCategoryMeta"
      :is-saving="isSaving"
      v-model="sheetRule"
      @close="closeSheet"
      @confirm="confirmRule"
    />
  </div>
</template>
