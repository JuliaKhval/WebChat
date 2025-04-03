<template>
  <div class="chat-container">
    <div class="messages">
      <ChatMessage
          v-for="(message, index) in messages"
          :key="index"
          :message="message"
      />
    </div>
    <form @submit.prevent="sendMessage" class="message-form">
      <input v-model="newMessage" placeholder="Введите сообщение" required>
      <button type="submit">Отправить</button>
    </form>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import ChatMessage from '../components/ChatMessage.vue'

export default {
  components: { ChatMessage },
  setup() {
    const authStore = useAuthStore()
    const newMessage = ref('')
    const messages = ref([])

    // В реальном приложении здесь будет подключение к WebSocket или API
    const mockMessages = [
      { username: 'user1', text: 'Привет!', time: '12:00' },
      { username: authStore.user?.username, text: 'Привет! Как дела?', time: '12:01' },
      { username: 'user1', text: 'Отлично, спасибо!', time: '12:02' }
    ]

    onMounted(() => {
      messages.value = mockMessages
    })

    const sendMessage = () => {
      if (newMessage.value.trim()) {
        messages.value.push({
          username: authStore.user?.username,
          text: newMessage.value,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
        newMessage.value = ''
      }
    }

    return { newMessage, messages, sendMessage }
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.message-form {
  display: flex;
  padding: 10px;
  border-top: 1px solid #eee;
}

.message-form input {
  flex: 1;
  padding: 10px;
  margin-right: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.message-form button {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>