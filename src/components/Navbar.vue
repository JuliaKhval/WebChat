<template>
  <nav v-if="authStore.isAuthenticated && authStore.currentUser.username">
    <div class="navbar">
      <span>Пользователь: {{ authStore.currentUser.username }}</span>
      <button @click="handleLogout">Выйти</button>
    </div>
  </nav>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/login') // Явное перенаправление
  } catch (error) {
    console.error('Ошибка при выходе:', error)
  }
}
</script>

<style scoped>
.navbar {
  padding: 10px;
  background: #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ddd;
}

.navbar button {
  padding: 5px 10px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>