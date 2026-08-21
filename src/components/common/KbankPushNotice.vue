<template>
  <!-- 케이뱅크 결제 푸시 알림 필수 안내 + 설정 경로.
       온보딩(OnboardingCardRegister)과 설정(KbankCardView)에서 같이 쓴다. -->
  <div class="bg-warning-bg border border-warning rounded-xl px-4 py-3.5 flex items-start gap-3">
    <svg
      class="text-warning shrink-0 mt-0.5"
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
    <div class="flex flex-col gap-2">
      <p class="text-sm font-bold text-warning">케이뱅크 앱 푸시 알림 필수</p>
      <p class="text-xs2 text-text-tertiary leading-relaxed">
        케이뱅크 앱의 결제 푸시 알림이 켜져 있어야 정상 작동합니다.
      </p>

      <!-- 알림 설정 경로 안내 -->
      <div class="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs2 text-text-secondary">
        <span>'케이뱅크' 앱 실행</span>
        <span class="text-text-disabled">→</span>

        <span class="inline-flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="3" x2="21" y1="6" y2="6" />
            <line x1="3" x2="21" y1="12" y2="12" />
            <line x1="3" x2="21" y1="18" y2="18" />
          </svg>
          전체
        </span>
        <span class="text-text-disabled">→</span>

        <span class="inline-flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          설정
        </span>
        <span class="text-text-disabled">→</span>

        <span>알림</span>
        <span class="text-text-disabled">→</span>
        <span class="font-semibold text-text-primary">'카드' 알림 ON</span>
      </div>
    </div>
  </div>
</template>
