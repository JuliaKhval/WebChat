<template>
  <div :class="['message', { 'own-message': isOwnMessage }]">
    <div class="message-header">
      <strong>{{ message.username }}</strong>
      <span>{{ message.time }}</span>
    </div>
    <p>{{ message.text }}</p>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

export default {
  props: {
    message: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const authStore = useAuthStore()

    const isOwnMessage = computed(() => {
      return props.message.username === authStore.user?.username
    })

    return { isOwnMessage }
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
}

.own-message {
  margin-left: auto;
  background: #e3f2fd;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.8em;
  color: #666;
}
</style>