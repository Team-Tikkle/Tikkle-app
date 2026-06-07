<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'

const router = useRouter()
const userStore = useUserStore()

// Listen for forced logout triggered by the Axios interceptor when the
// refresh token is expired (AUTH-006). Clear store state and redirect to login.
function handleForceLogout() {
  userStore.accessToken  = null
  userStore.refreshToken = null
  userStore.profile      = null
  router.replace({ name: 'login' })
}

onMounted(()  => window.addEventListener('tikkle:force-logout', handleForceLogout))
onUnmounted(() => window.removeEventListener('tikkle:force-logout', handleForceLogout))
</script>

<template>
  <div class="flex justify-center min-h-screen bg-gray-200">
    <div class="w-full max-w-[430px] relative bg-surface min-h-screen">
      <RouterView />
    </div>
  </div>
</template>
