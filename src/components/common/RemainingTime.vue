<script setup lang="ts">
/**
 * Reactive countdown label for a PENDING payment's approval deadline.
 * Wraps useRemainingTime so each row gets its own 60s-ticking instance
 * (a composable can't be called inside a v-for, hence this per-item component).
 */
import { computed } from 'vue'
import { useRemainingTime } from '@/composables/useRemainingTime'

const props = defineProps<{ expiredAt: string }>()
const { remaining } = useRemainingTime(props.expiredAt)

const colorClass = computed(() => {
  switch (remaining.value?.status) {
    case 'expired': return 'text-gray-400'
    case 'minutes': return 'text-red-500'
    default:        return 'text-amber-500'
  }
})
</script>

<template>
  <span v-if="remaining" class="text-xs2 font-medium" :class="colorClass">
    {{ remaining.label }}
  </span>
</template>
