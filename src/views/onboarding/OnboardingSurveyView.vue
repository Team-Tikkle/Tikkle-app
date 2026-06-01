<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'
import type { RiskType, RoundUpRule } from '@/types'

const router = useRouter()
const userStore = useUserStore()

// ── Step tracking ──
const currentStep = ref<1 | 2>(1)

// ── Step 1: risk type ──
const selectedRisk = ref<RiskType | null>(null)

const riskOptions: { value: RiskType; label: string; risk: string; desc: string }[] = [
  { value: 'STABLE',     label: '안정형',     risk: '낮은 위험', desc: '원금 보존을 최우선으로 하며 낮은 수익률을 감수합니다' },
  { value: 'NEUTRAL',    label: '중립형',     risk: '보통 위험', desc: '수익과 안정성 사이의 균형을 추구합니다' },
  { value: 'AGGRESSIVE', label: '적극투자형', risk: '높은 위험', desc: '높은 수익을 위해 상당한 위험을 감수합니다' },
]

// ── Step 2: round-up rule ──
type SpareTab = 'amount' | 'percent'
const activeTab = ref<SpareTab>('amount')

// Amount tab state
const amountOptions: { value: RoundUpRule; label: string }[] = [
  { value: 'UNDER_1000', label: '1,000원' },
  { value: 'UNDER_500',  label: '5,000원' },
  { value: 'UNDER_100',  label: '10,000원' },
]
const selectedAmount = ref<RoundUpRule>('UNDER_1000')

// Percent tab state
const percentOptions = ['1%', '5%', '10%']
const selectedPercent = ref('5%')

// Trading mode shared between tabs
const isAuto = ref(true)

// ── Progress ──
const progressPct = computed(() => (currentStep.value === 1 ? 20 : 40))

// ── Navigation ──
function goNext() {
  if (currentStep.value === 1) {
    if (!selectedRisk.value) return
    currentStep.value = 2
  } else {
    // Persist choices and go to API key screen
    if (userStore.profile) {
      userStore.profile.risk_type = selectedRisk.value!
      userStore.profile.rule     = activeTab.value === 'amount' ? selectedAmount.value : 'UNDER_100'
      userStore.profile.is_auto  = isAuto.value
    }
    router.push('/onboarding/api-key')
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col">

    <!-- ── Status bar placeholder ── -->
    <div class="bg-white h-12 shrink-0" />

    <!-- ── Scrollable content ── -->
    <div class="flex-1 overflow-y-auto flex flex-col">

      <!-- Progress header -->
      <div class="bg-white px-6 pt-1 pb-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-text-tertiary font-normal">
            {{ currentStep }} / 5 단계
          </span>
          <span class="text-sm font-semibold text-brand">{{ progressPct }}%</span>
        </div>
        <!-- Progress track -->
        <div class="h-1.5 bg-surface-border rounded-pill overflow-hidden">
          <div
            class="h-full bg-brand rounded-pill transition-all duration-300"
            :style="{ width: progressPct + '%' }"
          />
        </div>
      </div>

      <!-- ════════════ STEP 1: Risk type ════════════ -->
      <div v-if="currentStep === 1" class="px-6 pt-6 pb-28 flex flex-col gap-6">

        <!-- Section label -->
        <span class="text-sm font-semibold text-brand">투자 성향 분석</span>

        <!-- Title -->
        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold text-text-primary leading-snug">
            나의 투자 스타일은<br>어떤 유형인가요?
          </h2>
          <p class="text-base text-text-tertiary leading-relaxed">
            잔돈 투자에 맞는 종목을 추천하기 위해 성향을 파악합니다.
          </p>
        </div>

        <!-- Options -->
        <div class="flex flex-col gap-3">
          <button
            v-for="opt in riskOptions"
            :key="opt.value"
            class="w-full bg-white rounded-xl border-2 px-4 py-4 flex items-center justify-between text-left transition-all"
            :class="selectedRisk === opt.value
              ? 'border-brand bg-brand-bg'
              : 'border-surface-border'"
            @click="selectedRisk = opt.value"
          >
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span
                  class="text-md font-semibold"
                  :class="selectedRisk === opt.value ? 'text-brand' : 'text-text-primary'"
                >
                  {{ opt.label }}
                </span>
                <span class="text-xs2 font-medium text-text-tertiary">{{ opt.risk }}</span>
              </div>
              <span class="text-sm text-text-tertiary font-medium leading-snug">{{ opt.desc }}</span>
            </div>
            <!-- Radio indicator -->
            <div
              class="w-5 h-5 rounded-pill border-2 flex items-center justify-center shrink-0 ml-3 transition-all"
              :class="selectedRisk === opt.value
                ? 'border-brand'
                : 'border-text-disabled'"
            >
              <div
                v-if="selectedRisk === opt.value"
                class="w-2.5 h-2.5 rounded-pill bg-brand"
              />
            </div>
          </button>
        </div>
      </div>

      <!-- ════════════ STEP 2: Spare change rule ════════════ -->
      <div v-else class="px-6 pt-6 pb-28 flex flex-col gap-6">

        <!-- Section label -->
        <span class="text-sm font-semibold text-brand">잔돈 설정</span>

        <!-- Title -->
        <h2 class="text-2xl font-bold text-text-primary leading-snug">
          잔돈 규칙과 매매<br>방식을 설정하세요
        </h2>

        <!-- Spare change type tabs -->
        <div>
          <p class="text-base font-semibold text-text-primary mb-3">잔돈 발생 방식</p>
          <div class="bg-surface-alt rounded-xl p-1 flex gap-1">
            <button
              class="flex-1 py-2 rounded-lg text-base font-semibold transition-all"
              :class="activeTab === 'amount'
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-tertiary'"
              @click="activeTab = 'amount'"
            >
              올림 잔돈 적립
            </button>
            <button
              class="flex-1 py-2 rounded-lg text-base font-semibold transition-all"
              :class="activeTab === 'percent'
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-tertiary'"
              @click="activeTab = 'percent'"
            >
              비율 잔돈 적립
            </button>
          </div>
        </div>

        <!-- Tab A: Amount -->
        <div v-if="activeTab === 'amount'" class="bg-white rounded-xl p-4 flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-base text-text-tertiary font-normal">올림 기준 단위</span>
            <span class="text-xl font-bold text-text-primary">
              {{ amountOptions.find(o => o.value === selectedAmount)?.label }}
            </span>
            <p class="text-sm text-text-tertiary leading-relaxed">
              결제 금액을 {{ amountOptions.find(o => o.value === selectedAmount)?.label }} 단위로 올림한 차액을 잔돈으로 적립합니다
            </p>
          </div>
          <!-- Amount chips -->
          <div class="flex gap-2">
            <button
              v-for="opt in amountOptions"
              :key="opt.value"
              class="px-4 py-2 rounded-pill text-sm border transition-all"
              :class="selectedAmount === opt.value
                ? 'bg-brand text-white border-brand font-semibold'
                : 'bg-white text-text-disabled border-surface-border'"
              @click="selectedAmount = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Tab B: Percent -->
        <div v-else class="bg-white rounded-xl p-4 flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-base text-text-tertiary font-normal">적립 비율</span>
            <span class="text-xl font-bold text-text-primary">{{ selectedPercent }}</span>
            <p class="text-sm text-text-tertiary leading-relaxed">
              결제 금액의 {{ selectedPercent }}를 잔돈으로 자동 적립합니다
            </p>
          </div>
          <!-- Percent chips -->
          <div class="flex gap-2">
            <button
              v-for="pct in percentOptions"
              :key="pct"
              class="px-4 py-2 rounded-pill text-sm border transition-all"
              :class="selectedPercent === pct
                ? 'bg-brand text-white border-brand font-semibold'
                : 'bg-white text-text-disabled border-surface-border'"
              @click="selectedPercent = pct"
            >
              {{ pct }}
            </button>
          </div>
        </div>

        <!-- Trading mode -->
        <div>
          <p class="text-base font-semibold text-text-primary mb-3">매매 방식</p>
          <div class="bg-surface-alt rounded-xl p-1 flex gap-1">
            <button
              class="flex-1 py-3 rounded-lg transition-all"
              :class="isAuto ? 'bg-white shadow-sm' : ''"
              @click="isAuto = true"
            >
              <p class="text-base font-semibold" :class="isAuto ? 'text-text-primary' : 'text-text-tertiary'">
                자동 매매
              </p>
              <p class="text-xs2 font-medium text-text-tertiary mt-0.5">잔돈 자동 투자</p>
            </button>
            <button
              class="flex-1 py-3 rounded-lg transition-all"
              :class="!isAuto ? 'bg-white shadow-sm' : ''"
              @click="isAuto = false"
            >
              <p class="text-base font-semibold" :class="!isAuto ? 'text-text-primary' : 'text-text-tertiary'">
                수동 매매
              </p>
              <p class="text-xs2 font-medium text-text-tertiary mt-0.5">직접 종목 선택</p>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Sticky bottom CTA ── -->
    <div class="sticky bottom-0 bg-surface px-6 pt-3 pb-8">
      <button
        class="w-full py-4 rounded-xl text-md font-semibold text-white transition-colors"
        :class="(currentStep === 1 && !selectedRisk)
          ? 'bg-text-disabled'
          : 'bg-brand active:bg-brand-hover'"
        :disabled="currentStep === 1 && !selectedRisk"
        @click="goNext"
      >
        다음
      </button>
    </div>
  </div>
</template>
