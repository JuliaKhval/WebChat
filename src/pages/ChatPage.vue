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
          <button @click="reloadMessages" class="reload-btn">⟳</button>
        </div>

        <div class="messages" ref="messagesContainer">
          <Message
              v-for="message in currentMessages"
              :key="message.id"
              :message="message"
              :current-user-id="authStore.currentUser.id"
              @contextmenu.prevent="handleContextMenu($event, message)"
          />
        </div>

        <div class="message-input">
          <input
              v-model="messageContent"
              placeholder="Введите сообщение..."
              @keyup.enter="sendMessage"
              ref="messageInput"
          >
          <button @click="sendMessage" :disabled="!messageContent.trim()">
            Отправить
          </button>
        </div>
      </div>

      <div v-else class="no-chat">
        <p>Выберите чат для начала общения</p>
      </div>
    </div>

    <ContextMenu
        v-if="contextMenu.visible"
        :x="contextMenu.x"
        :y="contextMenu.y"
        :is-own-message="contextMenu.isOwnMessage"
        @edit="editSelectedMessage"
        @delete="deleteSelectedMessage"
        @close="closeContextMenu"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import Message from '../components/ChatMessage.vue'
import UserList from '../components/UserList.vue'
import ContextMenu from '../components/ContextMenu.vue'

export default {
  components: { Message, UserList, ContextMenu },
  setup() {
    const authStore = useAuthStore()
    const userChats = ref([])
    const currentChat = ref(null)
    const messageContent = ref('')
    const messages = ref({})
    const messagesContainer = ref(null)
    const messageInput = ref(null)
    const loadingMessages = ref(false)
    let socket = null

    // Контекстное меню
    const contextMenu = ref({
      visible: false,
      x: 0,
      y: 0,
      message: null,
      isOwnMessage: false
    })

    // Подключение к WebSocket
    const connectWebSocket = () => {
      if (socket) socket.close()

      socket = new WebSocket(`ws://messenger.somee.com/ws?token=${authStore.token}`)

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.chatId && messages.value[data.chatId]) {
          messages.value = {
            ...messages.value,
            [data.chatId]: [...messages.value[data.chatId], data]
          }
          scrollToBottom()
        }
      }

      socket.onclose = () => {
        setTimeout(connectWebSocket, 5000)
      }
    }

    // Автоскролл
    const scrollToBottom = async () => {
      await nextTick()
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }

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
      currentChat.value = chat
      messageInput.value?.focus()
      if (!messages.value[chat.id]) {
        await loadMessages(chat.id)
      }
      scrollToBottom()
    }

    // Загрузка сообщений
    const loadMessages = async (chatId) => {
      loadingMessages.value = true
      try {
        const response = await api.getChatMessages(chatId)
        messages.value = {
          ...messages.value,
          [chatId]: response.data
        }
        scrollToBottom()
      } catch (error) {
        console.error('Ошибка загрузки сообщений:', error)
      } finally {
        loadingMessages.value = false
      }
    }

    // Перезагрузка сообщений
    const reloadMessages = async () => {
      if (currentChat.value) {
        await loadMessages(currentChat.value.id)
      }
    }

    // Отправка сообщения
    const sendMessage = async () => {
      if (!messageContent.value.trim() || !currentChat.value) return

      try {
        const newMessage = await api.sendMessage(
            currentChat.value.id,
            authStore.currentUser.id,
            messageContent.value
        )

        // Локальное обновление
        messages.value = {
          ...messages.value,
          [currentChat.value.id]: [
            ...(messages.value[currentChat.value.id] || []),
            {
              ...newMessage,
              sender: authStore.currentUser.username
            }
          ]
        }

        messageContent.value = ''
        scrollToBottom()
        messageInput.value?.focus()
      } catch (error) {
        console.error('Ошибка отправки сообщения:', error)
      }
    }

    // Контекстное меню
    const handleContextMenu = (event, message) => {
      contextMenu.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        message,
        isOwnMessage: message.sender === authStore.currentUser.id
      }
    }

    const closeContextMenu = () => {
      contextMenu.value.visible = false
    }

    // Редактирование сообщения
    const editSelectedMessage = async () => {
      if (!contextMenu.value.message) return

      const newText = prompt('Редактировать сообщение:', contextMenu.value.message.content)
      if (newText && newText !== contextMenu.value.message.content) {
        try {
          await api.editMessage(
              currentChat.value.id,
              contextMenu.value.message.id,
              newText
          )

          // Локальное обновление
          messages.value = {
            ...messages.value,
            [currentChat.value.id]: messages.value[currentChat.value.id].map(m =>
                m.id === contextMenu.value.message.id
                    ? { ...m, content: newText }
                    : m
            )
          }
        } catch (error) {
          console.error('Ошибка редактирования:', error)
        }
      }
      closeContextMenu()
    }

    // Удаление сообщения
    const deleteSelectedMessage = async () => {
      if (!contextMenu.value.message ||
          !confirm('Вы уверены, что хотите удалить это сообщение?')) {
        return
      }

      try {
        await api.deleteMessage(
            currentChat.value.id,
            contextMenu.value.message.id
        )

        // Локальное удаление
        messages.value = {
          ...messages.value,
          [currentChat.value.id]: messages.value[currentChat.value.id].filter(
              m => m.id !== contextMenu.value.message.id
          )
        }
      } catch (error) {
        console.error('Ошибка удаления:', error)
      }
      closeContextMenu()
    }

    const currentMessages = computed(() => {
      return currentChat.value
          ? messages.value[currentChat.value.id] || []
          : []
    })

    onMounted(() => {
      loadChats()
      connectWebSocket()
    })

    return {
      authStore,
      userChats,
      currentChat,
      messageContent,
      currentMessages,
      loadingMessages,
      contextMenu,
      messagesContainer,
      messageInput,
      openChat,
      sendMessage,
      reloadMessages,
      handleContextMenu,
      editSelectedMessage,
      deleteSelectedMessage,
      closeContextMenu
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


.reload-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  margin-left: 10px;
}

.reload-btn:hover {
  color: #4CAF50;
}

.loading {
  text-align: center;
  padding: 10px;
  color: #666;
}
</style>