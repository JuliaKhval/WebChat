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
              :connection="connection"
              @message-edited="handleMessageEdited"
              @message-deleted="handleMessageDeleted"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import Message from '../components/ChatMessage.vue'
import UserList from '../components/UserList.vue'
import { HubConnectionBuilder } from '@microsoft/signalr'

export default {
  components: { Message, UserList },
  setup() {
    const authStore = useAuthStore()
    const userChats = ref([])
    const currentChat = ref(null)
    const messageContent = ref('')
    const messages = ref({})
    const connection = ref(null)
    const messagesContainer = ref(null)

    const initSignalR = async () => {
      const token = localStorage.getItem('token')

      connection.value = new HubConnectionBuilder()
          .withUrl("https://messengertester.somee.com/chatHub", {
            accessTokenFactory: () => token
          })
          .withAutomaticReconnect()
          .build()

      connection.value.on("ReceiveMessage", (chatId, userId, content) => {
        if (messages.value[chatId] && chatId === currentChat.value?.id) {
          messages.value[chatId].push({
            id: Date.now(),
            chatId,
            senderId: userId,
            content,
            createdDataTime: new Date().toISOString()
          })
          scrollToBottom()
        }
      })

      connection.value.on("MessageEdited", (chatId, messageId, newText) => {
        if (messages.value[chatId] && chatId === currentChat.value?.id) {
          const messageIndex = messages.value[chatId].findIndex(m => m.id === messageId)
          if (messageIndex !== -1) {
            messages.value[chatId][messageIndex].content = newText
          }
        }
      })

      connection.value.on("MessageDeleted", (chatId, messageId) => {
        if (messages.value[chatId] && chatId === currentChat.value?.id) {
          messages.value[chatId] = messages.value[chatId].filter(m => m.id !== messageId)
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

    const loadChats = async () => {
      try {
        const token = sessionStorage.getItem('token')
        if (!token) throw new Error('Токен не найден')

        const response = await api.getUserChats(authStore.currentUser.id)
        userChats.value = response.data

        if (userChats.value.length > 0) {
          await openChat(userChats.value[0])
        }
      } catch (error) {
        console.error('Ошибка загрузки чатов:', error)
        if (error.response?.status === 401) {
          // Токен недействителен
          await authStore.logout()
          router.push('/login')
        }
      }
    }

    const openChat = async (chat) => {
      currentChat.value = chat
      if (!messages.value[chat.id]) {
        await loadMessages(chat.id)
      }

      if (connection.value) {
        try {
          await connection.value.invoke("JoinChat", chat.id.toString(), authStore.currentUser.id.toString())
        } catch (err) {
          console.error("Ошибка входа в чат:", err)
        }
      }
    }

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

    const sendMessage = async () => {
      if (!messageContent.value.trim() || !currentChat.value) return

      try {
        if (connection.value) {
          await connection.value.invoke("SendMessage",
              currentChat.value.id,
              authStore.currentUser.id,
              messageContent.value
          )
        } else {
          await api.sendMessage(
              currentChat.value.id,
              authStore.currentUser.id,
              messageContent.value
          )
        }
        messageContent.value = ''
      } catch (error) {
        console.error('Ошибка отправки сообщения:', error)
      }
    }

    const handleMessageEdited = async ({ messageId, newText }) => {
      if (!currentChat.value) return

      try {
        if (connection.value) {
          await connection.value.invoke("EditMessage",
              currentChat.value.id,
              messageId,
              newText
          )
        } else {
          await api.editMessage(currentChat.value.id, messageId, newText)
        }
      } catch (error) {
        console.error('Ошибка редактирования:', error)
      }
    }

    const handleMessageDeleted = async (messageId) => {
      if (!currentChat.value) return

      try {
        if (connection.value) {
          await connection.value.invoke("DeleteMessage",
              currentChat.value.id,
              messageId
          )
        } else {
          await api.deleteMessage(currentChat.value.id, messageId)
        }
      } catch (error) {
        console.error('Ошибка удаления:', error)
      }
    }

    const scrollToBottom = () => {
      setTimeout(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      }, 100)
    }

    const currentMessages = computed(() => {
      return currentChat.value ? messages.value[currentChat.value.id] || [] : []
    })

    onMounted(() => {
      initSignalR()
      loadChats()
    })

    onUnmounted(() => {
      if (connection.value) {
        connection.value.stop()
      }
    })

    watch(currentMessages, scrollToBottom, { deep: true })

    return {
      authStore,
      userChats,
      currentChat,
      messageContent,
      currentMessages,
      messagesContainer,
      connection,
      openChat,
      sendMessage,
      handleMessageEdited,
      handleMessageDeleted
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