<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, isNavigationFailure } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';
import api from '@/utils/api';
import {
  authErrorMessage,
  authErrorCode,
  isValidPassword,
  isValidPhone,
  PASSWORD_POLICY_HINT,
} from '@/utils/auth';
import { useCountdown } from '@/composables/useCountdown';
import { useModalBackHandler } from '@/composables/useAndroidBack';
import { LEGAL_DOCS, type LegalDocKey } from '@/utils/legal';
import CheckBox from '@/components/common/CheckBox.vue';

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

// ── 필수 동의 (3단계) ──
const agreedAge = ref(false);
const agreedTerms = ref(false);
const agreedPrivacy = ref(false);

const agreedAll = computed({
  get: () => agreedAge.value && agreedTerms.value && agreedPrivacy.value,
  set: (v: boolean) => {
    agreedAge.value = v;
    agreedTerms.value = v;
    agreedPrivacy.value = v;
  },
});

// 문서 열람 시트 — 라우팅하면 3단계까지 온 입력·signupToken 이 날아가므로
// 화면 이동 없이 시트로 띄운다.
const openDoc = ref<LegalDocKey | null>(null);
useModalBackHandler(() => openDoc.value !== null, () => { openDoc.value = null; });

// 시트에서 '동의하기' — 열려 있던 문서의 항목만 체크하고 닫는다.
function agreeAndClose() {
  if (openDoc.value === 'terms') agreedTerms.value = true;
  else if (openDoc.value === 'privacy') agreedPrivacy.value = true;
  openDoc.value = null;
}

const isLoading = ref(false);
const errorMsg = ref('');

// 인증번호 재발송 쿨다운 (60초)
const RESEND_COOLDOWN = 60;
const { seconds: resendSeconds, start: startResendCooldown } = useCountdown();

// Step 1·재발송: 인증번호 발송
async function sendSms() {
  if (!isValidPhone(phoneNumber.value.trim()) || resendSeconds.value > 0) return;
  isLoading.value = true;
  errorMsg.value = '';
  try {
    await api.post('/api/auth/sms/send', { phoneNumber: phoneNumber.value.trim() });
    code.value = '';
    startResendCooldown(RESEND_COOLDOWN);
    step.value = 2;
  } catch (err) {
    // 60초 쿨다운 위반(SMS-004)이면 재발송 버튼도 카운트다운으로 막는다
    if (authErrorCode(err) === 'SMS-004') startResendCooldown(RESEND_COOLDOWN);
    errorMsg.value = authErrorMessage(err);
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
      data: { signupToken: string }
    }>('/api/auth/sms/verify', {
      phoneNumber: phoneNumber.value.trim(),
      code: code.value.trim(),
    });
    signupToken.value = envelope.data.signupToken;
    step.value = 3;
  } catch (err) {
    // 오입력 5회 초과(SMS-006) → 인증번호가 폐기되었으므로 1단계로 되돌려 재발송을 유도
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
  () => passwordConfirm.value.length > 0 && password.value !== passwordConfirm.value,
);
const passwordInvalid = computed(
  () => password.value.length > 0 && !isValidPassword(password.value),
);

// Step 3: 회원가입
async function handleSignup() {
  if (!name.value.trim() || !isValidPassword(password.value) || passwordMismatch.value) return;
  if (!agreedAll.value) return;
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
    if (!isNavigationFailure(err)) {
      // signupToken 만료(SMS-003) → 인증부터 다시
      if (authErrorCode(err) === 'SMS-003') {
        code.value = '';
        step.value = 1;
      }
      errorMsg.value = authErrorMessage(err);
    }
  } finally {
    isLoading.value = false;
  }
}

// 단계별 진행 가능 여부
const canProceed = computed(() => {
  if (step.value === 1) return isValidPhone(phoneNumber.value.trim());
  if (step.value === 2) return code.value.length === 6;
  return Boolean(name.value.trim()) && isValidPassword(password.value) && !passwordMismatch.value
    && agreedAll.value;
});

function handleCta() {
  if (step.value === 1) sendSms();
  else if (step.value === 2) verifyCode();
  else handleSignup();
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
            <label class="text-sm font-semibold text-text-secondary">닉네임</label>
            <input
              v-model="name"
              type="text"
              maxlength="50"
              placeholder="닉네임"
              class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-secondary">비밀번호</label>
            <input
              v-model="password"
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
            <label class="text-sm font-semibold text-text-secondary">비밀번호 확인</label>
            <input
              v-model="passwordConfirm"
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

        <!-- 약관 동의 -->
        <div class="flex flex-col rounded-xl bg-white border border-surface-border overflow-hidden">
          <label class="flex items-center gap-3 px-4 py-3.5 active:bg-surface transition-colors">
            <input v-model="agreedAll" type="checkbox" class="sr-only" />
            <CheckBox :checked="agreedAll" />
            <span class="text-sm font-semibold text-text-primary">전체 동의</span>
          </label>

          <div class="h-px bg-surface-border mx-4" />

          <div class="flex items-center gap-3 px-4 py-3">
            <label class="flex items-center gap-3 flex-1 min-w-0">
              <input v-model="agreedAge" type="checkbox" class="sr-only" />
              <CheckBox :checked="agreedAge" />
              <span class="text-sm text-text-secondary truncate">
                <span class="text-brand font-medium">[필수]</span> 만 14세 이상입니다
              </span>
            </label>
          </div>

          <div class="flex items-center gap-3 px-4 py-3">
            <label class="flex items-center gap-3 flex-1 min-w-0">
              <input v-model="agreedTerms" type="checkbox" class="sr-only" />
              <CheckBox :checked="agreedTerms" />
              <span class="text-sm text-text-secondary truncate">
                <span class="text-brand font-medium">[필수]</span> 이용약관 동의
              </span>
            </label>
            <button
              class="shrink-0 text-xs2 text-text-tertiary underline active:opacity-60 px-1"
              @click="openDoc = 'terms'"
            >
              보기
            </button>
          </div>

          <div class="flex items-center gap-3 px-4 py-3">
            <label class="flex items-center gap-3 flex-1 min-w-0">
              <input v-model="agreedPrivacy" type="checkbox" class="sr-only" />
              <CheckBox :checked="agreedPrivacy" />
              <span class="text-sm text-text-secondary truncate">
                <span class="text-brand font-medium">[필수]</span> 개인정보처리방침 동의
              </span>
            </label>
            <button
              class="shrink-0 text-xs2 text-text-tertiary underline active:opacity-60 px-1"
              @click="openDoc = 'privacy'"
            >
              보기
            </button>
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
          {{ step === 1 ? '인증번호 받기' : step === 2 ? '인증 확인' : '가입하기' }}
        </span>
        <span v-else>처리 중...</span>
      </button>
    </div>

    <!-- 약관·방침 열람 시트 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="openDoc"
          class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          @click.self="openDoc = null"
        >
          <div class="w-full max-w-mobile bg-white rounded-t-3xl flex flex-col max-h-[85vh]">
            <div class="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
              <h3 class="text-md font-bold text-text-primary">
                {{ LEGAL_DOCS[openDoc].title }}
              </h3>
              <button
                class="w-8 h-8 flex items-center justify-center text-text-tertiary"
                aria-label="닫기"
                @click="openDoc = null"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-6 pb-4">
              <article class="text-xs2 text-text-secondary leading-relaxed whitespace-pre-wrap break-words">{{ LEGAL_DOCS[openDoc].body }}</article>
            </div>

            <div class="px-6 pb-10 pt-3 shrink-0 border-t border-surface-border">
              <button
                class="w-full py-4 rounded-xl bg-brand active:bg-brand-hover text-white text-base font-semibold transition-colors"
                @click="agreeAndClose"
              >
                동의하기
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
