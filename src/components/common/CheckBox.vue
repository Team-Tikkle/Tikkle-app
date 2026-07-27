<script setup lang="ts">
// 체크 표시만 그리는 표시용 박스. 실제 상태는 형제 <input type="checkbox"> 가 들고 있다.
defineProps<{ checked: boolean }>()
</script>

<template>
  <span
    class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
    :class="checked ? 'bg-brand border-brand' : 'bg-white border-surface-border'"
  >
    <svg
      v-if="checked"
      width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="white" stroke-width="3.5"
      stroke-linecap="round" stroke-linejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </span>
</template>
