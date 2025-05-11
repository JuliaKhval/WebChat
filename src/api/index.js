import axios from 'axios'

const apiClient = axios.create({
    baseURL: 'https://messengertester.somee.com',
    withCredentials: false,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
    }
})

apiClient.interceptors.request.use(config => {
    const token = sessionStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default {
    // Auth
    login(username, password) {
        return apiClient.post('/user/login', { userName: username, password })
    },
    register(username, password) {
        return apiClient.post('/user/register', { userName: username, password })
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
        return apiClient.put(`/message/${chatId}/messages/${messageId}/Edit`, newText)
    },
    deleteMessage(chatId, messageId) {
        return apiClient.delete(`/message/${chatId}/messages/${messageId}/Delete`)
    }
}