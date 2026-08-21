<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import BottomNav from '@/components/common/BottomNav.vue'
import { useUserStore } from '@/stores/useUserStore'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useModalBackHandler } from '@/composables/useAndroidBack'
import { LEGAL_DOCS, type LegalDocKey } from '@/utils/legal'
import MarkdownDoc from '@/components/common/MarkdownDoc.vue'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import {
  isListenerEnabled,
  openNotificationAccessSettings,
  isBatteryExempt,
  requestBatteryExemption,
  openBatteryOptimizationSettings,
} from '@/utils/tikkleSystem'

const router = useRouter()
const userStore = useUserStore()

// ── 시스템 권한 상태 (Android 네이티브에서만 노출) ──
// 설정 화면에서 켜고 돌아오는 경우를 위해 앱 복귀(resume) 시 재확인한다.
const isNativeApp = Capacitor.isNativePlatform()
const listenerOn  = ref(true)
const batteryOk   = ref(true)
let resumeHandle: PluginListenerHandle | null = null

function refreshSystemStatus() {
  isListenerEnabled().then((v) => { listenerOn.value = v })
  isBatteryExempt().then((v) => { batteryOk.value = v })
}

// ── 앱 버전 ──
// 네이티브의 versionName(android/app/build.gradle)을 그대로 읽어 표시한다.
// 하드코딩해두면 gradle 값과 어긋나므로, 버전은 gradle 한 곳에서만 관리한다.
// 웹에서는 조회할 수 없어 빈 값으로 두고 줄 자체를 감춘다.
const appVersion = ref('')

// Ensure profile is loaded even if the user navigates directly to /settings
// without passing through HomeView (e.g. deep-link or hard refresh).
onMounted(async () => {
  if (!userStore.profile?.name) userStore.fetchProfile().catch(() => {})
  refreshSystemStatus()
  if (isNativeApp) {
    CapApp.getInfo()
      .then(({ version }) => { appVersion.value = version })
      .catch(() => {})
  }
  resumeHandle = await CapApp.addListener('resume', refreshSystemStatus)
})

onUnmounted(() => { resumeHandle?.remove() })

// Withdrawal modal state
const showWithdrawalModal = ref(false)

// Logout: calls POST /api/auth/logout, clears session, redirects to /login
const isLoggingOut = ref(false)
async function handleLogout() {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await userStore.logout()
    router.replace({ name: 'login' })
  } finally {
    isLoggingOut.value = false
  }
}

// Delete account: calls DELETE /api/users/me, clears session, redirects to /login
// 실패 시 errorMsg만 설정되고 modal은 열린 채로 유지됨 (사용자가 재시도 가능)
const { isLoading: isDeletingAccount, run: runDeleteAccount } = useAsyncAction()
function handleDeleteAccount() {
  runDeleteAccount(async () => {
    await userStore.deleteAccount()
    showWithdrawalModal.value = false
    router.replace({ name: 'login' })
  })
}

// 전화번호를 010-1234-5678 형태로 표시 (11자리 기준, 그 외는 원문 반환)
function formatPhone(phone?: string): string {
  if (!phone) return ''
  if (/^01[0-9]{9}$/.test(phone)) return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  if (/^01[0-9]{8}$/.test(phone)) return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
  return phone
}

// Chevron icon (right arrow for menu items)
const chevronRight = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`

// Legal sheet: 'privacy' | 'terms' | null
const legalSheet = ref<LegalDocKey | null>(null)

// 뒤로가기 시 열려있는 모달/시트를 닫는다
useModalBackHandler(computed(() => legalSheet.value !== null), () => { legalSheet.value = null })
useModalBackHandler(showWithdrawalModal, () => { showWithdrawalModal.value = false })

</script>

<template>
  <div class="min-h-screen bg-surface pb-24">
    <AppHeader title="설정" />

    <div class="px-4 pt-3 flex flex-col gap-3">

      <!-- ── Profile card ── -->
      <div class="bg-white rounded-xl px-5 py-5">
        <div class="flex items-center gap-4">
          <!-- Avatar: first letter of name, falls back to coin emoji -->
          <div class="w-[52px] h-[52px] rounded-xl bg-brand-bg flex items-center justify-center text-2xl font-bold text-brand shrink-0">
            {{ userStore.profile?.name?.charAt(0) || '🪙' }}
          </div>
          <!-- Info: reactively bound to store — clears on logout automatically -->
          <div class="min-w-0">
            <p class="text-md font-bold text-text-primary truncate">
              {{ userStore.profile?.name || '티끌 유저' }}
            </p>
            <p class="text-sm text-text-tertiary mt-0.5 truncate">
              {{ formatPhone(userStore.profile?.phoneNumber) }}
            </p>
          </div>
        </div>
      </div>

      <!-- ── Investment settings ── -->
      <div class="bg-white rounded-xl overflow-hidden divide-y divide-surface-border">
        <!-- 자동 투자 On/Off -->
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="router.push('/settings/investment')"
        >
          <div class="flex flex-col gap-1 text-left">
            <span class="text-base font-medium text-text-primary">자동 투자 설정</span>
            <span class="text-sm text-text-tertiary">잔돈 자동 투자 서비스 유지·중단</span>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="chevronRight" />
        </button>
        <!-- 투자 규칙 변경 -->
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="router.push('/settings/category-rules')"
        >
          <div class="flex flex-col gap-1 text-left">
            <span class="text-base font-medium text-text-primary">투자 규칙 변경</span>
            <span class="text-sm text-text-tertiary">카테고리별 잔돈 규칙 설정</span>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="chevronRight" />
        </button>
        <!-- 투자 성향 및 관심 테마 -->
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="router.push('/settings/investment-profile')"
        >
          <div class="flex flex-col gap-1 text-left">
            <span class="text-base font-medium text-text-primary">투자 성향 및 관심 테마</span>
            <span class="text-sm text-text-tertiary">AI 종목 추천에 반영되는 투자 성향 변경</span>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="chevronRight" />
        </button>
        <!-- 케이뱅크 카드 변경 -->
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="router.push('/settings/kbank-card')"
        >
          <div class="flex flex-col gap-1 text-left">
            <span class="text-base font-medium text-text-primary">케이뱅크 카드 변경</span>
            <span class="text-sm text-text-tertiary">잔돈 출금 카드 번호 변경</span>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="chevronRight" />
        </button>
        <!-- 업비트 계정 및 API 키 관리 -->
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="router.push('/settings/api-key')"
        >
          <span class="text-base font-medium text-text-primary">업비트 계정 및 API 키 관리</span>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="chevronRight" />
        </button>
      </div>

      <!-- ── System permissions (native only) ── -->
      <div v-if="isNativeApp" class="bg-white rounded-xl overflow-hidden divide-y divide-surface-border">
        <!-- 알림 접근 권한 -->
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="openNotificationAccessSettings()"
        >
          <div class="flex flex-col gap-1 text-left">
            <span class="text-base font-medium text-text-primary">알림 접근 권한</span>
            <span class="text-sm text-text-tertiary">결제 알림을 읽어 잔돈을 적립하는 데 필요해요</span>
          </div>
          <span
            class="text-sm font-semibold shrink-0"
            :class="listenerOn ? 'text-brand' : 'text-danger'"
          >{{ listenerOn ? '켜짐' : '꺼짐' }}</span>
        </button>
        <!-- 배터리 최적화 제외 -->
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="batteryOk ? openBatteryOptimizationSettings() : requestBatteryExemption()"
        >
          <div class="flex flex-col gap-1 text-left">
            <span class="text-base font-medium text-text-primary">배터리 사용 최적화 제외</span>
            <span class="text-sm text-text-tertiary">백그라운드에서도 결제 감지가 멈추지 않아요</span>
          </div>
          <span
            class="text-sm font-semibold shrink-0"
            :class="batteryOk ? 'text-brand' : 'text-danger'"
          >{{ batteryOk ? '적용됨' : '미적용' }}</span>
        </button>
      </div>

      <!-- ── General settings ── -->
      <div class="bg-white rounded-xl overflow-hidden divide-y divide-surface-border">
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="router.push('/settings/notices')"
        >
          <span class="text-base font-medium text-text-primary">공지사항</span>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="chevronRight" />
        </button>
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="legalSheet = 'privacy'"
        >
          <span class="text-base font-medium text-text-primary">개인정보처리방침</span>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="chevronRight" />
        </button>
        <button
          class="w-full px-5 py-4 flex items-center justify-between active:bg-surface"
          @click="legalSheet = 'terms'"
        >
          <span class="text-base font-medium text-text-primary">이용약관</span>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="chevronRight" />
        </button>
        <!-- App version — non-clickable. 네이티브에서만 조회되므로 웹에서는 숨긴다. -->
        <div v-if="appVersion" class="px-5 py-4 flex items-center justify-between">
          <span class="text-base font-medium text-text-tertiary">앱 버전 {{ appVersion }}</span>
        </div>
      </div>

      <!-- ── Logout ── -->
      <div class="bg-white rounded-xl overflow-hidden">
        <button
          class="w-full px-5 py-4 flex items-center gap-3 active:bg-surface transition-colors disabled:opacity-50"
          :disabled="isLoggingOut"
          @click="handleLogout"
        >
          <!-- Logout icon -->
          <svg
            class="text-text-secondary shrink-0"
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>

          <span class="text-base font-medium text-text-primary">
            {{ isLoggingOut ? '로그아웃 중...' : '로그아웃' }}
          </span>

          <!-- Spinner while request is in-flight -->
          <span
            v-if="isLoggingOut"
            class="ml-auto w-4 h-4 border-2 border-surface-border border-t-brand rounded-full animate-spin"
          />
        </button>
      </div>

      <!-- ── Danger zone: withdrawal ── -->
      <div class="bg-white rounded-xl overflow-hidden">
        <button
          class="w-full px-5 py-4 flex flex-col gap-0.5 active:bg-surface text-left"
          @click="showWithdrawalModal = true"
        >
          <span class="text-base font-medium text-danger">서비스 탈퇴</span>
          <span class="text-sm text-danger-light">탈퇴 시 계정 정보가 삭제되며 되돌릴 수 없습니다</span>
        </button>
      </div>

      <!-- ── Contact ── -->
      <div class="px-2 py-1 flex items-center gap-2">
        <span class="text-sm text-text-disabled">문의</span>
        <a href="mailto:support@tikkle.xyz" class="text-sm text-text-tertiary underline underline-offset-2">
          support@tikkle.xyz
        </a>
      </div>

    </div>

    <BottomNav />

    <!-- ════ Legal sheet (Teleport to body) ════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="legalSheet"
          class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          @click.self="legalSheet = null"
        >
            <div
              class="w-full max-w-mobile bg-white rounded-t-3xl flex flex-col"
              style="height: 85dvh"
            >
              <!-- Sheet header -->
              <div class="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                <h3 class="text-lg font-bold text-text-primary">{{ LEGAL_DOCS[legalSheet].title }}</h3>
                <button
                  class="w-8 h-8 flex items-center justify-center text-text-tertiary"
                  @click="legalSheet = null"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div class="h-px bg-surface-border shrink-0" />
              <!-- Content area -->
              <div class="flex-1 overflow-y-auto px-6 py-6">
                <MarkdownDoc :source="LEGAL_DOCS[legalSheet].body" />
              </div>
            </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ════ Withdrawal modal (Teleport to body) ════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showWithdrawalModal"
          class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          @click.self="showWithdrawalModal = false"
        >
          <!-- Sheet -->
            <div
              class="w-full max-w-mobile bg-white rounded-t-3xl px-6 pt-6 pb-10 flex flex-col gap-5"
            >
              <!-- Header -->
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-brand">서비스 탈퇴</h3>
                <button
                  class="w-8 h-8 flex items-center justify-center text-text-tertiary"
                  @click="showWithdrawalModal = false"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <!-- Warning box -->
              <div class="bg-danger-bg rounded-xl p-4 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-base font-semibold text-danger">⚠️ 주의</span>
                </div>
                <p class="text-sm text-text-tertiary leading-relaxed">
                  탈퇴 시 결제 내역을 포함한 모든 데이터가 삭제되며 복구할 수 없습니다.<br>
                  동일 번호로 재가입은 가능하나, 과거 내역은 복원되지 않습니다.
                </p>
              </div>

              <!-- Actions -->
              <div class="flex flex-col gap-3">
                <button
                  class="w-full py-4 rounded-xl bg-danger text-white text-md font-bold active:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
                  :disabled="isDeletingAccount"
                  @click="handleDeleteAccount"
                >
                  <!-- Spinner while DELETE /api/users/me is in-flight -->
                  <span
                    v-if="isDeletingAccount"
                    class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                  />
                  {{ isDeletingAccount ? '처리 중...' : '탈퇴 신청하기' }}
                </button>
                <button
                  class="w-full py-4 rounded-xl bg-surface text-md font-semibold text-text-primary active:bg-surface-border"
                  :disabled="isDeletingAccount"
                  @click="showWithdrawalModal = false"
                >
                  취소
                </button>
              </div>
            </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
