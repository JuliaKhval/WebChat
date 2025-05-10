import axios from 'axios'

const apiClient = axios.create({
    baseURL: 'http://messenger.somee.com',
    withCredentials: false,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
    }
})

apiClient.interceptors.request.use(config => {
    const authData = localStorage.getItem('auth')
    if (authData) {
        const parsed = JSON.parse(authData)
        config.headers.Authorization = `Bearer ${parsed.token}`
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
    editMessage(chatId, messageId, newText) {
        return apiClient.put(`/message/${chatId}/messages/${messageId}`, { text: newText })
    },
    deleteMessage(chatId, messageId) {
        return apiClient.delete(`/message/${chatId}/messages/${messageId}`)
    }
}