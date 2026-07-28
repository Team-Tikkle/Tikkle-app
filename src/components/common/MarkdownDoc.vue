<script setup lang="ts">
/**
 * 약관·방침 마크다운 렌더러.
 *
 * 입력은 docs/*.md 번들 문자열뿐이고 사용자 입력이 섞이지 않으므로
 * v-html 로 그대로 렌더한다.
 */
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{ source: string }>()

const html = computed(() => marked.parse(props.source, { async: false }) as string)
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <article class="md" v-html="html" />
</template>

<style scoped>
.md {
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
  word-break: break-word;
}

.md :deep(h1) {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 1rem;
}

.md :deep(h2) {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 1.75rem 0 0.625rem;
}

.md :deep(h3) {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 1.25rem 0 0.5rem;
}

.md :deep(p) {
  margin: 0.625rem 0;
}

.md :deep(strong) {
  font-weight: 600;
  color: var(--color-text-primary);
}

.md :deep(ul),
.md :deep(ol) {
  margin: 0.625rem 0;
  padding-left: 1.25rem;
}

.md :deep(ul) { list-style: disc; }
.md :deep(ol) { list-style: decimal; }
.md :deep(li) { margin: 0.3125rem 0; }

.md :deep(hr) {
  border: 0;
  border-top: 1px solid var(--color-surface-border);
  margin: 1.5rem 0;
}

.md :deep(blockquote) {
  margin: 0.75rem 0;
  padding: 0.625rem 0.875rem;
  border-left: 3px solid var(--color-brand);
  background: var(--color-surface);
  border-radius: 0 0.5rem 0.5rem 0;
}

.md :deep(blockquote p) { margin: 0.25rem 0; }

/* 표는 폭이 좁은 화면에서 넘칠 수 있으므로 가로 스크롤을 허용한다 */
.md :deep(table) {
  display: block;
  overflow-x: auto;
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.75rem;
}

.md :deep(th),
.md :deep(td) {
  border: 1px solid var(--color-surface-border);
  padding: 0.5rem 0.625rem;
  text-align: left;
  vertical-align: top;
}

.md :deep(th) {
  background: var(--color-surface);
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.md :deep(code) {
  font-size: 0.75rem;
  background: var(--color-surface);
  border-radius: 0.25rem;
  padding: 0.0625rem 0.25rem;
}

.md :deep(a) {
  color: var(--color-brand);
  text-decoration: underline;
}
</style>
