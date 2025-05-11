<template>
  <div
      :class="['message', { 'own-message': isOwnMessage }]"
      @contextmenu.prevent="toggleMenu"
  >
    <div class="message-header">
      <strong>{{ message.sender }}</strong>
      <span>{{ formatDate(message.createdDataTime) }}</span>
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
import { useAuthStore } from '@/stores/auth'

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
    const authStore = useAuthStore()
    const showContextMenu = ref(false)

    // --- Определяем, своё ли сообщение ---
    const isOwnMessage = computed(() => {
      if (!props.message.sender || !authStore.currentUser) return false

      const senderId = String(props.message.sender)
      const currentUserId = String(authStore.currentUser.id)

      return senderId === currentUserId
    })

    // --- Контекстное меню ---
    const toggleMenu = () => {
      showContextMenu.value = !showContextMenu.value
    }

    // --- Редактирование ---
    const editMessage = () => {
      const newText = prompt('Измените сообщение:', props.message.content)
      if (newText && newText.trim() !== props.message.content) {
        props.onEdit(newText)
      }
    }

    // --- Удаление ---
    const deleteMessage = () => {
      if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
        props.onDelete()
      }
    }

    // --- Формат даты ---
    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }) + ' ' + date.toLocaleDateString()
    }

    // --- Отладка ---
    console.log('message.sender:', props.message.sender)
    console.log('authStore currentUser.id:', authStore.currentUser?.id)
    console.log('isOwnMessage:', isOwnMessage.value)

    // --- Возвращаем всё в шаблон ---
    return {
      isOwnMessage,
      showContextMenu,
      toggleMenu,
      editMessage,
      deleteMessage,
      formatDate // ✅ Обязательно!
    }
  }
}
</script>

<style scoped>
/* Твои стили остаются без изменений */
.message {
  position: relative;
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 8px;
  background-color: #f9f9f9;
  max-width: 70%;
  align-self: flex-start; /* по умолчанию слева */
  margin-bottom: 10px;
}

.own-message {
  align-self: flex-end; /* мои справа */
  background-color: #dcf8c6;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  margin-bottom: 5px;
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
  min-width: 120px;
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