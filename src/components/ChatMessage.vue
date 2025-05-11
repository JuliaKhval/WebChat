<template>
  <div :class="['message', { 'own-message': isOwnMessage }]">
    <div class="message-header">
      <strong>{{ message.sender }}</strong>
      <span>{{ formatDate(message.createdDataTime) }}</span>

      <!-- Кнопка контекстного меню -->
      <button v-if="isOwnMessage" class="context-menu-btn" @click="toggleMenu">
        ⋮
      </button>
    </div>

    <div class="message-content">
      {{ message.content }}
    </div>

    <!-- Контекстное меню -->
    <div v-if="showContextMenu" class="context-menu">
      <button @click="editMessage">Редактировать</button>
      <button @click="deleteMessage">Удалить</button>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'

export default {
  props: {
    message: {
      type: Object,
      required: true
    },
    currentUserId: {
      type: [String, Number],
      required: true
    },
    onEdit: {
      type: Function,
      required: true
    },
    onDelete: {
      type: Function,
      required: true
    }
  },
  setup(props) {
    console.log('message.sender:', props.message.sender)
    console.log('authStore username:', authStore.currentUser.username)
    console.log('isOwnMessage:', isOwnMessage.value)
    const isOwnMessage = computed(() => props.message.sender === props.currentUserId)
    const showContextMenu = ref(false)

    const toggleMenu = () => {
      showContextMenu.value = !showContextMenu.value
    }

    const editMessage = () => {
      const newText = prompt('Измените сообщение:', props.message.content)
      if (newText && newText.trim() !== props.message.content) {
        props.onEdit(newText)
      }
    }

    const deleteMessage = () => {
      if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
        props.onDelete()
      }
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      })
    }

    return {
      isOwnMessage,
      showContextMenu,
      toggleMenu,
      editMessage,
      deleteMessage,
      formatDate
    }
  }
}
</script>

<style scoped>
.message {
  position: relative;
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 8px;
  background-color: #f9f9f9;
  max-width: 70%;
}


.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  margin-bottom: 5px;
}

.context-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
}

.context-menu {
  position: absolute;
  right: 10px;
  top: 30px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.context-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
}

.context-menu button:hover {
  background-color: #f0f0f0;
}
</style>