<template>
  <div class="app-layout">
    <Sidebar />
    <main class="main-content">
      <Header />
      <div class="content-area">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
</script>