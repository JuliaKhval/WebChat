<template>
  <div class="chat-app">
    <div class="chat-list">
      <h3>Ваши чаты</h3>
      <ul>
        <li
            v-for="chat in userChats"
            :key="chat.id"
            :class="{ active: currentChatId === chat.id }"
            @click="selectChat(chat.id)"
        >
          Чат с {{ chat.receiverUsername }}
        </li>
      </ul>
    </div>

    <div class="chat-window">
      <div v-if="currentChatId" class="active-chat">
        <div class="chat-header">
          Чат ID: {{ currentChatId }}
        </div>

        <div class="messages" ref="messagesContainer">
          <div
              v-for="message in messages"
              :key="message.id"
              :class="['message', { 'own-message': message.senderId === currentUserId }]"
              @contextmenu.prevent="showContextMenu($event, message)"
          >
            <div class="message-header">
              <strong>{{ message.senderUsername }}</strong>
              <span>{{ formatDate(message.createdDataTime) }}</span>
            </div>
            <div class="message-content">
              {{ message.content }}
            </div>
          </div>
        </div>

        <div class="message-input">
          <input
              v-model="messageContent"
              placeholder="Введите сообщение..."
              @keyup.enter="sendMessage"
          >
          <button @click="sendMessage">
            Отправить
          </button>
        </div>
      </div>

      <div v-else class="no-chat">
        <p>Выберите чат для начала общения</p>
      </div>
    </div>

    <!-- Контекстное меню -->
    <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
        @click.stop
    >
      <button @click="editSelectedMessage">Изменить</button>
      <button @click="deleteSelectedMessage">Удалить</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import api from '../api'
import * as signalR from '@microsoft/signalr'

export default {
  setup() {
    const currentUserId = ref(null)
    const currentChatId = ref(null)
    const userChats = ref([])
    const messages = ref([])
    const messageContent = ref('')
    const connection = ref(null)
    const messagesContainer = ref(null)

    const contextMenu = ref({
      visible: false,
      x: 0,
      y: 0,
      message: null
    })

    // Форматирование даты
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      })
    }

    // Инициализация SignalR
    const initSignalR = async () => {
      const token = sessionStorage.getItem('token')

      connection.value = new signalR.HubConnectionBuilder()
          .withUrl("https://messengertester.somee.com/chatHub", {
            accessTokenFactory: () => token
          })
          .withAutomaticReconnect()
          .build()

      // Обработчики SignalR
      connection.value.on("ReceiveMessage", (chatId, userId, content) => {
        if (chatId === currentChatId.value) {
          messages.value.push({
            id: Date.now(), // временный ID, бэкенд должен присвоить реальный
            chatId,
            senderId: userId,
            content,
            createdDataTime: new Date().toISOString()
          })
          scrollToBottom()
        }
      })

      connection.value.on("MessageEdited", (chatId, messageId, newText) => {
        if (chatId === currentChatId.value) {
          const message = messages.value.find(m => m.id === messageId)
          if (message) {
            message.content = newText
          }
        }
      })

      connection.value.on("MessageDeleted", (chatId, messageId) => {
        if (chatId === currentChatId.value) {
          messages.value = messages.value.filter(m => m.id !== messageId)
        }
      })

      try {
        await connection.value.start()
        console.log("SignalR подключён")
      } catch (err) {
        console.error("Ошибка подключения SignalR:", err)
        setTimeout(initSignalR, 5000)
      }
    }

    // Загрузка чатов пользователя
    const loadChats = async () => {
      try {
        const response = await api.getUserChats(currentUserId.value)
        userChats.value = response.data

        if (userChats.value.length > 0) {
          selectChat(userChats.value[0].id)
        }
      } catch (error) {
        console.error('Ошибка загрузки чатов:', error)
      }
    }

    // Выбор чата
    const selectChat = async (chatId) => {
      currentChatId.value = chatId
      await loadMessages(chatId)

      if (connection.value) {
        try {
          await connection.value.invoke("JoinChat", chatId.toString(), currentUserId.value.toString())
        } catch (err) {
          console.error("Ошибка входа в чат:", err)
        }
      }
    }

    // Загрузка сообщений
    const loadMessages = async (chatId) => {
      try {
        const response = await api.getChatMessages(chatId)
        messages.value = response.data
        scrollToBottom()
      } catch (error) {
        console.error('Ошибка загрузки сообщений:', error)
      }
    }

    // Отправка сообщения
    const sendMessage = async () => {
      if (!messageContent.value.trim() || !currentChatId.value) return

      try {
        // Отправка через SignalR
        if (connection.value) {
          await connection.value.invoke("SendMessage", currentChatId.value, currentUserId.value, messageContent.value)
        } else {
          // Fallback через API
          await api.sendMessage(currentChatId.value, currentUserId.value, messageContent.value)
        }

        messageContent.value = ''
      } catch (error) {
        console.error('Ошибка отправки сообщения:', error)
      }
    }

    // Контекстное меню
    const showContextMenu = (event, message) => {
      if (message.senderId !== currentUserId.value) return

      contextMenu.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        message
      }
    }

    const hideContextMenu = () => {
      contextMenu.value.visible = false
    }

    const editSelectedMessage = async () => {
      const newText = prompt('Изменить сообщение:', contextMenu.value.message.content)
      if (newText && newText.trim() && newText !== contextMenu.value.message.content) {
        try {
          await api.editMessage(
              currentChatId.value,
              contextMenu.value.message.id,
              newText
          )
        } catch (error) {
          console.error('Ошибка редактирования:', error)
        }
      }
      hideContextMenu()
    }

    const deleteSelectedMessage = async () => {
      if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
        try {
          await api.deleteMessage(
              currentChatId.value,
              contextMenu.value.message.id
          )
        } catch (error) {
          console.error('Ошибка удаления:', error)
        }
      }
      hideContextMenu()
    }

    // Прокрутка вниз
    const scrollToBottom = () => {
      setTimeout(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      }, 100)
    }

    // Закрытие контекстного меню при клике вне его
    const handleClickOutside = (event) => {
      if (!event.target.closest('.context-menu')) {
        hideContextMenu()
      }
    }

    // Инициализация
    onMounted(async () => {
      const authData = sessionStorage.getItem('auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        currentUserId.value = parsed.id
        await initSignalR()
        await loadChats()
      }

      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      if (connection.value) {
        connection.value.stop()
      }
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      currentUserId,
      currentChatId,
      userChats,
      messages,
      messageContent,
      messagesContainer,
      contextMenu,
      formatDate,
      selectChat,
      sendMessage,
      showContextMenu,
      editSelectedMessage,
      deleteSelectedMessage
    }
  }
}
</script>

<style scoped>
.chat-app {
  display: flex;
  height: 100vh;
}

.chat-list {
  width: 250px;
  border-right: 1px solid #ddd;
  padding: 10px;
  overflow-y: auto;
}

.chat-list ul {
  list-style: none;
  padding: 0;
}

.chat-list li {
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
}

.chat-list li:hover {
  background-color: #f0f0f0;
}

.chat-list li.active {
  background-color: #e3f2fd;
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
}

.messages {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message {
  margin: 5px 0;
  padding: 10px;
  border-radius: 5px;
  background: #f1f1f1;
  max-width: 70%;
  align-self: flex-start;
}

.message.own-message {
  align-self: flex-end;
  background: #e3f2fd;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.8em;
  color: #666;
}

.message-content {
  word-wrap: break-word;
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
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  z-index: 1000;
}

.context-menu button {
  display: block;
  width: 100%;
  padding: 8px 16px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
}

.context-menu button:hover {
  background-color: #f5f5f5;
}
</style>