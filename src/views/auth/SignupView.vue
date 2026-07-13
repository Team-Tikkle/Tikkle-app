<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, isNavigationFailure } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';
import type { AxiosError } from 'axios';
import api from '@/utils/api';

const router = useRouter();
const userStore = useUserStore();

// ── 단계: 1=전화번호, 2=인증번호, 3=이름+비밀번호 ──
const step = ref<1 | 2 | 3>(1);

const phoneNumber = ref('');
const code = ref('');
const signupToken = ref('');
const name = ref('');
const password = ref('');
const passwordConfirm = ref('');

const isLoading = ref(false);
const errorMsg = ref('');

const ERROR_MESSAGES: Record<string, string> = {
  SMS_SEND_FAILED:         '문자 발송에 실패했습니다. 번호를 확인해 주세요.',
  INVALID_VERIFICATION_CODE: '인증번호가 틀리거나 만료되었습니다.',
  EXPIRED_SIGNUP_TOKEN:    '인증 시간이 만료되었습니다. 다시 시도해 주세요.',
  PHONE_ALREADY_REGISTERED: '이미 가입된 전화번호입니다.',
};

function mapError(err: unknown): string {
  const code = (err as AxiosError<{ errorCode?: string }>).response?.data?.errorCode;
  return (code && ERROR_MESSAGES[code]) ? ERROR_MESSAGES[code] : '오류가 발생했습니다. 다시 시도해 주세요.';
}

// Step 1: 인증번호 발송
async function sendSms() {
  if (!phoneNumber.value.trim()) return;
  isLoading.value = true;
  errorMsg.value = '';
  try {
    await api.post('/api/auth/sms/send', { phoneNumber: phoneNumber.value.trim() });
    step.value = 2;
  } catch (err) {
    errorMsg.value = mapError(err);
  } finally {
    isLoading.value = false;
  }
}

// Step 2: 인증번호 확인
async function verifyCode() {
  if (code.value.length !== 6) return;
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const { data: envelope } = await api.post<{
      status: string
      data: { signupToken: string }
    }>('/api/auth/sms/verify', {
      phoneNumber: phoneNumber.value.trim(),
      code: code.value.trim(),
    });
    signupToken.value = envelope.data.signupToken;
    step.value = 3;
  } catch (err) {
    errorMsg.value = mapError(err);
  } finally {
    isLoading.value = false;
  }
}

const passwordMismatch = computed(
  () => passwordConfirm.value.length > 0 && password.value !== passwordConfirm.value,
);

// Step 3: 회원가입
async function handleSignup() {
  if (!name.value.trim() || !password.value || passwordMismatch.value) return;
  isLoading.value = true;
  errorMsg.value = '';
  try {
    await userStore.signup({
      name: name.value.trim(),
      phoneNumber: phoneNumber.value.trim(),
      password: password.value,
      signupToken: signupToken.value,
    });
    const nav = await router.replace({ name: 'onboarding-survey' });
    if (import.meta.env.DEV && isNavigationFailure(nav)) console.warn('[signup] nav redirected:', nav);
  } catch (err) {
    if (!isNavigationFailure(err)) errorMsg.value = mapError(err);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <!-- 헤더 -->
    <div class="bg-white px-5 pt-14 pb-4 flex items-center gap-3">
      <button
        class="w-9 h-9 flex items-center justify-center text-text-secondary active:opacity-60"
        @click="step > 1 ? step-- : router.back()"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <h2 class="text-lg font-bold text-text-primary">회원가입</h2>
    </div>

    <!-- 진행 바 -->
    <div class="h-1 bg-surface-border">
      <div
        class="h-full bg-brand transition-all duration-300"
        :style="{ width: `${(step / 3) * 100}%` }"
      />
    </div>

    <div class="flex-1 flex flex-col px-6 pt-8 pb-36 gap-7">

      <!-- ── Step 1: 전화번호 입력 ── -->
      <template v-if="step === 1">
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-brand">1 / 3단계</span>
          <h3 class="text-2xl font-bold text-text-primary leading-snug">
            전화번호를<br>입력해 주세요
          </h3>
          <p class="text-base text-text-tertiary">인증 문자를 발송할게요.</p>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-text-secondary">전화번호</label>
          <input
            v-model="phoneNumber"
            type="tel"
            inputmode="numeric"
            placeholder="01012345678"
            class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            @keyup.enter="sendSms"
          />
          <p class="text-xs2 text-text-tertiary">'-' 기호 없이 숫자만 입력하세요</p>
        </div>
      </template>

      <!-- ── Step 2: 인증번호 입력 ── -->
      <template v-else-if="step === 2">
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-brand">2 / 3단계</span>
          <h3 class="text-2xl font-bold text-text-primary leading-snug">
            인증번호를<br>입력해 주세요
          </h3>
          <p class="text-base text-text-tertiary">
            <span class="font-semibold text-text-primary">{{ phoneNumber }}</span>으로<br>발송된 6자리 인증번호를 입력하세요.
          </p>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-text-secondary">인증번호</label>
          <input
            v-model="code"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-lg font-semibold text-text-primary placeholder:text-text-disabled tracking-widest text-center focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            @keyup.enter="verifyCode"
          />
          <p class="text-xs2 text-text-tertiary">인증번호는 3분간 유효합니다</p>
        </div>
        <button
          class="self-start text-sm text-brand font-medium active:opacity-60"
          :disabled="isLoading"
          @click="sendSms"
        >
          인증번호 재발송
        </button>
      </template>

      <!-- ── Step 3: 이름 + 비밀번호 ── -->
      <template v-else>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-brand">3 / 3단계</span>
          <h3 class="text-2xl font-bold text-text-primary leading-snug">
            정보를<br>입력해 주세요
          </h3>
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary">이름</label>
            <input
              v-model="name"
              type="text"
              placeholder="홍길동"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary">비밀번호</label>
            <input
              v-model="password"
              type="password"
              placeholder="영문+숫자+특수문자 포함 8자 이상"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary">비밀번호 확인</label>
            <input
              v-model="passwordConfirm"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              class="w-full px-4 py-3.5 rounded-xl bg-white border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 transition-all"
              :class="passwordMismatch
                ? 'border-danger focus:border-danger focus:ring-danger/20'
                : 'border-surface-border focus:border-brand focus:ring-brand/20'"
              @keyup.enter="handleSignup"
            />
            <p v-if="passwordMismatch" class="text-xs2 text-danger">비밀번호가 일치하지 않습니다.</p>
          </div>
        </div>
      </template>

      <!-- 에러 메시지 -->
      <p v-if="errorMsg" role="alert" class="text-sm text-danger text-center">
        {{ errorMsg }}
      </p>

    </div>

    <!-- 하단 CTA -->
    <div class="fixed bottom-0 left-0 right-0 max-w-mobile mx-auto px-6 pb-10 pt-3 bg-surface">
      <button
        class="w-full py-4 rounded-xl text-white text-base font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        :class="isLoading ? 'bg-text-disabled' : 'bg-brand active:bg-brand-hover'"
        :disabled="isLoading
          || (step === 1 && !phoneNumber.trim())
          || (step === 2 && code.length !== 6)
          || (step === 3 && (!name.trim() || !password || passwordMismatch))"
        @click="step === 1 ? sendSms() : step === 2 ? verifyCode() : handleSignup()"
      >
        <span v-if="isLoading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span v-if="!isLoading">
          {{ step === 1 ? '인증번호 받기' : step === 2 ? '인증 확인' : '가입하기' }}
        </span>
        <span v-else>처리 중...</span>
      </button>
    </div>
  </div>
</template>
