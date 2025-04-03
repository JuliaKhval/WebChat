import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null)

    const isAuthenticated = computed(() => !!user.value)

    function login(username, password) {
        // В реальном приложении здесь будет запрос к API
        if (username && password) {
            user.value = { username }
            localStorage.setItem('user', JSON.stringify(user.value))
            return true
        }
        return false
    }

    function register(username, password) {
        // В реальном приложении здесь будет запрос к API
        if (username && password) {
            user.value = { username }
            localStorage.setItem('user', JSON.stringify(user.value))
            return true
        }
        return false
    }

    function logout() {
        user.value = null
        localStorage.removeItem('user')
    }

    function initialize() {
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
            user.value = JSON.parse(savedUser)
        }
    }

    return { user, isAuthenticated, login, register, logout, initialize }
})