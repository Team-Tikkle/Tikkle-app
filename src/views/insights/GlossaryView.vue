<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useInsightStore } from '@/stores/useInsightStore'

const insightStore = useInsightStore()

// Local loading flag so we can show a spinner while the terms list is fetched
const isLoading = ref(true)

onMounted(async () => {
  try {
    // Avoid a redundant network round-trip if the list is already cached
    if (insightStore.terms.length === 0) {
      await insightStore.fetchTerms()
    }
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-surface pb-10">
    <AppHeader title="투자 용어집" :show-back="true" />

    <!-- Loading state -->
    <LoadingSpinner v-if="isLoading" />

    <!-- Empty state -->
    <EmptyState
      v-else-if="insightStore.terms.length === 0"
      icon="📖"
      message="등록된 투자 용어가 없습니다"
    />

    <!-- Glossary list -->
    <div v-else class="px-4 pt-4 flex flex-col gap-3">
      <div
        v-for="term in insightStore.terms"
        :key="term.id"
        class="bg-white rounded-xl p-4"
      >
        <h3 class="text-base font-bold text-text-primary mb-1.5">
          {{ term.term }}
        </h3>
        <p class="text-sm text-text-tertiary leading-relaxed">
          {{ term.description }}
        </p>
      </div>
    </div>
  </div>
</template>
