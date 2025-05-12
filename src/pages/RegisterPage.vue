<template>
  <div class="auth-form">
    <h1>Регистрация</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Имя пользователя</label>
        <input v-model="username" type="text" required>
      </div>
      <div class="form-group">
        <label>Пароль</label>
        <input v-model="password" type="password" required>
      </div>
      <button type="submit" :disabled="authStore.isLoading">
        {{ authStore.isLoading ? 'Регистрация...' : 'Зарегистрироваться' }}
      </button>
      <p>Уже есть аккаунт? <router-link to="/login">Войдите</router-link></p>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const username = ref('')
const password = ref('')
const error = ref('')

const handleSubmit = async () => {
  error.value = ''
  try {
    await authStore.register(username.value, password.value)
    // После успешной регистрации остаемся на странице для входа
  } catch (err) {
    error.value = 'Ошибка регистрации: ' + (err.response?.data?.message || err.message)
  }
}
</script>
<style scoped>

.auth-form {
  max-width: 400px;
  margin: 5rem auto;
  padding: 2rem;
  background-color: #f1eeee;
  border-radius: 2.5rem;
  box-shadow: 0 0.5rem 1rem rgb(209, 208, 208);
}

.auth-form h1 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #171717;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #212223;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #414447;
  border-radius: 3.2rem;
  background-color: #e0e0e3;

}

.form-group input:focus {
  border-color: #0c0d0e;
  border: 20px;

}

button {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  color: #fff;
  background-color: #393838;
  border: none;
  border-radius: 3.2rem;
  cursor: pointer;

}

button:hover {
  background-color: #212223;
}



.error {
  color: #dc3545;
  margin-top: 1rem;
  text-align: center;
}

p {
  text-align: center;
  margin-top: 1rem;
  color: #171717;
}

a {
  color: #053b77;
  text-decoration: none;
  font-weight: bold;
}


</style>