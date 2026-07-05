<script setup lang="ts">
const accessKey = defineModel<string>('accessKey', { required: true });
const secretKey = defineModel<string>('secretKey', { required: true });
</script>

<template>
  <div class="px-6 pt-6 flex flex-col gap-6">
    <span class="text-sm font-semibold text-brand">거래소 연동</span>

    <div class="flex flex-col gap-2">
      <h2 class="text-2xl font-bold text-text-primary leading-snug">
        업비트 계정을<br />연결해 주세요
      </h2>
      <p class="text-base text-text-tertiary leading-relaxed">
        업비트 Open API 키를 연동합니다. 키 발급 시 출금 권한은 켜지 않아도
        됩니다.
      </p>
    </div>

    <!-- 안내 배너 -->
    <div class="bg-brand-bg rounded-xl p-4 flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <svg
          class="text-brand shrink-0"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span class="text-base font-semibold text-brand">Open API 키 연동</span>
      </div>
      <p class="text-sm text-brand-300 leading-relaxed">
        업비트 [마이페이지 → Open API 관리]에서 API 키를 발급받아 입력해 주세요.
      </p>
    </div>

    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-text-secondary">Access Key</label>
        <input
          v-model="accessKey"
          type="text"
          placeholder="Access Key를 붙여넣으세요"
          class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
        />
        <p class="text-xs2 text-text-tertiary">
          업비트 → 마이페이지 → Open API 관리 → Access Key 복사
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-text-secondary">Secret Key</label>
        <input
          v-model="secretKey"
          type="password"
          placeholder="Secret Key를 붙여넣으세요"
          class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
        />
      </div>
    </div>
  </div>
</template>
