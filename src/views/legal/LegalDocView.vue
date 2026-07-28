<script setup lang="ts">
/**
 * 약관·방침 열람 화면 (/legal/:doc)
 * 가입 화면 밖(설정 등)에서 단독으로 열람할 때 쓴다.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { LEGAL_DOCS, isLegalDocKey } from '@/utils/legal'
import AppHeader from '@/components/common/AppHeader.vue'
import MarkdownDoc from '@/components/common/MarkdownDoc.vue'

const route = useRoute()

const doc = computed(() => {
  const key = route.params.doc as string
  return isLegalDocKey(key) ? LEGAL_DOCS[key] : LEGAL_DOCS.terms
})
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <AppHeader :title="doc.title" show-back />

    <div class="flex-1 px-6 py-5">
      <MarkdownDoc :source="doc.body" />
    </div>
  </div>
</template>
