<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute, isNavigationFailure } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';
import { authErrorMessage } from '@/utils/auth';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const phoneNumber = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMsg = ref('');

// 비밀번호 재설정 완료 후 이 화면으로 돌아온 경우 안내 배너 노출
const showResetDone = ref(route.query.reset === '1');

onMounted(() => {
  if (userStore.isAuthenticated) {
    router.replace(userStore.isOnboardingComplete ? { name: 'home' } : { name: 'onboarding-survey' });
  }
});

async function handleLogin() {
  if (!phoneNumber.value.trim() || !password.value) return;
  isLoading.value = true;
  errorMsg.value = '';
  try {
    await userStore.login({ phoneNumber: phoneNumber.value.trim(), password: password.value });
    const target = userStore.isOnboardingComplete ? { name: 'home' as const } : { name: 'onboarding-survey' as const };
    const nav = await router.replace(target);
    if (import.meta.env.DEV && isNavigationFailure(nav)) console.warn('[login] nav redirected:', nav);
  } catch (err) {
    if (!isNavigationFailure(err)) {
      errorMsg.value = authErrorMessage(err, '로그인 중 오류가 발생했습니다.');
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col px-6">
    <div class="flex-1" />

    <!-- Brand -->
    <div class="flex flex-col items-center gap-4 mb-10">
      <div class="w-20 h-20 rounded-3xl overflow-hidden shadow-lg">
        <img src="/logo.png" alt="Tikkle" class="block w-full h-full object-cover" />
      </div>
      <div class="flex flex-col items-center gap-1.5">
        <h1 class="text-4xl font-bold text-text-primary tracking-tight">Tikkle</h1>
        <p class="text-base text-text-tertiary text-center leading-relaxed">
          잔돈으로 시작하는<br />나만의 코인 투자
        </p>
      </div>
    </div>

    <!-- 비밀번호 재설정 완료 안내 -->
    <div
      v-if="showResetDone"
      class="mb-4 bg-brand-bg rounded-xl px-4 py-3 text-sm text-brand text-center font-medium"
    >
      비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.
    </div>

    <!-- Form -->
    <div class="flex flex-col gap-3 mb-4">
      <input
        v-model="phoneNumber"
        type="tel"
        inputmode="numeric"
        placeholder="전화번호 (- 없이 입력)"
        class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
        @keyup.enter="handleLogin"
      />
      <input
        v-model="password"
        type="password"
        placeholder="비밀번호"
        class="w-full px-4 py-3.5 rounded-xl bg-white border border-surface-border text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
        @keyup.enter="handleLogin"
      />

      <p v-if="errorMsg" role="alert" class="text-sm text-danger text-center px-2">
        {{ errorMsg }}
      </p>

      <!-- 로그인 버튼 -->
      <button
        class="w-full py-4 rounded-xl text-white text-base font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        :class="isLoading ? 'bg-text-disabled' : 'bg-brand active:bg-brand-hover'"
        :disabled="isLoading || !phoneNumber.trim() || !password"
        @click="handleLogin"
      >
        <span v-if="isLoading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        {{ isLoading ? '로그인 중...' : '로그인' }}
      </button>

      <!-- 비밀번호 찾기 -->
      <button
        class="self-center text-sm text-text-tertiary active:opacity-70"
        @click="router.push({ name: 'password-reset' })"
      >
        비밀번호를 잊으셨나요?
      </button>
    </div>

    <!-- 회원가입 링크 -->
    <div class="flex items-center justify-center gap-1.5 mb-8">
      <span class="text-sm text-text-tertiary">아직 계정이 없으신가요?</span>
      <button
        class="text-sm font-semibold text-brand active:opacity-70"
        @click="router.push({ name: 'signup' })"
      >
        회원가입
      </button>
    </div>

    <div class="flex-1" />

    <!-- Legal footer -->
    <p class="mb-10 text-xs2 text-text-disabled text-center leading-relaxed px-4">
      계속 진행하면 Tikkle의
      <span class="underline">이용약관</span> 및
      <span class="underline">개인정보 처리방침</span>에 동의합니다.
    </p>
  </div>
</template>
