<script setup lang="ts">
import { ref } from 'vue';
import type { TwoFactorProvider } from '@/types';

const accessKey         = defineModel<string>('accessKey', { required: true });
const secretKey         = defineModel<string>('secretKey', { required: true });
const twoFactorProvider = defineModel<TwoFactorProvider | ''>('twoFactorProvider', { required: true });

const TWO_FACTOR_OPTIONS: { key: TwoFactorProvider; label: string }[] = [
  { key: 'KAKAO', label: '카카오톡' },
  { key: 'NAVER', label: '네이버'   },
  { key: 'HANA',  label: '하나인증서' },
];

const apiGuideOpen      = ref(false);
const twoFactorGuideOpen = ref(false);
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

    <!-- 가이드 토글 묶음 -->
    <div class="rounded-xl border border-brand/30 bg-brand-bg overflow-hidden">
      <!-- API 키 발급 가이드 -->
      <button
        class="w-full flex items-center justify-between px-4 py-3.5 text-left"
        @click="apiGuideOpen = !apiGuideOpen"
      >
        <span class="text-sm font-semibold text-brand">API 키 발급 가이드</span>
        <svg
          class="text-brand transition-transform duration-200 shrink-0"
          :class="apiGuideOpen ? 'rotate-180' : ''"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div v-if="apiGuideOpen" class="px-4 pb-4 pt-3 flex flex-col gap-4 bg-white border-t border-brand/20">
        <!-- 단계별 안내 -->
        <ol class="flex flex-col gap-3">
          <li class="flex gap-3">
            <span class="text-xs font-bold text-white bg-brand rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div class="flex flex-col gap-1">
              <p class="text-sm text-text-primary leading-relaxed">
                아래 링크에 <span class="font-semibold">PC 환경</span>으로 접속해 'Open API 사용하기'를 클릭해 주세요.
              </p>
              <p class="text-xs2 text-brand break-all">https://www.upbit.com/service_center/open_api_guide</p>
              <p class="text-xs2 text-text-tertiary leading-relaxed">
                모바일 브라우저라면 메뉴(⋮) → '데스크톱 사이트'를 켜면 접근할 수 있습니다. PC 환경이 아니면 해당 메뉴가 표시되지 않습니다.
              </p>
            </div>
          </li>
          <li class="flex gap-3">
            <span class="text-xs font-bold text-white bg-brand rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div class="flex flex-col gap-1">
              <p class="text-sm text-text-primary leading-relaxed">
                'Open API Key 관리' 탭에서 사용할 포켓을 선택한 뒤, 다음 권한에 모두 체크해 주세요.
              </p>
              <p class="text-xs2 text-text-secondary">
                자산조회 · 주문조회 · 주문하기 · 입금조회 · 입금하기
              </p>
            </div>
          </li>
          <li class="flex gap-3">
            <span class="text-xs font-bold text-white bg-brand rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">3</span>
            <p class="text-sm text-text-primary leading-relaxed">
              IP 주소 등록란에 <span class="font-mono font-semibold text-text-primary bg-white px-1.5 py-0.5 rounded border border-surface-border">34.22.75.37</span>를 입력해 주세요.
            </p>
          </li>
          <li class="flex gap-3">
            <span class="text-xs font-bold text-white bg-brand rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">4</span>
            <p class="text-sm text-text-primary leading-relaxed">
              개인정보 수집 동의 및 캡챠 인증 후 'Open API 키 발급받기'를 클릭하면 <span class="font-semibold">Access Key</span>와 <span class="font-semibold">Secret Key</span>가 표시됩니다. 복사해 안전한 곳에 보관한 뒤 아래 입력란에 입력해 주세요.
            </p>
          </li>
        </ol>

        <!-- 공식 문서 링크 -->
        <div class="flex flex-col gap-1">
          <p class="text-xs2 text-text-tertiary">스크린샷 포함 상세 안내는 공식 문서를 참고해 주세요.</p>
          <span class="text-xs2 text-brand break-all">https://docs.upbit.com/kr/docs/api-key</span>
        </div>
      </div>

      <!-- 2차 인증 설정 가이드 -->
      <button
        class="w-full flex items-center justify-between px-4 py-3.5 text-left border-t border-brand/20"
        @click="twoFactorGuideOpen = !twoFactorGuideOpen"
      >
        <span class="text-sm font-semibold text-brand">2차 인증 설정 가이드</span>
        <svg
          class="text-brand transition-transform duration-200 shrink-0"
          :class="twoFactorGuideOpen ? 'rotate-180' : ''"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div v-if="twoFactorGuideOpen" class="px-4 pb-4 pt-3 bg-white border-t border-brand/20">
        <div class="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs2 text-text-secondary">
          <span>'업비트' 앱 실행</span>
          <span class="text-text-disabled">→</span>
          <span>더보기</span>
          <span class="text-text-disabled">→</span>
          <span>닉네임 아래 '등급' 클릭</span>
          <span class="text-text-disabled">→</span>
          <span>2채널 인증</span>
          <span class="text-text-disabled">→</span>
          <span class="font-semibold text-text-primary">카카오톡 · 네이버 · 하나인증서 중 택1 활성화</span>
        </div>
      </div>
    </div>

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
