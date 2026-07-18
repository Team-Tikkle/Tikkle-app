<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/utils/api';
import {
  authErrorMessage,
  authErrorCode,
  isValidPassword,
  isValidPhone,
  PASSWORD_POLICY_HINT,
} from '@/utils/auth';
import { useCountdown } from '@/composables/useCountdown';

const router = useRouter();

// ── 단계: 1=전화번호, 2=인증번호, 3=새 비밀번호 ──
const step = ref<1 | 2 | 3>(1);

const phoneNumber = ref('');
const code = ref('');
const resetToken = ref('');
const newPassword = ref('');
const newPasswordConfirm = ref('');

const isLoading = ref(false);
const errorMsg = ref('');

const RESEND_COOLDOWN = 60;
const { seconds: resendSeconds, start: startResendCooldown } = useCountdown();

// Step 1·재발송: 인증번호 발송
// ⚠️ 미가입 번호도 200을 반환한다(사용자 열거 방지). "가입되지 않은 번호" 안내를
//    띄우면 안 되며, 무조건 다음 단계로 진행시킨다. (미가입이면 ②에서 SMS-002)
async function sendSms() {
  if (!isValidPhone(phoneNumber.value.trim()) || resendSeconds.value > 0) return;
  isLoading.value = true;
  errorMsg.value = '';
  try {
    await api.post('/api/auth/password/reset-sms/send', { phoneNumber: phoneNumber.value.trim() });
    code.value = '';
    startResendCooldown(RESEND_COOLDOWN);
    step.value = 2;
  } catch (err) {
    if (authErrorCode(err) === 'SMS-004') startResendCooldown(RESEND_COOLDOWN);
    errorMsg.value = authErrorMessage(err);
  } finally {
    isLoading.value = false;
  }
}

// Step 2: 인증번호 확인 — 응답 필드명이 signupToken이지만 값은 재설정용 토큰
async function verifyCode() {
  if (code.value.length !== 6) return;
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const { data: envelope } = await api.post<{
      data: { signupToken: string }
    }>('/api/auth/password/reset-sms/verify', {
      phoneNumber: phoneNumber.value.trim(),
      code: code.value.trim(),
    });
    resetToken.value = envelope.data.signupToken;
    step.value = 3;
  } catch (err) {
    if (authErrorCode(err) === 'SMS-006') {
      code.value = '';
      step.value = 1;
    }
    errorMsg.value = authErrorMessage(err);
  } finally {
    isLoading.value = false;
  }
}

const passwordMismatch = computed(
  () => newPasswordConfirm.value.length > 0 && newPassword.value !== newPasswordConfirm.value,
);
const passwordInvalid = computed(
  () => newPassword.value.length > 0 && !isValidPassword(newPassword.value),
);

// Step 3: 비밀번호 변경 → 성공 시 기존 세션이 끊기므로 로그인 화면으로 이동
async function resetPassword() {
  if (!isValidPassword(newPassword.value) || passwordMismatch.value) return;
  isLoading.value = true;
  errorMsg.value = '';
  try {
    await api.post('/api/auth/password/reset', {
      phoneNumber: phoneNumber.value.trim(),
      newPassword: newPassword.value,
      resetToken: resetToken.value,
    });
    router.replace({ name: 'login', query: { reset: '1' } });
  } catch (err) {
    // resetToken 만료(SMS-003) → 인증부터 다시
    if (authErrorCode(err) === 'SMS-003') {
      code.value = '';
      step.value = 1;
    }
    errorMsg.value = authErrorMessage(err);
  } finally {
    isLoading.value = false;
  }
}

const canProceed = computed(() => {
  if (step.value === 1) return isValidPhone(phoneNumber.value.trim());
  if (step.value === 2) return code.value.length === 6;
  return isValidPassword(newPassword.value) && !passwordMismatch.value;
});

function handleCta() {
  if (step.value === 1) sendSms();
  else if (step.value === 2) verifyCode();
  else resetPassword();
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
      <h2 class="text-lg font-bold text-text-primary">비밀번호 재설정</h2>
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
            가입한 전화번호를<br>입력해 주세요
          </h3>
          <p class="text-base text-text-tertiary">인증 문자를 발송할게요.</p>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-text-secondary">전화번호</label>
          <input
            v-model="phoneNumber"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            placeholder="01012345678"
            class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            @keyup.enter="handleCta"
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
            @keyup.enter="handleCta"
          />
          <p class="text-xs2 text-text-tertiary">인증번호는 3분간 유효합니다</p>
        </div>
        <button
          class="self-start text-sm font-medium active:opacity-60 disabled:opacity-40"
          :class="resendSeconds > 0 ? 'text-text-tertiary' : 'text-brand'"
          :disabled="isLoading || resendSeconds > 0"
          @click="sendSms"
        >
          {{ resendSeconds > 0 ? `${resendSeconds}초 후 재발송 가능` : '인증번호 재발송' }}
        </button>
      </template>

      <!-- ── Step 3: 새 비밀번호 입력 ── -->
      <template v-else>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-brand">3 / 3단계</span>
          <h3 class="text-2xl font-bold text-text-primary leading-snug">
            새 비밀번호를<br>입력해 주세요
          </h3>
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary">새 비밀번호</label>
            <input
              v-model="newPassword"
              type="password"
              placeholder="영문·숫자·특수문자 포함 8~20자"
              class="w-full px-4 py-3.5 rounded-xl bg-white border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 transition-all"
              :class="passwordInvalid
                ? 'border-danger focus:border-danger focus:ring-danger/20'
                : 'border-surface-border focus:border-brand focus:ring-brand/20'"
            />
            <p class="text-xs2" :class="passwordInvalid ? 'text-danger' : 'text-text-tertiary'">
              {{ PASSWORD_POLICY_HINT }}
            </p>
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary">새 비밀번호 확인</label>
            <input
              v-model="newPasswordConfirm"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              class="w-full px-4 py-3.5 rounded-xl bg-white border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 transition-all"
              :class="passwordMismatch
                ? 'border-danger focus:border-danger focus:ring-danger/20'
                : 'border-surface-border focus:border-brand focus:ring-brand/20'"
              @keyup.enter="handleCta"
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
        :disabled="isLoading || !canProceed"
        @click="handleCta"
      >
        <span v-if="isLoading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span v-if="!isLoading">
          {{ step === 1 ? '인증번호 받기' : step === 2 ? '인증 확인' : '비밀번호 변경' }}
        </span>
        <span v-else>처리 중...</span>
      </button>
    </div>
  </div>
</template>
