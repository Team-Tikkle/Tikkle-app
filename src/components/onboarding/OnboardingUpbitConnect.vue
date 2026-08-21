<script setup lang="ts">
import type { TwoFactorProvider } from '@/types';
import { TWO_FACTOR_OPTIONS } from '@/utils/auth';
import UpbitKeyGuide from '@/components/common/UpbitKeyGuide.vue';

const accessKey         = defineModel<string>('accessKey', { required: true });
const secretKey         = defineModel<string>('secretKey', { required: true });
const twoFactorProvider = defineModel<TwoFactorProvider | ''>('twoFactorProvider', { required: true });

</script>

<template>
  <div class="px-6 pt-6 flex flex-col gap-6">
    <span class="text-sm font-semibold text-brand">거래소 연동</span>

    <div class="flex flex-col gap-2">
      <h2 class="text-2xl font-bold text-text-primary leading-snug">
        업비트 계정을<br />연결해 주세요
      </h2>
      <p class="text-base text-text-tertiary leading-relaxed">
        Open API 키를 입력하고, 잔돈 투자 시 사용할 2차 인증 앱을 선택해 주세요.
      </p>
    </div>

    <UpbitKeyGuide />

    <!-- API 키 입력 -->
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-text-secondary">Access Key</label>
        <input
          v-model="accessKey"
          type="text"
          placeholder="Access Key를 붙여넣으세요"
          class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
        />
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

    <!-- 2차 인증 수단 선택 -->
    <div class="flex flex-col gap-3">
      <label class="text-sm font-semibold text-text-secondary">2차 인증 앱</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="opt in TWO_FACTOR_OPTIONS"
          :key="opt.key"
          class="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 transition-all"
          :class="twoFactorProvider === opt.key
            ? 'border-brand bg-brand-bg'
            : 'border-surface-border bg-white'"
          @click="twoFactorProvider = opt.key"
        >
          <span
            class="text-sm font-semibold"
            :class="twoFactorProvider === opt.key ? 'text-brand' : 'text-text-primary'"
          >{{ opt.label }}</span>
        </button>
      </div>
      <p class="text-xs2 text-text-tertiary">
        업비트 입금 시 이 앱으로 2차 인증이 요청됩니다.
      </p>
    </div>
  </div>
</template>
