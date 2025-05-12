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
    currentUser: {
      type: [String, Number],
      required: true
    }
  },
  emits: ['edit', 'delete'], // ✅ Это важно — объявляем события для родителя
  setup(props, { emit }) { // ✅ Получаем emit из контекста
    const authStore = useAuthStore()
    const showContextMenu = ref(false)

    // --- Проверяем, своё ли сообщение ---
    const isOwnMessage = computed(() => {
      return String(props.message.sender) === String(authStore.currentUser.username)
    })

    // --- Меню ---
    const toggleMenu = () => {
      showContextMenu.value = !showContextMenu.value
    }

    // --- Редактирование ---
    const editMessage = () => {
      const newText = prompt('Измените сообщение:', props.message.content)
      if (newText && newText.trim() !== props.message.content) {
        emit('edit', newText) // ✅ Вызываем событие `@edit` в родителе
      }
    }

    // --- Удаление ---
    const deleteMessage = () => {
      if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
        emit('delete') // ✅ Вызываем событие `@delete` в родителе
      }
    }

    // --- Формат даты ---


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