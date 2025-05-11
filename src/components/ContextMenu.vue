<template>
  <div
      class="context-menu"
      :style="{ left: `${x}px`, top: `${y}px` }"
      @click.stop
  >
    <div
        v-if="isOwnMessage"
        class="context-menu-item"
        @click="$emit('edit')"
    >
      ✏️ Редактировать
    </div>
    <div
        class="context-menu-item"
        @click="$emit('delete')"
    >
      🗑️ Удалить
    </div>
    <div
        class="context-menu-item"
        @click="$emit('close')"
    >
      ✕ Закрыть
    </div>
  </div>
</template>

<script>
export default {
  props: {
    x: Number,
    y: Number,
    isOwnMessage: Boolean
  },
  emits: ['edit', 'delete', 'close']
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 1000;
  min-width: 150px;
}

.context-menu-item {
  padding: 8px 12px;
  cursor: pointer;
}

.context-menu-item:hover {
  background-color: #f5f5f5;
}
</style>