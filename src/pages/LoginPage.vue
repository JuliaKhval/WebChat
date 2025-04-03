<template>
  <div class="auth-form">
    <h1>Вход</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Имя пользователя</label>
        <input v-model="username" type="text" required>
      </div>
      <div class="form-group">
        <label>Пароль</label>
        <input v-model="password" type="password" required>
      </div>
      <button type="submit">Войти</button>
      <p>Нет аккаунта? <router-link to="/register">Зарегистрируйтесь</router-link></p>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export default {
  setup() {
    const username = ref('')
    const password = ref('')
    const error = ref('')
    const router = useRouter()
    const authStore = useAuthStore()

    const handleSubmit = async () => {
      try {
        const success = authStore.login(username.value, password.value)
        if (success) {
          router.push('/')
        } else {
          error.value = 'Неверные данные'
        }
      } catch (err) {
        error.value = 'Ошибка входа'
      }
    }

    return { username, password, error, handleSubmit }
  }
}
</script>

<style scoped>
.auth-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 10px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error {
  color: #f44336;
  margin-top: 10px;
}
</style>