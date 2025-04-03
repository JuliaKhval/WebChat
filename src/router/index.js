import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import ChatPage from '../pages/ChatPage.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
    { path: '/login', component: LoginPage },
    { path: '/register', component: RegisterPage },
    {
        path: '/',
        component: ChatPage,
        meta: { requiresAuth: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next('/login')
    } else if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
        next('/')
    } else {
        next()
    }
})

export default router