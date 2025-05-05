import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import ChatPage from '../pages/ChatPage.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
    {
        path: '/',
        redirect: '/login'
    },
    {
        path: '/login',
        name: 'Login',
        component: LoginPage,
        meta: { requiresGuest: true }
    },
    {
        path: '/register',
        name: 'Register',
        component: RegisterPage,
        meta: { requiresGuest: true }
    },
    {
        path: '/chat',
        name: 'Chat',
        component: ChatPage,
        meta: { requiresAuth: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach(async (to) => {
    const authStore = useAuthStore()
    await authStore.initialize()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        return '/login'
    }

    if (to.meta.requiresGuest && authStore.isAuthenticated) {
        return '/chat'
    }
})

export default router