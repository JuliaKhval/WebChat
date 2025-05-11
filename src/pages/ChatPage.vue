<template>
  <div class="chat-app">
    <UserList
        :chats="userChats"
        :selected-chat="currentChatId"
        @select-chat="selectChat"
    />

    <div class="chat-window">
      <div v-if="currentChatId" class="active-chat">
        <div class="chat-header">
          Чат {{ currentChatId }}
        </div>

        <div ref="messagesContainer" class="messages">
          <Message
              v-for="message in messages"
              :key="message.id"
              :message="{
              id: message.id,
              sender: message.userId,
              content: message.content,
              createdDataTime: message.createdAt || new Date().toISOString()
            }"
              :current-user="currentUserId"
              @edit="editMessage(currentChatId, message.id, $event)"
              @delete="deleteMessage(currentChatId, message.id)"
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
import { ref, onMounted, nextTick } from 'vue'
import Message from '../components/ChatMessage.vue'
import UserList from '../components/UserList.vue'

export default {
  components: { Message, UserList },
  setup() {
    // Ваши существующие переменные
    let connection = null;
    const currentUserId = ref(localStorage.getItem("currentUserId") || null);
    const currentChatId = ref(null);
    const messageContent = ref('');
    const messages = ref([]);
    const messagesContainer = ref(null);
    const userChats = ref([]);

    // Ваши существующие SignalR функции
    async function connectSignalR() {
      const token = localStorage.getItem("token");

      connection = new signalR.HubConnectionBuilder()
          .withUrl("https://messengertester.somee.com/chatHub", {
            accessTokenFactory: () => token
          })
          .build();

      connection.on("ReceiveMessage", (chatId, userId, message) => {
        if (chatId === currentChatId.value) {
          addMessageToDOM(chatId, userId, message);
        }
      });

      connection.on("MessageEdited", (chatId, messageId, newText) => {
        const index = messages.value.findIndex(m => m.id === messageId);
        if (index !== -1) {
          messages.value[index].content = newText;
        }
      });

      connection.on("MessageDeleted", (chatId, messageId) => {
        messages.value = messages.value.filter(m => m.id !== messageId);
      });

      try {
        await connection.start();
        console.log("SignalR подключён");
      } catch (err) {
        console.error("Ошибка подключения к SignalR:", err);
      }
    }

    async function addMessageToDOM(chatId, userId, message, messageId = null) {
      messages.value.push({
        id: messageId,
        userId,
        content: message,
        createdAt: new Date().toISOString()
      });

      await nextTick(() => {
        messagesContainer.value?.scrollTo({
          top: messagesContainer.value.scrollHeight,
          behavior: "smooth"
        });
      });
    }

    async function loadChats(userId) {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://messengertester.somee.com/chat/${userId}/chats`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (res.ok) {
        userChats.value = await res.json();
      } else {
        console.error("Ошибка загрузки чатов");
      }
    }

    async function selectChat(chatId) {
      currentChatId.value = chatId;
      await loadMessages(chatId);

      try {
        await connection.invoke("JoinChat", chatId.toString(), currentUserId.value.toString());
      } catch (err) {
        console.error("Ошибка при выборе чата:", err);
      }
    }

    async function loadMessages(chatId) {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://messengertester.somee.com/message/${chatId}/messages`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (res.ok) {
        messages.value = await res.json();
        await nextTick(() => {
          messagesContainer.value?.scrollTo({
            top: messagesContainer.value.scrollHeight,
            behavior: "smooth"
          });
        });
      } else {
        console.error("Ошибка загрузки сообщений");
      }
    }

    async function sendMessage() {
      if (!currentChatId.value) {
        alert("Выберите чат");
        return;
      }

      const content = messageContent.value.trim();
      if (!content) return;

      const token = localStorage.getItem("token");
      const res = await fetch(`https://messengertester.somee.com/message/${currentChatId.value}/messages/${currentUserId.value}/Add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        messageContent.value = "";
      } else {
        alert("Ошибка отправки сообщения");
      }
    }

    async function editMessage(chatId, messageId, newText) {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://messengertester.somee.com/message/${chatId}/messages/${messageId}/Edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(newText)
      });

      if (!res.ok) {
        alert("Ошибка изменения сообщения");
      }
    }

    async function deleteMessage(chatId, messageId) {
      if (!confirm("Вы уверены, что хотите удалить это сообщение?")) return;

      const token = localStorage.getItem("token");
      const res = await fetch(`https://messengertester.somee.com/message/${chatId}/messages/${messageId}/Delete`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (!res.ok) {
        alert("Ошибка удаления сообщения");
      }
    }

    // Инициализация
    onMounted(() => {
      connectSignalR();
      if (currentUserId.value) {
        loadChats(currentUserId.value);
      }
    });

    return {
      currentUserId,
      currentChatId,
      userChats,
      messages,
      messageContent,
      messagesContainer,
      selectChat,
      sendMessage,
      editMessage,
      deleteMessage
    }
  }
}
</script>

<style scoped>
/* Стили остаются без изменений */
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