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
        <div class="messages" ref="messagesContainer">
          <Message
              v-for="message in currentMessages"
              :key="message.id"
              :message="message"
              :current-user-id="authStore.currentUser.id"
              @edit-message="handleEditMessage(message)"
              @delete-message="handleDeleteMessage(message)"
          />
        </div>
        <div class="message-input">
          <input
              v-model="messageContent"
              placeholder="Введите сообщение..."
              @keyup.enter="sendMessage"
              ref="messageInput"
          >
          <button @click="sendMessage">Отправить</button>
        </div>
      </div>
      <div v-else class="no-chat">
        <p>Выберите чат для начала общения</p>
      </div>
    </div>

    <!-- Контекстное меню -->
    <div
        v-if="contextMenu.show"
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
    >
      <div @click="contextMenu.editHandler">Изменить</div>
      <div @click="contextMenu.deleteHandler">Удалить</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import Message from '../components/ChatMessage.vue'
import UserList from '../components/UserList.vue'
import * as signalR from '@microsoft/signalr'

const authStore = useAuthStore()
const userChats = ref([])
const currentChat = ref(null)
const messageContent = ref('')
const messages = ref({})
const messagesContainer = ref(null)
const messageInput = ref(null)

// SignalR Connection
const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://messengertester.somee.com/chatHub", {
      accessTokenFactory: () => {
        const authData = sessionStorage.getItem('auth')
        return authData ? JSON.parse(authData).token : null
      }
    })
    .build()

// Контекстное меню
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  editHandler: null,
  deleteHandler: null
})

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
  if (!messages.value[chat.id]) {
    await loadMessages(chat.id)
  }

  // Присоединяемся к чату через SignalR
  try {
    await connection.invoke("JoinChat", chat.id.toString(), authStore.currentUser.id.toString())
  } catch (err) {
    console.error("Не удалось присоединиться к группе чата:", err)
  }
}

// Загрузка сообщений
const loadMessages = async (chatId) => {
  try {
    const response = await api.getChatMessages(chatId)
    messages.value = {
      ...messages.value,
      [chatId]: response.data
    }
  } catch (error) {
    console.error('Ошибка загрузки сообщений:', error)
  }
}

// Текущие сообщения
const currentMessages = computed(() => {
  return currentChat.value
      ? messages.value[currentChat.value.id] || []
      : []
})

// Отправка сообщения через SignalR
const sendMessage = async () => {
  if (!messageContent.value.trim() || !currentChat.value) return

  try {
    await connection.invoke(
        "SendMessage",
        currentChat.value.id,
        authStore.currentUser.id,
        messageContent.value
    )
    messageContent.value = ''
    focusInput()
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error)
  }
}

// Фокус на поле ввода
const focusInput = () => {
  nextTick(() => {
    messageInput.value.focus()
  })
}

// Обработчики контекстного меню
const handleEditMessage = (message) => {
  const newText = prompt('Редактировать сообщение', message.content)
  if (newText && newText.trim()) {
    connection.invoke('EditMessage', message.chatId, message.id, newText)
  }
}

const handleDeleteMessage = (message) => {
  if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
    connection.invoke('DeleteMessage', message.chatId, message.id)
  }
}

// Показ контекстного меню
const showMessageContextMenu = (event, message) => {
  event.preventDefault()
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    editHandler: () => handleEditMessage(message),
    deleteHandler: () => handleDeleteMessage(message)
  }
}

// Скрываем меню при клике вне области
document.addEventListener('click', () => {
  contextMenu.value.show = false
})

// Обновление списка сообщений из SignalR
const setupSignalREvents = () => {
  connection.on("ReceiveMessage", (chatId, userId, content) => {
    if (chatId === currentChat.value?.id) {
      const newMessage = {
        id: Math.random().toString(36).substr(2, 9), // фейковый ID
        chatId,
        userId,
        content,
        createdDataTime: new Date().toISOString()
      }
      messages.value[chatId] = [...(messages.value[chatId] || []), newMessage]
      scrollToBottom()
    }
  })

  connection.on("MessageEdited", (chatId, messageId, newText) => {
    if (chatId === currentChat.value?.id) {
      const msgIndex = messages.value[chatId].findIndex(m => m.id === messageId)
      if (msgIndex > -1) {
        messages.value[chatId][msgIndex].content = newText
      }
    }
  })

  connection.on("MessageDeleted", (chatId, messageId) => {
    if (chatId === currentChat.value?.id) {
      messages.value[chatId] = messages.value[chatId].filter(m => m.id !== messageId)
    }
  })
}

// Прокрутка вниз
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Инициализация SignalR
onMounted(async () => {
  await loadChats()
  try {
    await connection.start()
    setupSignalREvents()
  } catch (err) {
    console.error('Ошибка подключения SignalR:', err)
  }
})
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

.context-menu {
  position: fixed;
  top: 0;
  left: 0;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 9999;
  padding: 5px 0;
}
.context-menu div {
  padding: 6px 12px;
  cursor: pointer;
}
.context-menu div:hover {
  background-color: #f0f0f0;
}
</style>