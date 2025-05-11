<template>
  <div class="chat-app">
    <!-- Список чатов -->
    <UserList
        :chats="userChats"
        :selected-chat="currentChat"
        @select-chat="openChat"
    />

    <!-- Окно чата -->
    <div class="chat-window">
      <div v-if="currentChat" class="active-chat">
        <div class="chat-header">
          Чат с {{ currentChat.receiverUsername }}
        </div>

        <!-- Контейнер сообщений -->
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

        <!-- Ввод нового сообщения -->
        <div class="message-input">
          <input
              v-model="messageContent"
              placeholder="Введите сообщение..."
              @keyup.enter="sendMessage"
          >
          <button @click="sendMessage">Отправить</button>
        </div>
      </div>

      <!-- Если нет выбранного чата -->
      <div v-else class="no-chat">
        <p>Выберите чат для начала общения</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import Message from '../components/ChatMessage.vue'
import UserList from '../components/UserList.vue'
import { sendMessageToHub, onNewMessage } from '../api/signalr'

export default {
  components: { Message, UserList },
  setup() {
    const authStore = useAuthStore()
    const userChats = ref([])
    const currentChat = ref(null)
    const messageContent = ref('')
    const messages = ref({})
    const messagesContainer = ref(null)

    // --- Загрузка списка чатов ---
    const loadChats = async () => {
      try {
        const response = await api.getUserChats(authStore.currentUser.id)
        userChats.value = response.data
      } catch (error) {
        console.error('Ошибка загрузки чатов:', error)
      }
    }

    // --- Открытие чата и загрузка сообщений ---
    const openChat = async (chat) => {
      currentChat.value = chat
      if (!messages.value[chat.id]) {
        await loadMessages(chat.id)
      }
    }

    // --- Загрузка сообщений из API ---
    const loadMessages = async (chatId) => {
      try {
        const response = await api.getChatMessages(chatId)
        messages.value = {
          ...messages.value,
          [chatId]: response.data
        }

        nextTick(() => {
          scrollToBottom()
        })
      } catch (error) {
        console.error('Ошибка загрузки сообщений:', error)
      }
    }

    // --- Отправка сообщения через SignalR ---
    const sendMessage = () => {
      const chatId = currentChat.value?.id
      const userId = authStore.currentUser.id
      const content = messageContent.value.trim()

      if (!content || !chatId) return

      // Отправляем через SignalR
      sendMessageToHub(chatId, userId, content)

      // Локально добавляем сразу
      const localMessage = {
        id: Date.now(),
        chatId,
        sender: authStore.currentUser.username,
        content,
        createdDataTime: new Date().toISOString()
      }

      messages.value[chatId] = [...(messages.value[chatId] || []), localMessage]
      messageContent.value = ''

      nextTick(scrollToBottom)
    }

    // --- Прокрутка вниз ---
    const scrollToBottom = () => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }

    // --- Редактирование и удаление ---
    const editMessage = async (chatId, messageId, newText) => {
      try {
        await api.editMessage(chatId, messageId, { content: newText })
        await loadMessages(chatId)
      } catch (error) {
        console.error('Ошибка редактирования:', error)
      }
    }

    const deleteMessage = async (chatId, messageId) => {
      try {
        await api.deleteMessage(chatId, messageId)
        await loadMessages(chatId)
      } catch (error) {
        console.error('Ошибка удаления:', error)
      }
    }

    // --- Текущие сообщения для отображения ---
    const currentMessages = computed(() => {
      return currentChat.value
          ? messages.value[currentChat.value.id] || []
          : []
    })

    // --- Подписываемся на новые сообщения ---
    onMounted(() => {
      loadChats()

      onNewMessage((newMessage) => {
        const chatId = newMessage.chatId

        // Если это наш чат — добавляем сообщение
        if (currentChat.value?.id === chatId) {
          messages.value = {
            ...messages.value,
            [chatId]: [...(messages.value[chatId] || []), newMessage]
          }

          nextTick(scrollToBottom)
        }
      })
    })

    return {
      authStore,
      userChats,
      currentChat,
      messageContent,
      currentMessages,
      messagesContainer,
      openChat,
      sendMessage,
      editMessage,
      deleteMessage
    }
  }
}
</script>

<style scoped>
.chat-app {
  display: flex;
  height: calc(100vh - 60px);
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