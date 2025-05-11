<template>
  <div
      :class="['message', { 'own-message': isOwnMessage }]"
      @contextmenu.prevent="showContextMenu($event)"
      :data-message-id="message.id"
  >
    <div class="message-header">
      <strong>{{ message.sender }}</strong>
      <span>{{ formatDate(message.createdDataTime) }}</span>
    </div>
    <div class="message-content">
      {{ message.content }}
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  props: {
    message: {
      type: Object,
      required: true
    },
    currentUserId: {
      type: [String, Number],
      required: true
    }
  },
  setup(props, { emit }) {
    const isOwnMessage = computed(() => props.message.userId === props.currentUserId)

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const showContextMenu = (event) => {
      event.preventDefault()
      emit('show-context-menu', {
        x: event.clientX,
        y: event.clientY,
        message: props.message
      })
    }

    return {
      isOwnMessage,
      formatDate,
      showContextMenu
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
  cursor: pointer;
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
</style>