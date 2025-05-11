import axios from 'axios'

const apiClient = axios.create({
    baseURL: 'http://messenger.somee.com',
    withCredentials: false,
    headers: {
        'Content-Type': 'application/json'
    }
})

apiClient.interceptors.request.use(config => {
    const authData = sessionStorage.getItem('auth')
    if (authData) {
        try {
            const { token } = JSON.parse(authData)
            config.headers.Authorization = `Bearer ${token}`
        } catch (e) {
            console.error('Error parsing auth data:', e)
        }
    }
    return config
})

export default {
    // Auth
    login(username, password) {
        return apiClient.post('/user/login', { username, password })
    },
    register(username, password) {
        return apiClient.post('/user/register', { username, password })
    },

    // Chats
    getUserChats(userId) {
        return apiClient.get(`/chat/${userId}/chats`)
    },

    // Messages
    getChatMessages(chatId) {
        return apiClient.get(`/message/${chatId}/messages`)
    },
    sendMessage(chatId, userId, content) {
        return apiClient.post(`/message/${chatId}/messages/${userId}/Add`, { content })
    },
    editMessage(chatId, messageId, content) {
        return apiClient.put(`/message/${chatId}/messages/${messageId}`, { content })
    },
    deleteMessage(chatId, messageId) {
        return apiClient.delete(`/message/${chatId}/messages/${messageId}`)
    },

    // WebSocket token
    get token() {
        const authData = localStorage.getItem('auth')
        return authData ? JSON.parse(authData).token : null
    }
}