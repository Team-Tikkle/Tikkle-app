import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile, RoundUpRule } from '@/types'
import { mockUser } from '@/mocks'

export const useUserStore = defineStore('user', () => {
  const profile = ref<UserProfile | null>(mockUser)

  const isOnboardingComplete = computed(
    () => profile.value?.onboarding_completed ?? false,
  )

  function setProfile(newProfile: UserProfile) {
    profile.value = newProfile
  }

  function updateRoundUpRule(rule: RoundUpRule) {
    if (profile.value) profile.value.rule = rule
  }

  function updateTradingMode(is_auto: boolean) {
    if (profile.value) profile.value.is_auto = is_auto
  }

  function completeOnboarding() {
    if (profile.value) profile.value.onboarding_completed = true
  }

  return { profile, isOnboardingComplete, setProfile, updateRoundUpRule, updateTradingMode, completeOnboarding }
})
