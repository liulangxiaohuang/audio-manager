<template>
  <div class="admin-layout">
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
import Sidebar from '@/components/Admin/Sidebar.vue'
import Header from '@/components/Admin/Header.vue'
</script>