<template>
  <nav>
    <h2>Чат</h2>
    <button @click="logout">Выйти</button>
  </nav>
</template>

<script>
import { useAuthStore } from '../stores/auth'

export default {
  setup() {
    const authStore = useAuthStore()

    const logout = () => {
      authStore.logout()
      window.location.href = '/login'
    }

    return { logout }
  }
}
</script>

<style scoped>
nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

button {
  padding: 5px 10px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>