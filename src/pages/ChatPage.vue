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
          Chat with {{ currentChat.receiverUsername }}
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
              placeholder="Type a message..."
              @keyup.enter="sendMessage"
          >
          <button @click="sendMessage">
            Send
          </button>
        </div>
      </div>

      <div v-else class="no-chat">
        <p>Select a chat to start messaging</p>
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
import * as signalR from '@microsoft/signalr'

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

    // Initialize SignalR connection
    const initSignalR = async () => {
      const token = localStorage.getItem("token")

      connection.value = new signalR.HubConnectionBuilder()
          .withUrl("https://messengertester.somee.com/chatHub", {
            accessTokenFactory: () => token
          })
          .withAutomaticReconnect()
          .build()

      // Setup SignalR handlers
      connection.value.on("ReceiveMessage", (chatId, message) => {
        if (messages.value[chatId]) {
          messages.value[chatId].push(message)
          scrollToBottom()
        }
      })

      connection.value.on("MessageEdited", (chatId, messageId, newText) => {
        if (messages.value[chatId]) {
          const messageIndex = messages.value[chatId].findIndex(m => m.id === messageId)
          if (messageIndex !== -1) {
            messages.value[chatId][messageIndex].content = newText
          }
        }
      })

      connection.value.on("MessageDeleted", (chatId, messageId) => {
        if (messages.value[chatId]) {
          messages.value[chatId] = messages.value[chatId].filter(m => m.id !== messageId)
        }
      })

      try {
        await connection.value.start()
        console.log("SignalR Connected")
      } catch (err) {
        console.error("SignalR Connection Error:", err)
      }
    }

    const loadChats = async () => {
      try {
        const response = await api.getUserChats(authStore.currentUser.id)
        userChats.value = response.data

        // Connect to SignalR after loading chats
        await initSignalR()

        if (userChats.value.length > 0) {
          await openChat(userChats.value[0])
        }
      } catch (error) {
        console.error('Error loading chats:', error)
      }
    }

    const openChat = async (chat) => {
      currentChat.value = chat
      if (!messages.value[chat.id]) {
        await loadMessages(chat.id)
      }

      // Join the SignalR group for this chat
      if (connection.value) {
        try {
          await connection.value.invoke("JoinChat", chat.id.toString(), authStore.currentUser.id.toString())
        } catch (err) {
          console.error("Error joining chat:", err)
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
        console.error('Error loading messages:', error)
      }
    }

    const sendMessage = async () => {
      if (!messageContent.value.trim() || !currentChat.value) return

      try {
        // Send via SignalR
        if (connection.value) {
          await connection.value.invoke(
              "SendMessage",
              currentChat.value.id,
              authStore.currentUser.id,
              messageContent.value
          )
          messageContent.value = ''
          scrollToBottom()
        } else {
          console.error("SignalR connection not established")
        }
      } catch (error) {
        console.error('Error sending message:', error)
      }
    }

    const handleMessageEdited = ({ chatId, messageId, newText }) => {
      if (messages.value[chatId]) {
        const messageIndex = messages.value[chatId].findIndex(m => m.id === messageId)
        if (messageIndex !== -1) {
          messages.value[chatId][messageIndex].content = newText
        }
      }
    }

    const handleMessageDeleted = ({ chatId, messageId }) => {
      if (messages.value[chatId]) {
        messages.value[chatId] = messages.value[chatId].filter(m => m.id !== messageId)
      }
    }

    const scrollToBottom = () => {
      if (messagesContainer.value) {
        // Use nextTick to wait for DOM update
        setTimeout(() => {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }, 0)
      }
    }

    const currentMessages = computed(() => {
      return currentChat.value
          ? messages.value[currentChat.value.id] || []
          : []
    })

    onMounted(() => {
      loadChats()
    })

    onUnmounted(() => {
      if (connection.value) {
        connection.value.stop()
      }
    })

    // Watch for current chat changes to scroll to bottom
    watch(currentMessages, () => {
      scrollToBottom()
    }, { deep: true })

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