<script setup lang="ts">
// 업비트 Open API 키 발급 · 2차 인증 설정 안내 아코디언.
// 온보딩(OnboardingUpbitConnect)과 설정(LinkedAccountView) 두 곳에서 같은 내용을
// 보여주므로 여기 한 곳에서만 관리한다. 등록 IP 등 수치가 바뀌면 이 파일만 고치면 된다.
import { ref } from 'vue';

const apiGuideOpen = ref(false);
const twoFactorGuideOpen = ref(false);
</script>

<template>
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
</template>
