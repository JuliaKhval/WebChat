import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
    const router = useRouter()
    const currentUser = ref({ id: null, username: '' })
    const token = ref(null)
    const isLoading = ref(false)

    const isAuthenticated = computed(() => !!token.value)

    async function initialize() {
        const authData = sessionStorage.getItem('auth')
        if (authData) {
            try {
                const parsed = JSON.parse(authData)
                token.value = parsed.token
                currentUser.value = {
                    id: parsed.userId,
                    username: parsed.username
                }
                axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
            } catch (e) {
                await clearAuthData()
            }
        }
    }

    async function login(username, password) {
        isLoading.value = true
        try {
            const response = await axios.post('/user/login', { username, password })

            if (!response.data.token || !response.data.id) {
                throw new Error('Неверный ответ сервера')
            }

            token.value = response.data.token
            currentUser.value = {
                id: response.data.id,
                username: username
            }

            sessionStorage.setItem('auth', JSON.stringify({
                token: token.value,
                userId: currentUser.value.id,
                username: currentUser.value.username
            }))

            axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
            router.push('/chat')
            return true
        } catch (error) {
            throw error
        } finally {
            isLoading.value = false
        }
    }

    async function register(username, password) {
        isLoading.value = true
        try {
            const response = await axios.post('/user/register', { username, password })

            if (response.status !== 200) {
                throw new Error('Ошибка регистрации')
            }

            await login(username, password)
            return true
        } catch (error) {
            throw error
        } finally {
            isLoading.value = false
        }
    }

    async function logout() {
        await clearAuthData()
        router.push('/login')
    }

    async function clearAuthData() {
        token.value = null
        currentUser.value = { id: null, username: '' }
        sessionStorage.removeItem('auth')
        delete axios.defaults.headers.common['Authorization']
    }

    return {
        currentUser,
        token,
        isLoading,
        isAuthenticated,
        initialize,
        login,
        register,
        logout,
        clearAuthData
    }
})