<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { RuleType } from '@/types';

const props = defineProps<{ modelValue: RuleType }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: RuleType): void }>();

const ROUND_UP_OPTIONS: { value: RuleType; amount: number; tick: string }[] = [
  { value: 'ROUND_UP_10000', amount: 10000, tick: '1만' },
  { value: 'ROUND_UP_20000', amount: 20000, tick: '2만' },
  { value: 'ROUND_UP_30000', amount: 30000, tick: '3만' },
  { value: 'ROUND_UP_40000', amount: 40000, tick: '4만' },
  { value: 'ROUND_UP_50000', amount: 50000, tick: '5만' },
];
const PERCENT_OPTIONS: { value: RuleType; percent: number; tick: string }[] = [
  { value: 'PERCENT_10', percent: 10, tick: '10%' },
  { value: 'PERCENT_15', percent: 15, tick: '15%' },
  { value: 'PERCENT_20', percent: 20, tick: '20%' },
  { value: 'PERCENT_25', percent: 25, tick: '25%' },
  { value: 'PERCENT_30', percent: 30, tick: '30%' },
];

function modeFrom(v: RuleType): 'ROUND_UP' | 'PERCENT' {
  return v.startsWith('ROUND_UP') ? 'ROUND_UP' : 'PERCENT';
}
function indexFrom(v: RuleType, mode: 'ROUND_UP' | 'PERCENT'): number {
  const list = mode === 'ROUND_UP' ? ROUND_UP_OPTIONS : PERCENT_OPTIONS;
  const i = list.findIndex((o) => o.value === v);
  return i >= 0 ? i : 0;
}

const ruleMode = ref<'ROUND_UP' | 'PERCENT'>(modeFrom(props.modelValue));
const roundUpIndex = ref(indexFrom(props.modelValue, 'ROUND_UP'));
const percentIndex = ref(indexFrom(props.modelValue, 'PERCENT'));

const activeOptions = computed(() =>
  ruleMode.value === 'ROUND_UP' ? ROUND_UP_OPTIONS : PERCENT_OPTIONS,
);
const activeIndex = computed<number>({
  get: () =>
    ruleMode.value === 'ROUND_UP' ? roundUpIndex.value : percentIndex.value,
  set: (v) => {
    if (ruleMode.value === 'ROUND_UP') roundUpIndex.value = v;
    else percentIndex.value = v;
    emit('update:modelValue', activeOptions.value[v].value);
  },
});

// 방식 토글 시 현재 인덱스 기준으로 즉시 emit
watch(ruleMode, () => {
  emit('update:modelValue', activeOptions.value[activeIndex.value].value);
});

const ruleValueLabel = computed(() =>
  ruleMode.value === 'ROUND_UP'
    ? `${ROUND_UP_OPTIONS[roundUpIndex.value].amount.toLocaleString('ko-KR')}원`
    : `${PERCENT_OPTIONS[percentIndex.value].percent}%`,
);
const ruleDescription = computed(() =>
  ruleMode.value === 'ROUND_UP'
    ? `결제 후 ${ROUND_UP_OPTIONS[roundUpIndex.value].amount.toLocaleString('ko-KR')}원 단위로 올림한 잔돈을 적립합니다`
    : `결제 금액의 ${PERCENT_OPTIONS[percentIndex.value].percent}%를 잔돈으로 자동 적립합니다`,
);
const sliderFillStyle = computed(() => {
  const max = activeOptions.value.length - 1;
  const pct = max > 0 ? (activeIndex.value / max) * 100 : 0;
  return {
    background: `linear-gradient(to right, #0051ff 0%, #0051ff ${pct}%, #e5e5ea ${pct}%, #e5e5ea 100%)`,
  };
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="text-sm font-semibold text-text-secondary">잔돈 적립 방식</p>

    <!-- 방식 토글 -->
    <div class="bg-surface-alt rounded-2xl p-1 flex gap-1">
      <button
        class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
        :class="
          ruleMode === 'ROUND_UP'
            ? 'bg-white text-text-primary shadow-sm'
            : 'text-text-tertiary'
        "
        @click="ruleMode = 'ROUND_UP'"
      >
        올림 잔돈 적립
      </button>
      <button
        class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
        :class="
          ruleMode === 'PERCENT'
            ? 'bg-white text-text-primary shadow-sm'
            : 'text-text-tertiary'
        "
        @click="ruleMode = 'PERCENT'"
      >
        비율 잔돈 적립
      </button>
    </div>

    <!-- 슬라이더 값 카드 -->
    <div
      class="bg-white border border-surface-border rounded-2xl px-5 py-5 flex flex-col gap-3"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm text-text-tertiary">
          {{ ruleMode === 'ROUND_UP' ? '적립 단위' : '적립 비율' }}
        </span>
        <span class="text-lg font-bold text-text-primary">{{
          ruleValueLabel
        }}</span>
      </div>
      <p class="text-xs text-text-tertiary">{{ ruleDescription }}</p>

      <input
        v-model.number="activeIndex"
        type="range"
        min="0"
        :max="activeOptions.length - 1"
        step="1"
        class="tikkle-range w-full mt-1"
        :style="sliderFillStyle"
      />

      <div class="flex justify-between">
        <span
          v-for="(opt, i) in activeOptions"
          :key="opt.value"
          class="text-xs transition-colors"
          :class="
            activeIndex === i ? 'text-brand font-semibold' : 'text-text-disabled'
          "
          >{{ opt.tick }}</span
        >
      </div>
    </div>

    <p class="text-xs2 text-text-tertiary leading-relaxed">
      ※ 5,100원 미만의 잔돈이 발생한 경우에는 투자가 진행되지 않습니다.
    </p>
  </div>
</template>

<style scoped>
.tikkle-range {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 9999px;
  outline: none;
  cursor: pointer;
}
.tikkle-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  margin-top: -8px;
  border-radius: 9999px;
  background: #0051ff;
  border: 3px solid #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.tikkle-range::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: #0051ff;
  border: 3px solid #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.tikkle-range::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 9999px;
  background: transparent;
}
.tikkle-range::-moz-range-track {
  height: 6px;
  border-radius: 9999px;
  background: transparent;
}
</style>
