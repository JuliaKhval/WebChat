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
  </div>
</template>
<script>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import Message from '../components/ChatMessage.vue'
import UserList from '../components/UserList.vue'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'

export default {
  components: { Message, UserList },
  setup() {
    const authStore = useAuthStore()
    const userChats = ref([])
    const currentChat = ref(null)
    const messageContent = ref('')
    const messages = ref({})
    const messagesContainer = ref(null)
    const connection = ref(null)

    const loadChats = async () => {
      try {
        const response = await api.getUserChats(authStore.currentUser.id)
        userChats.value = response.data
      } catch (error) {
        console.error('Ошибка загрузки чатов:', error)
      }
    }

    const openChat = async (chat) => {
      currentChat.value = chat
      if (!messages.value[chat.id]) {
        await loadMessages(chat.id)
      }
    }

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

    const scrollToBottom = () => {
      messagesContainer.value?.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: "smooth"
      })
    }

    const sendMessage = async () => {
      if (!messageContent.value.trim() || !currentChat.value) return

      try {
        await connection.value.invoke("SendMessage", {
          chatId: currentChat.value.id,
          senderId: authStore.currentUser.id,
          content: messageContent.value
        })

        messageContent.value = ''
      } catch (error) {
        console.error('Ошибка отправки сообщения:', error)
      }
    }

    const editMessage = async (chatId, messageId, newText) => {
      try {
        await api.editMessage(chatId, messageId, { content: newText })
        // Можно также отправить через SignalR для мгновенного обновления у всех участников
        await connection.value.invoke("EditMessage", {
          chatId,
          messageId,
          newText
        })
      } catch (error) {
        console.error('Ошибка редактирования сообщения:', error)
      }
    }

    const deleteMessage = async (chatId, messageId) => {
      try {
        await api.deleteMessage(chatId, messageId)
        // Можно также отправить через SignalR для мгновенного обновления у всех участников
        await connection.value.invoke("DeleteMessage", {
          chatId,
          messageId
        })
      } catch (error) {
        console.error('Ошибка удаления сообщения:', error)
      }
    }

    const currentMessages = computed(() => {
      return currentChat.value
          ? messages.value[currentChat.value.id] || []
          : []
    })

    const initializeSignalR = async () => {
      try {
        connection.value = new HubConnectionBuilder()
            .withUrl("https://messengertester.somee.com/chatHub") // Убедитесь, что этот URL соответствует вашему бэкенду
            .configureLogging(LogLevel.Information)
            .build()

        connection.value.on("ReceiveMessage", (message) => {
          const chatId = message.chatId
          if (!messages.value[chatId]) {
            messages.value[chatId] = []
          }

          // Проверяем, нет ли уже такого сообщения
          if (!messages.value[chatId].some(m => m.id === message.id)) {
            messages.value[chatId].push(message)
            nextTick(() => {
              if (currentChat.value?.id === chatId) {
                scrollToBottom()
              }
            })
          }
        })

        connection.value.on("MessageEdited", ({ chatId, messageId, newText }) => {
          if (messages.value[chatId]) {
            const messageIndex = messages.value[chatId].findIndex(m => m.id === messageId)
            if (messageIndex !== -1) {
              messages.value[chatId][messageIndex].content = newText
            }
          }
        })

        connection.value.on("MessageDeleted", ({ chatId, messageId }) => {
          if (messages.value[chatId]) {
            messages.value[chatId] = messages.value[chatId].filter(m => m.id !== messageId)
          }
        })

        await connection.value.start()
        console.log("SignalR подключен")

        // После подключения, подписываемся на чаты пользователя
        await connection.value.invoke("SubscribeToUserChats", authStore.currentUser.id)
      } catch (err) {
        console.error("Ошибка подключения SignalR:", err)
      }
    }

    onMounted(async () => {
      await loadChats()
      await initializeSignalR()
    })

    onUnmounted(async () => {
      if (connection.value) {
        await connection.value.stop()
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