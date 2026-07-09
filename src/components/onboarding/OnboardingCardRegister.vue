<script setup lang="ts">
import { computed } from 'vue';

const cardLast4 = defineModel<string>({ required: true });

const isValid = computed(() => /^\d{4}$/.test(cardLast4.value));
</script>

<template>
  <div class="px-6 pt-6 flex flex-col gap-6">
    <span class="text-sm font-semibold text-brand">카드 등록</span>

    <div class="flex flex-col gap-2">
      <h2 class="text-2xl font-bold text-text-primary leading-snug">
        잔돈 적립에 사용할<br />케이뱅크 카드를 등록해 주세요
      </h2>
      <p class="text-base text-text-tertiary leading-relaxed">
        케이뱅크 카드로 결제 발생 시 해당 계좌에서 자동으로 잔돈이 이체됩니다.
      </p>
    </div>

    <!-- 케이뱅크 고정 안내 -->
    <div class="bg-brand-bg rounded-xl px-4 py-3.5 flex items-center gap-3">
      <svg
        class="text-brand shrink-0"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <div>
        <p class="text-sm font-semibold text-brand">케이뱅크 카드 자동 연동</p>
        <p class="text-xs2 text-brand-300 mt-0.5">현재 케이뱅크 카드만 지원됩니다</p>
      </div>
    </div>

    <!-- 푸시 알림 필수 안내 -->
    <div class="bg-surface rounded-xl px-4 py-3.5 flex items-start gap-3">
      <svg
        class="text-text-tertiary shrink-0 mt-0.5"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <div class="flex flex-col gap-0.5">
        <p class="text-sm font-semibold text-text-primary">케이뱅크 앱 푸시 알림 필수</p>
        <p class="text-xs2 text-text-tertiary leading-relaxed">
          결제 알림을 감지해 자동 투자가 시작됩니다. 케이뱅크 앱의 결제 푸시 알림이 켜져 있어야 정상 작동합니다.
        </p>
      </div>
    </div>

    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-text-secondary"
          >카드 번호 끝 4자리</label
        >
        <input
          v-model="cardLast4"
          type="text"
          inputmode="numeric"
          maxlength="4"
          placeholder="0000"
          class="w-full px-4 py-3.5 rounded-xl bg-white border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 transition-all"
          :class="
            cardLast4 && !isValid
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-surface-border focus:border-brand focus:ring-brand/20'
          "
        />
        <p v-if="cardLast4 && !isValid" class="text-xs2 text-danger">
          숫자 4자리를 정확히 입력해 주세요.
        </p>
        <p v-else class="text-xs2 text-text-tertiary">
          잔돈 적립 대상 카드의 끝 4자리 숫자를 입력하세요
        </p>
      </div>
    </div>
  </div>
</template>
