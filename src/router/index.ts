import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/onboarding',
      name: 'onboarding-survey',
      component: () => import('@/views/onboarding/OnboardingSurveyView.vue'),
    },
    {
      path: '/onboarding/api-key',
      name: 'onboarding-api-key',
      component: () => import('@/views/onboarding/OnboardingApiKeyView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/home/HomeView.vue'),
      meta: { requiresOnboarding: true },
    },
    {
      path: '/payments',
      name: 'payments',
      component: () => import('@/views/payments/PaymentsView.vue'),
      meta: { requiresOnboarding: true },
    },
    {
      path: '/payments/:id/select-stock',
      name: 'stock-select',
      component: () => import('@/views/payments/StockSelectView.vue'),
      meta: { requiresOnboarding: true },
    },
    {
      path: '/insights',
      name: 'insights',
      component: () => import('@/views/insights/InsightsView.vue'),
      meta: { requiresOnboarding: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/settings/SettingsView.vue'),
      meta: { requiresOnboarding: true },
    },
  ],
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.meta.requiresOnboarding && !userStore.isOnboardingComplete) {
    return { name: 'onboarding-survey' }
  }
})

export default router
