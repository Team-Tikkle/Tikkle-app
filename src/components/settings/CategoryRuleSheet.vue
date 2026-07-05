<script setup lang="ts">
import RuleSliderEditor from '@/components/common/RuleSliderEditor.vue';
import type { CategoryType, RuleType } from '@/types';

const props = defineProps<{
  category: { type: CategoryType; label: string; icon: string } | null;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();

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
            <!-- 시트 헤더 -->
            <div class="flex items-center justify-between">
              <h3 class="text-md font-bold text-text-primary">
                {{ props.category.icon }} {{ props.category.label }} 잔돈 규칙
              </h3>
              <button
                class="w-8 h-8 flex items-center justify-center text-text-tertiary"
                @click="emit('close')"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <RuleSliderEditor v-model="modelValue" />

            <button
              class="w-full py-4 rounded-xl text-md font-semibold text-white flex items-center justify-center gap-2 transition-colors"
              :class="
                props.isSaving
                  ? 'bg-text-disabled'
                  : 'bg-brand active:bg-brand-hover'
              "
              :disabled="props.isSaving"
              @click="emit('confirm')"
            >
              <span
                v-if="props.isSaving"
                class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
              />
              {{ props.isSaving ? '저장 중...' : '확인' }}
            </button>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
