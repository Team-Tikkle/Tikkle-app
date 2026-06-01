<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps<{
  title: string
  showBack?: boolean
}>()

const router = useRouter()
</script>

<template>
  <!-- Page header — white bar with title and optional back chevron -->
  <header class="sticky top-0 z-40 bg-white flex items-center h-[60px] px-6">
    <button
      v-if="props.showBack"
      class="mr-3 text-text-primary flex items-center justify-center w-8 h-8 -ml-2"
      aria-label="뒤로"
      @click="router.back()"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
    <h1 class="text-xl font-bold text-text-primary">{{ props.title }}</h1>
  </header>
</template>
