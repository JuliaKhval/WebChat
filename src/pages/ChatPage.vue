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
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'

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
      try {
        const token = localStorage.getItem("token")

        connection.value = new HubConnectionBuilder()
            .withUrl("https://messengertester.somee.com/chatHub", {
              accessTokenFactory: () => token
            })
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect()
            .build()

        // Обработчики SignalR
        connection.value.on("ReceiveMessage", (message) => {
          addMessageToChat(message.chatId, message)
          scrollToBottom()
        })

        connection.value.on("MessageEdited", (chatId, messageId, newContent) => {
          updateMessageContent(chatId, messageId, newContent)
        })

        connection.value.on("MessageDeleted", (chatId, messageId) => {
          removeMessage(chatId, messageId)
        })

        await connection.value.start()
        console.log("SignalR подключен")
      } catch (err) {
        console.error("Ошибка подключения SignalR:", err)
        setTimeout(initSignalR, 5000) // Переподключение через 5 секунд
      }
    }

    const addMessageToChat = (chatId, message) => {
      if (!messages.value[chatId]) {
        messages.value[chatId] = []
      }
      if (!messages.value[chatId].some(m => m.id === message.id)) {
        messages.value[chatId].push(message)
      }
    }

    const updateMessageContent = (chatId, messageId, newContent) => {
      if (messages.value[chatId]) {
        const message = messages.value[chatId].find(m => m.id === messageId)
        if (message) {
          message.content = newContent
        }
      }
    }

    const removeMessage = (chatId, messageId) => {
      if (messages.value[chatId]) {
        messages.value[chatId] = messages.value[chatId].filter(m => m.id !== messageId)
      }
    }

    const loadChats = async () => {
      try {
        const response = await api.getUserChats(authStore.currentUser.id)
        userChats.value = response.data
        await initSignalR()

        if (userChats.value.length > 0) {
          await openChat(userChats.value[0])
        }
      } catch (error) {
        console.error('Ошибка загрузки чатов:', error)
      }
    }

    const openChat = async (chat) => {
      currentChat.value = chat
      if (!messages.value[chat.id]) {
        await loadMessages(chat.id)
      }

      if (connection.value) {
        try {
          await connection.value.invoke("JoinChat", chat.id.toString())
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
      if (!messageContent.value.trim() || !currentChat.value || !connection.value) return

      try {
        await connection.value.invoke("SendMessage", {
          ChatId: currentChat.value.id,
          SenderId: authStore.currentUser.id,
          Content: messageContent.value
        })
        messageContent.value = ''
      } catch (error) {
        console.error('Ошибка отправки сообщения:', error)
        // Fallback to API if SignalR fails
        try {
          await api.sendMessage(
              currentChat.value.id,
              authStore.currentUser.id,
              messageContent.value
          )
          messageContent.value = ''
        } catch (apiError) {
          console.error('Ошибка API при отправке:', apiError)
        }
      }
    }

    const handleMessageEdited = async ({ messageId, newText }) => {
      if (!currentChat.value || !connection.value) return

      try {
        await connection.value.invoke("EditMessage", {
          ChatId: currentChat.value.id,
          MessageId: messageId,
          NewContent: newText
        })
      } catch (error) {
        console.error('Ошибка редактирования:', error)
        // Fallback to API
        try {
          await api.editMessage(currentChat.value.id, messageId, newText)
        } catch (apiError) {
          console.error('Ошибка API при редактировании:', apiError)
        }
      }
    }

    const handleMessageDeleted = async (messageId) => {
      if (!currentChat.value || !connection.value) return

      try {
        await connection.value.invoke("DeleteMessage", {
          ChatId: currentChat.value.id,
          MessageId: messageId
        })
      } catch (error) {
        console.error('Ошибка удаления:', error)
        // Fallback to API
        try {
          await api.deleteMessage(currentChat.value.id, messageId)
        } catch (apiError) {
          console.error('Ошибка API при удалении:', apiError)
        }
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