<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { TwoFactorProvider } from '@/types'

const settingsStore = useSettingsStore()

const accessKey = ref('')
const secretKey = ref('')
const twoFactorProvider = ref<TwoFactorProvider | ''>('')
const successMsg = ref('')

const TWO_FACTOR_OPTIONS: { key: TwoFactorProvider; label: string; emoji: string }[] = [
  { key: 'KAKAO', label: '카카오톡', emoji: '💬' },
  { key: 'NAVER', label: '네이버',   emoji: '🇳' },
  { key: 'HANA',  label: '하나원큐', emoji: '🏦' },
]

const apiGuideOpen = ref(false)
const twoFactorGuideOpen = ref(false)

const { isLoading, errorMsg, run } = useAsyncAction('저장에 실패했습니다. 다시 시도해 주세요.')

function handleSave() {
  if (!accessKey.value.trim() || !secretKey.value.trim() || !twoFactorProvider.value) {
    errorMsg.value = '모든 항목을 입력해 주세요.'
    return
  }
  successMsg.value = ''
  run(async () => {
    await settingsStore.updateUpbit({
      upbitAccessKey:    accessKey.value.trim(),
      upbitSecretKey:    secretKey.value.trim(),
      twoFactorProvider: twoFactorProvider.value as TwoFactorProvider,
    })
    successMsg.value = '업비트 계정 정보가 업데이트되었습니다.'
    secretKey.value = ''
  })
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <AppHeader title="업비트 계정 관리" :show-back="true" />

    <div class="flex-1 overflow-y-auto px-6 pt-6 pb-36 flex flex-col gap-6">

      <div class="flex flex-col gap-2">
        <h2 class="text-2xl font-bold text-text-primary leading-snug">
          업비트 계정을<br>변경해 주세요
        </h2>
        <p class="text-base text-text-tertiary leading-relaxed">
          업비트 Open API 키를 새로 입력하면 즉시 업데이트됩니다.
        </p>
      </div>

      <!-- Info banner -->
      <div class="bg-brand-bg rounded-xl p-4 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <svg class="text-brand shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span class="text-base font-semibold text-brand">Open API 키 연동</span>
        </div>
        <p class="text-sm text-brand-300 leading-relaxed">
          업비트 Open API 관리 페이지에서 발급한 Access Key와 Secret Key를 입력하세요.
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
                IP 주소 등록란에 <span class="font-mono font-semibold text-text-primary bg-white px-1.5 py-0.5 rounded border border-surface-border">34.64.106.45</span>를 입력해 주세요.
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

      <!-- Form -->
      <div class="flex flex-col gap-5">

        <!-- Access Key -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-text-secondary">Access Key</label>
          <input
            v-model="accessKey"
            type="text"
            placeholder="Access Key를 붙여넣으세요"
            class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
          >
          <p class="text-xs2 text-text-tertiary">업비트 → 마이페이지 → Open API 관리 → Access Key 복사</p>
        </div>

        <!-- Secret Key -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-text-secondary">Secret Key</label>
          <input
            v-model="secretKey"
            type="password"
            placeholder="Secret Key를 붙여넣으세요"
            class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
          >
        </div>

        <!-- 2차 인증 수단 -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-text-secondary">2차 인증 수단</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in TWO_FACTOR_OPTIONS"
              :key="opt.key"
              class="py-3 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center gap-1"
              :class="twoFactorProvider === opt.key
                ? 'border-brand bg-brand-bg text-brand'
                : 'border-surface-border bg-white text-text-secondary'"
              @click="twoFactorProvider = opt.key"
            >
              <span>{{ opt.emoji }}</span>
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Success message -->
      <p v-if="successMsg" class="text-sm text-brand text-center font-medium">
        {{ successMsg }}
      </p>

      <!-- Error message -->
      <p v-if="errorMsg" role="alert" class="text-sm text-danger text-center">
        {{ errorMsg }}
      </p>
    </div>

    <!-- Sticky CTA -->
    <div class="fixed bottom-0 left-0 right-0 max-w-mobile mx-auto bg-surface px-6 pt-3 pb-8">
      <button
        class="w-full py-4 rounded-xl text-md font-semibold text-white flex items-center justify-center gap-2 transition-colors"
        :class="isLoading ? 'bg-text-disabled' : 'bg-brand active:bg-brand-hover'"
        :disabled="isLoading"
        @click="handleSave"
      >
        <span
          v-if="isLoading"
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        {{ isLoading ? '저장 중...' : '저장하기' }}
      </button>
    </div>
  </div>
</template>
