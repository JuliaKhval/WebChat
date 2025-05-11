<template>
  <div class="chat-app">
    <UserList
        :chats="userChats"
        :selected-chat="currentChat"
        @select-chat="openChat"
    />

    <div class="chat-window">
      <div v-if="currentChat" class="active-chat">
        <div class="chat-header">
          Чат с {{ currentChat.receiverUsername }}
        </div>

        <div ref="messagesContainer" class="messages">
          <Message
              v-for="message in currentMessages"
              :key="message.id"
              :message="message"
              :current-user-id="authStore.currentUser.id"
              @edit="editMessage(currentChat.id, message.id, $event)"
              @delete="deleteMessage(currentChat.id, message.id)"
          />
        </div>

        <div class="message-input">
          <input
              v-model="messageContent"
              placeholder="Введите сообщение..."
              @keyup.enter="handleSendMessage"
          >
          <button @click="handleSendMessage">
            Отправить
          </button>
        </div>
      </div>

      <div v-else class="no-chat">
        <p>Выберите чат для начала общения</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import Message from '../components/ChatMessage.vue'
import UserList from '../components/UserList.vue'
import { useChatHub } from '../api/signalr.js'

const authStore = useAuthStore()
const userChats = ref([])
const currentChat = ref(null)
const messageContent = ref('')
const messages = ref({})
const messagesContainer = ref(null)

// Инициализация SignalR
const {
  startConnection,
  joinChat,
  sendMessage,
  onReceiveMessage,
  onMessageEdited,
  onMessageDeleted
} = useChatHub()

// Загрузка чатов
const loadChats = async () => {
  try {
    const response = await api.getUserChats(authStore.currentUser.id)
    userChats.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки чатов:', error)
  }
}

// Открытие чата
const openChat = async (chat) => {
  if (currentChat.value) {
    // Покидаем предыдущий чат
    await leaveChat(currentChat.value.id, authStore.currentUser.id)
  }

  currentChat.value = chat

  if (!messages.value[chat.id]) {
    await loadMessages(chat.id)
  }

  // Присоединяемся к чату через SignalR
  await joinChat(chat.id, authStore.currentUser.id)
}

// Загрузка сообщений из API
const loadMessages = async (chatId) => {
  try {
    const response = await api.getChatMessages(chatId)
    messages.value = {
      ...messages.value,
      [chatId]: response.data
    }

    scrollToBottom()
  } catch (error) {
    console.error('Ошибка загрузки сообщений:', error)
  }
}

// Отправка сообщения через SignalR
const handleSendMessage = async () => {
  if (!messageContent.value.trim() || !currentChat.value) return

  try {
    await sendMessage(
        currentChat.value.id,
        authStore.currentUser.id,
        messageContent.value
    )

    messageContent.value = ''
    scrollToBottom()
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error)
  }
}

// Редактирование сообщения (через API)
const editMessage = async (chatId, messageId, newText) => {
  try {
    await api.editMessage(chatId, messageId, { content: newText })
    await loadMessages(chatId)
  } catch (error) {
    console.error('Ошибка редактирования сообщения:', error)
  }
}

// Удаление сообщения (через API)
const deleteMessage = async (chatId, messageId) => {
  try {
    await api.deleteMessage(chatId, messageId)
    await loadMessages(chatId)
  } catch (error) {
    console.error('Ошибка удаления сообщения:', error)
  }
}

// Скролл до последнего сообщения
const scrollToBottom = () => {
  nextTick(() => {
    messagesContainer.value?.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: "smooth"
    })
  })
}

// Выход из чата
const leaveChat = async (chatId, userId) => {
  try {
    await api.leaveChat(chatId, userId)
  } catch (err) {
    console.error('Ошибка выхода из чата:', err)
  }
}

// Вычисляемые сообщения для текущего чата
const currentMessages = computed(() => {
  return currentChat.value ? messages.value[currentChat.value.id] || [] : []
})

// Подписываемся на события SignalR
onMounted(async () => {
  await startConnection()
  await loadChats()

  // Получение нового сообщения
  onReceiveMessage((chatId, userId, messageText, messageId, timestamp) => {
    if (+chatId === currentChat.value?.id) {
      messages.value[currentChat.value.id].push({
        id: messageId,
        senderId: userId,
        content: messageText,
        timestamp,
        isEdited: false
      })

      scrollToBottom()
    }
  })

  // Обновление сообщения
  onMessageEdited((chatId, messageId, newContent) => {
    const chatMessages = messages.value[chatId]
    const msgIndex = chatMessages.findIndex(m => m.id === messageId)

    if (msgIndex !== -1) {
      chatMessages[msgIndex].content = newContent
      chatMessages[msgIndex].isEdited = true
    }
  })

  // Удаление сообщения
  onMessageDeleted((chatId, messageId) => {
    messages.value[chatId] = messages.value[chatId].filter(m => m.id !== messageId)
  })
})
</script>

<style scoped>
.chat-app {
  display: flex;
  height: 100vh;
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.active-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.no-chat {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #999;
}

.chat-header {
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  font-weight: bold;
  text-align: center;
}

.messages {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message-input {
  display: flex;
  padding: 15px;
  border-top: 1px solid #e0e0e0;
}

.message-input input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
}

.message-input button {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>