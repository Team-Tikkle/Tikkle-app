<script setup lang="ts">
defineProps<{
  tag: string;
  question: string;
  options: Record<string, { title: string; desc: string }>;
}>();

const modelValue = defineModel<string>({ required: true });
</script>

<template>
  <div class="px-6 pt-6 flex flex-col gap-6">
    <span class="text-sm font-semibold text-brand">{{ tag }}</span>

    <div class="flex flex-col gap-2">
      <h2 class="text-2xl font-bold text-text-primary leading-snug">
        {{ question }}
      </h2>
    </div>

    <div class="flex flex-col gap-3">
      <button
        v-for="(opt, key) in options"
        :key="key"
        class="w-full text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-0.5"
        :class="
          modelValue === key
            ? 'border-brand bg-brand-bg'
            : 'border-surface-border bg-white'
        "
        @click="modelValue = key"
      >
        <span
          class="text-base font-bold"
          :class="modelValue === key ? 'text-brand' : 'text-text-primary'"
          >{{ opt.title }}</span
        >
        <span
          class="text-sm"
          :class="modelValue === key ? 'text-brand-300' : 'text-text-tertiary'"
          >{{ opt.desc }}</span
        >
      </button>
    </div>
  </div>
</template>
