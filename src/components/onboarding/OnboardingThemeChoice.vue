<script setup lang="ts">
import type { CryptoTheme } from '@/types';

const modelValue = defineModel<CryptoTheme[]>({ required: true });

const THEME_LABELS: Record<CryptoTheme, { title: string; sub: string }> = {
  LAYER_1: {
    title: '메이저 코인',
    sub: '비트코인, 이더리움 등 시장을 주도하는 대표 코인',
  },
  DEFI: {
    title: '스마트 금융 (디파이)',
    sub: '은행 없이 코인으로 예금·대출을 하는 금융 서비스',
  },
  AI: { title: 'AI 테마', sub: '인공지능 기술 및 데이터 혁신 관련 프로젝트' },
  WEB3_GAMING: {
    title: '게임·문화 (웹3)',
    sub: '게임 아이템 소유 및 엔터테인먼트 중심 생태계',
  },
  RWA: {
    title: '실물 자산 (RWA)',
    sub: '부동산, 금, 국채 등 실제 자산과 연동된 코인',
  },
  MEME: { title: '트렌드 밈(Meme)', sub: '커뮤니티 팬덤 기반 코인' },
};

function toggle(theme: CryptoTheme) {
  const i = modelValue.value.indexOf(theme);
  const next = [...modelValue.value];
  if (i >= 0) next.splice(i, 1);
  else next.push(theme);
  modelValue.value = next;
}
</script>

<template>
  <div class="px-6 pt-6 flex flex-col gap-6">
    <span class="text-sm font-semibold text-brand">Q5 · 관심 분야</span>

    <div class="flex flex-col gap-2">
      <h2 class="text-2xl font-bold text-text-primary leading-snug">
        가장 관심 있는 가상자산 분야를 모두 선택해 주세요.
      </h2>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="(opt, key) in THEME_LABELS"
        :key="key"
        class="text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-0.5"
        :class="
          modelValue.includes(key as CryptoTheme)
            ? 'border-brand bg-brand-bg'
            : 'border-surface-border bg-white'
        "
        @click="toggle(key as CryptoTheme)"
      >
        <span
          class="text-base font-bold"
          :class="
            modelValue.includes(key as CryptoTheme)
              ? 'text-brand'
              : 'text-text-primary'
          "
          >{{ opt.title }}</span
        >
        <span
          class="text-xs2"
          :class="
            modelValue.includes(key as CryptoTheme)
              ? 'text-brand-300'
              : 'text-text-tertiary'
          "
          >{{ opt.sub }}</span
        >
      </button>
    </div>
  </div>
</template>
