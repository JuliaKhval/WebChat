import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import axios from 'axios'

// Настройка axios
axios.defaults.baseURL = 'https://messengertester.somee.com'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')