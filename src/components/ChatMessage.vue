<template>
  <div
      :class="['message', { 'own-message': isOwnMessage }]"
      @contextmenu.prevent="showContextMenu($event)"
      ref="messageElement"
  >
    <div class="message-header">
      <strong>{{ message.senderUsername || message.sender }}</strong>
      <span>{{ formatDate(message.createdDataTime) }}</span>
    </div>
    <div class="message-content">
      {{ message.content }}
    </div>

    <div
        v-if="contextMenuVisible"
        class="context-menu"
        :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
        @click.stop
    >
      <button v-if="isOwnMessage" @click="editMessage">Изменить</button>
      <button v-if="isOwnMessage" @click="deleteMessage">Удалить</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'

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
    connection: {
      type: Object,
      required: true
    }
  },
  emits: ['message-edited', 'message-deleted'],
  setup(props, { emit }) {
    const isOwnMessage = computed(() => props.message.senderId === props.currentUserId)
    const contextMenuVisible = ref(false)
    const contextMenuX = ref(0)
    const contextMenuY = ref(0)
    const messageElement = ref(null)

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      })
    }

    const showContextMenu = (event) => {
      if (!isOwnMessage.value) return

      contextMenuX.value = event.clientX
      contextMenuY.value = event.clientY
      contextMenuVisible.value = true
    }

    const hideContextMenu = () => {
      contextMenuVisible.value = false
    }

    const editMessage = () => {
      const newText = prompt('Изменить сообщение:', props.message.content)
      if (newText && newText.trim() && newText !== props.message.content) {
        emit('message-edited', {
          messageId: props.message.id,
          newText: newText
        })
      }
      hideContextMenu()
    }

    const deleteMessage = () => {
      if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
        emit('message-deleted', props.message.id)
      }
      hideContextMenu()
    }

    const handleClickOutside = (event) => {
      if (messageElement.value && !messageElement.value.contains(event.target)) {
        hideContextMenu()
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      isOwnMessage,
      formatDate,
      contextMenuVisible,
      contextMenuX,
      contextMenuY,
      messageElement,
      showContextMenu,
      editMessage,
      deleteMessage
    }
  }
}
</script>

<style scoped>
.message {
  margin: 10px 0;
  padding: 10px;
  border-radius: 5px;
  background: #f1f1f1;
  max-width: 70%;
  align-self: flex-start;
  position: relative;
}

.message.own-message {
  align-self: flex-end;
  background: #e3f2fd;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.8em;
  color: #666;
}

.message-content {
  word-wrap: break-word;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  z-index: 1000;
}

.context-menu button {
  display: block;
  width: 100%;
  padding: 8px 16px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
}

.context-menu button:hover {
  background-color: #f5f5f5;
}
</style>