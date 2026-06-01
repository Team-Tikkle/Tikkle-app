<script setup lang="ts">
defineProps<{ icon?: string; message: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
    <span class="text-4xl">{{ icon ?? '📭' }}</span>
    <p class="text-sm">{{ message }}</p>
  </div>
</template>
