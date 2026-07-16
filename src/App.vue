<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

// 하단 탭(BottomNav) 간 이동은 화면이 위아래로 움직이는 게 아니라
// 즉시 전환되어야 하므로, 탭↔탭 이동일 때만 트랜지션을 끈다.
const TAB_ROUTE_NAMES = new Set(['home', 'payments', 'insights', 'settings'])

const transitionName = ref('page')
const router = useRouter()

router.beforeEach((to, from) => {
  const isTabToTab = TAB_ROUTE_NAMES.has(String(to.name)) && TAB_ROUTE_NAMES.has(String(from.name))
  transitionName.value = isTabToTab ? '' : 'page'
})
</script>

<template>
  <div class="flex justify-center min-h-screen bg-gray-200">
    <div class="w-full max-w-[430px] relative bg-surface min-h-screen">
      <RouterView v-slot="{ Component }">
        <Transition :name="transitionName" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </div>
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>
