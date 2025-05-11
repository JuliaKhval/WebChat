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

        <!-- Сообщения -->
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
              id="messageInput"
              v-model="messageContent"
              placeholder="Введите сообщение..."
              @keyup.enter="sendMessage"
          >
          <button @click="sendMessage">Отправить</button>
        </div>
      </div>

      <!-- Если чат не выбран -->
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

// Подключение SignalR
import * as signalR from '@microsoft/signalr'

export default {
  components: { Message, UserList },
  setup() {
    const authStore = useAuthStore()
    const userChats = ref([])
    const currentChat = ref(null)
    const messageContent = ref('')
    const messages = ref({})
    const messagesContainer = ref(null)

    // --- SignalR подключение ---
    let connection = null

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

      // Присоединяемся к группе чата через SignalR
      if (connection && chat.id) {
        try {
          await connection.invoke('JoinChat', chat.id.toString(), authStore.currentUser.id.toString())
        } catch (err) {
          console.error('Ошибка при присоединении к чату:', err)
        }
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

        nextTick(scrollToBottom)
      } catch (error) {
        console.error('Ошибка загрузки сообщений:', error)
      }
    }

    // --- Отправка сообщения через API + SignalR ---
    const sendMessage = async () => {
      const chatId = currentChat.value?.id
      const userId = authStore.currentUser.id
      const content = messageContent.value.trim()

      if (!content || !chatId) {
        alert("Выберите чат и введите текст")
        return
      }

      try {
        // 1️⃣ Отправляем на сервер через API
        const res = await api.sendMessage(chatId, userId, content)

        if (res.status === 200) {
          messageContent.value = ''

          // 2️⃣ Получаем новое сообщение от сервера
          const newMessage = res.data // или await api.getChatMessages(chatId) если не возвращает объект
          messages.value[chatId] = [...(messages.value[chatId] || []), newMessage]

          nextTick(scrollToBottom)

          // 3️⃣ Рассылаем всем участникам через SignalR
          connection.invoke('SendMessage', chatId, newMessage)
        }
      } catch (error) {
        console.error('Ошибка отправки сообщения:', error)
        alert("Не удалось отправить сообщение")
      }
    }

    // --- Редактирование сообщения ---
    const editMessage = async (chatId, messageId, newText) => {
      try {
        await api.editMessage(chatId, messageId, { content: newText })
        await loadMessages(chatId)
        connection.invoke('EditMessage', chatId, messageId, newText)
      } catch (error) {
        console.error('Ошибка редактирования:', error)
      }
    }

    // --- Удаление сообщения ---
    const deleteMessage = async (chatId, messageId) => {
      if (!confirm("Удалить сообщение?")) return

      try {
        await api.deleteMessage(chatId, messageId)
        await loadMessages(chatId)
        connection.invoke('DeleteMessage', chatId, messageId)
      } catch (error) {
        console.error('Ошибка удаления:', error)
      }
    }

    // --- Реактивные сообщения текущего чата ---
    const currentMessages = computed(() => {
      return currentChat.value
          ? messages.value[currentChat.value.id] || []
          : []
    })

    // --- Прокрутка вниз ---
    const scrollToBottom = () => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }

    // --- Подписываемся на события SignalR ---
    onMounted(async () => {
      await loadChats()

      // Инициализация SignalR
      connection = new signalR.HubConnectionBuilder()
          .withUrl("https://messengertester.somee.com/chatHub ", {
            accessTokenFactory: () => localStorage.getItem("token")
          })
          .withAutomaticReconnect()
          .build()

      // При получении сообщения
      connection.on("ReceiveMessage", (chatId, message) => {
        if (currentChat.value?.id == chatId) {
          messages.value[chatId] = [...(messages.value[chatId] || []), message]
          nextTick(scrollToBottom)
        }
      })

      // При редактировании
      connection.on("MessageEdited", (chatId, messageId, newText) => {
        const index = messages.value[chatId]?.findIndex(m => m.id === messageId)
        if (index > -1) {
          messages.value[chatId][index].content = newText
        }
      })

      // При удалении
      connection.on("MessageDeleted", (chatId, messageId) => {
        messages.value[chatId] = messages.value[chatId]?.filter(m => m.id !== messageId)
      })

      // Подключаемся к SignalR
      try {
        await connection.start()
        console.log("SignalR подключён")

        if (authStore.currentUser.id) {
          await connection.invoke("JoinGroup", authStore.currentUser.id.toString())
        }
      } catch (err) {
        console.error("Ошибка подключения к SignalR:", err)
      }
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