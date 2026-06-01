<script setup lang="ts">
import type { TransactionStatus } from '@/types'

const props = defineProps<{ status: TransactionStatus }>()

const labelMap: Record<TransactionStatus, string> = {
  PENDING: '대기중',
  INVESTED: '투자완료',
  CANCELED: '취소',
  EXPIRED: '만료',
}

const colorMap: Record<TransactionStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  INVESTED: 'bg-green-100 text-green-700',
  CANCELED: 'bg-gray-100 text-gray-500',
  EXPIRED: 'bg-red-100 text-red-600',
}
</script>

<template>
  <span
    class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
    :class="colorMap[props.status]"
  >
    {{ labelMap[props.status] }}
  </span>
</template>
