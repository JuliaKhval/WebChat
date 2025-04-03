<template>
  <div id="app">
    <Navbar v-if="isAuthenticated" />
    <router-view />
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue'
import { mapState } from 'pinia'
import { useAuthStore } from './stores/auth'

export default {
  components: { Navbar },
  computed: {
    ...mapState(useAuthStore, ['isAuthenticated'])
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style>