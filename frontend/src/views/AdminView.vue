<template>
  <div class="not-found-view">
    <div class="not-found-content">
      <h1>Admin</h1>
      <button class="btn-primary" @click="goHome">
        返回首页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.not-found-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 20px;
}

.not-found-content {
  text-align: center;
}

.not-found-content h1 {
  font-size: 120px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 0;
  line-height: 1;
}

.not-found-content h2 {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.not-found-content p {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 32px;
}

.btn-primary {
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>