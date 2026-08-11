<script setup lang="ts">
import RuleSliderEditor from '@/components/common/RuleSliderEditor.vue';
import { useModalBackHandler } from '@/composables/useAndroidBack';
import type { CategoryType, RuleType } from '@/types';

const props = defineProps<{
  category: { type: CategoryType; label: string; icon: string } | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

useModalBackHandler(() => props.category !== null, () => emit('close'));

const modelValue = defineModel<RuleType>({ required: true });
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="props.category !== null"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
        @click.self="emit('close')"
      >
        <Transition
          enter-active-class="transition-transform duration-200 ease-out"
          enter-from-class="translate-y-full"
          leave-active-class="transition-transform duration-150 ease-in"
          leave-to-class="translate-y-full"
        >
          <div
            v-if="props.category !== null"
            class="w-full max-w-mobile bg-white rounded-t-3xl px-6 pt-5 pb-10 flex flex-col gap-5"
          >
            <div class="flex items-center justify-between">
              <h3 class="text-md font-bold text-text-primary flex items-center gap-2">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span class="text-brand flex items-center" v-html="props.category.icon" />
                {{ props.category.label }} 잔돈 규칙
              </h3>
              <button
                class="w-8 h-8 flex items-center justify-center text-text-tertiary"
                @click="emit('close')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <RuleSliderEditor v-model="modelValue" />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
