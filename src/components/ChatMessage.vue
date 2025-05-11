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
    const authStore = useAuthStore() // ✅ Теперь внутри setup()
    const showContextMenu = ref(false)

    // --- 1. Проверка: своё ли сообщение ---
    const isOwnMessage = computed(() => {
      if (!props.message.sender || !authStore.currentUser) {
        return false
      }

      const sender = String(props.message.sender).trim().toLowerCase()
      const current = String(authStore.currentUser.username || authStore.currentUser).trim().toLowerCase()

      return sender === current
    })

    // --- 2. Меню ---
    const toggleMenu = () => {
      showContextMenu.value = !showContextMenu.value
    }

    // --- 3. Редактирование ---
    const editMessage = () => {
      const newText = prompt('Измените сообщение:', props.message.content)
      if (newText && newText.trim() !== props.message.content) {
        props.onEdit(newText)
      }
    }

    // --- 4. Удаление ---
    const deleteMessage = () => {
      if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
        props.onDelete()
      }
    }

    // --- 5. Формат даты ---
    const formatDate = (dateString) => {
      if (!dateString) return ''
      return new Date(dateString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      })
    }

    // --- Отладка ---
    console.log('message.sender:', props.message.sender)
    console.log('authStore currentUser:', authStore.currentUser)
    console.log('isOwnMessage:', isOwnMessage.value)

    // --- Возвращаем всё в шаблон ---
    return {
      isOwnMessage,
      showContextMenu,
      toggleMenu,
      editMessage,
      deleteMessage,
      formatDate // ✅ Обязательно добавляем сюда!
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