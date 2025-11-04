<template>
  <div class="clean-layout">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
// 这个布局不需要额外的组件
</script>

<style scoped>
.clean-layout {
  height: 100vh;
  overflow: hidden;
}
</style>