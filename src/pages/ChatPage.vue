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

        <div class="messages">
          <Message
              v-for="message in currentMessages"
              :key="message.id"
              :message="message"
              :current-user-id="authStore.currentUser.id"
              @show-context-menu="showContextMenu"
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
  <div v-if="contextMenu.show" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
    <div @click="handleEditMessage">Изменить</div>
    <div @click="handleDeleteMessage">Удалить</div>
  </div>
</template>
<script>
import { ref, computed, onMounted } from 'vue'
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
    const messagesContainer = ref(null)

    // Контекстное меню
    const contextMenu = ref({
      show: false,
      x: 0,
      y: 0,
      message: null
    })

    const currentMessages = computed(() => {
      return currentChat.value
          ? messages.value[currentChat.value.id] || []
          : []
    })

    // Подключение к SignalR
    let connection = null;

    const connectSignalR = async () => {
      const token = sessionStorage.getItem("token");

      connection = new signalR.HubConnectionBuilder()
          .withUrl("https://messengertester.somee.com/chatHub", {
            accessTokenFactory: () => token
          })
          .build();

      connection.on("ReceiveMessage", (chatId, userId, message) => {
        if (chatId === currentChat.value?.id) {
          addMessageToDOM(chatId, userId, message)
        }
      });

      connection.on("MessageEdited", (chatId, messageId, newText) => {
        const msgEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (msgEl) {
          msgEl.innerHTML = `[${msgEl.dataset.userId}]: ${newText}`;
        }
      });

      connection.on("MessageDeleted", (chatId, messageId) => {
        const msgEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (msgEl) {
          msgEl.remove();
        }
      });

      try {
        await connection.start()
        console.log("SignalR подключён")
      } catch (err) {
        console.error("Ошибка подключения к SignalR:", err);
      }
    }

    const addMessageToDOM = (chatId, userId, message, messageId = null) => {
      const messagesEl = document.getElementById("messages");
      const wrapper = document.createElement("li");
      wrapper.dataset.messageId = messageId || "";
      wrapper.dataset.userId = userId;
      wrapper.innerText = `[${userId}]: ${message}`;

      messagesEl.appendChild(wrapper);
    }

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

      try {
        await connection.invoke("JoinChat", chat.id.toString(), authStore.currentUser.id.toString())
      } catch (err) {
        console.error("Не удалось присоединиться к группе чата:", err)
      }
    }

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

    const sendMessage = async () => {
      if (!messageContent.value.trim() || !currentChat.value) return

      try {
        await api.sendMessage(
            currentChat.value.id,
            authStore.currentUser.id,
            messageContent.value
        )
        await loadMessages(currentChat.value.id)
        messageContent.value = ''
      } catch (error) {
        console.error('Ошибка отправки сообщения:', error)
      }
    }

    const showContextMenu = (payload) => {
      contextMenu.value = {
        show: true,
        x: payload.x,
        y: payload.y,
        message: payload.message
      }
    }

    const handleEditMessage = () => {
      if (contextMenu.value.message) {
        const newText = prompt('Редактировать сообщение:', contextMenu.value.message.content)
        if (newText && newText.trim()) {
          api.editMessage(contextMenu.value.message.chatId, contextMenu.value.message.id, newText)
              .then(() => loadMessages(contextMenu.value.message.chatId))
              .catch(err => console.error('Ошибка редактирования:', err))
        }
        contextMenu.value.show = false
      }
    }

    const handleDeleteMessage = () => {
      if (contextMenu.value.message && confirm('Вы уверены?')) {
        api.deleteMessage(contextMenu.value.message.chatId, contextMenu.value.message.id)
            .then(() => loadMessages(contextMenu.value.message.chatId))
            .catch(err => console.error('Ошибка удаления:', err))
        contextMenu.value.show = false
      }
    }

    onMounted(() => {
      loadChats()
      connectSignalR()
    })

    return {
      authStore,
      userChats,
      currentChat,
      messageContent,
      currentMessages,
      openChat,
      sendMessage,
      showContextMenu,
      handleEditMessage,
      handleDeleteMessage,
      contextMenu
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