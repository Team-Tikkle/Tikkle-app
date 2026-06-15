import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ══════════════════════════════════════
    // Public — unauthenticated only
    // ══════════════════════════════════════
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { guestOnly: true },
    },

    // ══════════════════════════════════════
    // Protected — authenticated, any onboarding status
    // ══════════════════════════════════════
    {
      path: '/onboarding',
      name: 'onboarding-survey',
      component: () => import('@/views/onboarding/OnboardingView.vue'),
      meta: { requiresAuth: true },
    },

    // ══════════════════════════════════════
    // Protected — authenticated + onboarding complete
    // ══════════════════════════════════════
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/home/HomeView.vue'),
      meta: { requiresAuth: true, requiresOnboarding: true },
    },
    {
      path: '/payments',
      name: 'payments',
      component: () => import('@/views/payments/PaymentsView.vue'),
      meta: { requiresAuth: true, requiresOnboarding: true },
    },
    {
      path: '/payments/:id/select-stock',
      name: 'stock-select',
      component: () => import('@/views/payments/StockSelectView.vue'),
      meta: { requiresAuth: true, requiresOnboarding: true },
    },
    {
      // Debug/dev route — simulates Android payment push-notification scraping
      path: '/payments/simulator',
      name: 'payment-simulator',
      component: () => import('@/views/payments/PaymentSimulatorView.vue'),
      meta: { requiresAuth: true, requiresOnboarding: true },
    },
    {
      path: '/insights',
      name: 'insights',
      component: () => import('@/views/insights/InsightsView.vue'),
      meta: { requiresAuth: true, requiresOnboarding: true },
    },
    {
      // Full investment glossary — reached from the Beginner's Guide entry card
      path: '/insights/glossary',
      name: 'insights-glossary',
      component: () => import('@/views/insights/GlossaryView.vue'),
      meta: { requiresAuth: true, requiresOnboarding: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/settings/SettingsView.vue'),
      meta: { requiresAuth: true, requiresOnboarding: true },
    },
    {
      // Manage KIS securities account & API keys — reached from Settings
      path: '/settings/api-key',
      name: 'settings-api-key',
      component: () => import('@/views/onboarding/OnboardingApiKeyView.vue'),
      meta: { requiresAuth: true, requiresOnboarding: true },
    },
    {
      path: '/settings/category-rules',
      name: 'category-rules',
      component: () => import('@/views/settings/CategoryRulesView.vue'),
      meta: { requiresAuth: true, requiresOnboarding: true },
    },

    // ══════════════════════════════════════
    // Catch-all unknown paths
    // ══════════════════════════════════════
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: { name: 'login' },
    },
  ],
});

// ══════════════════════════════════════════════════════════════════════════
// Global navigation guard
//
// By the time this runs, useUserStore().bootstrap() has already completed
// in main.ts (awaited before app.mount). The store's isAuthenticated and
// isOnboardingComplete values reflect the true server-side state, so these
// checks are purely synchronous — no async work needed here.
//
// Auto-login flow (token in localStorage):
//   bootstrap() → fetchProfile() succeeds
//     → isAuthenticated = true, isOnboardingComplete = true  → home
//     → isAuthenticated = true, isOnboardingComplete = false → onboarding
//   bootstrap() → fetchProfile() fails (401 + refresh expired)
//     → isAuthenticated = false → login
//
// No token:
//   bootstrap() is a no-op → isAuthenticated = false → login
// ══════════════════════════════════════════════════════════════════════════
router.beforeEach((to) => {
  const { isAuthenticated, isOnboardingComplete } = useUserStore();

  // ── 1. Unauthenticated access to any protected route → /login ──
  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' };
  }

  // ── 2. Authenticated user tries to open /login → bounce away ──
  if (to.meta.guestOnly && isAuthenticated) {
    return isOnboardingComplete
      ? { name: 'home' }
      : { name: 'onboarding-survey' };
  }

  // ── 3. Authenticated but onboarding not complete ──
  if (to.meta.requiresOnboarding && !isOnboardingComplete) {
    return { name: 'onboarding-survey' };
  }

  // ── 4. Unknown path: authenticated users go home, others to login ──
  if (to.name === 'not-found') {
    return isAuthenticated
      ? isOnboardingComplete
        ? { name: 'home' }
        : { name: 'onboarding-survey' }
      : { name: 'login' };
  }

  // All checks passed — allow navigation
});

export default router;
