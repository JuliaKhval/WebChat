<template>
  <div class="user-list">
    <h3>Ваши чаты</h3>
    <div
        v-for="chat in chats"
        :key="chat.id"
        class="chat-item"
        @click="$emit('select-chat', chat)"
        :class="{ 'selected': selectedChat?.id === chat.id }"
    >
      {{ chat.receiverUsername }}
    </div>
  </div>
</template>

<script>
export default {
  props: {
    chats: {
      type: Array,
      required: true,
      default: () => []
    },
    selectedChat: {
      type: Object,
      default: null
    }
  },
  emits: ['select-chat']
}
</script>

<style scoped>
.user-list {
  width: 250px;
  padding: 15px;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  height: 100%;
}

.user-list h3 {
  margin-bottom: 15px;
  color: #333;
  text-align: center;
}

.chat-item {
  padding: 10px;
  margin-bottom: 5px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.chat-item:hover {
  background: #f0f0f0;
}

.chat-item.selected {
  background: #e0e0e0;
  font-weight: bold;
}
</style>