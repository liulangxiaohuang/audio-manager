<template>
  <div class="notifications-container">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      class="notification"
      :class="notification.type"
      @click="removeNotification(notification.id)"
    >
      <div class="notification-content">
        <div class="notification-title">{{ notification.title }}</div>
        <div class="notification-message">{{ notification.message }}</div>
      </div>
      <button class="close-button" @click.stop="removeNotification(notification.id)">
        <XIcon :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XIcon } from 'lucide-vue-next'
import { useNotification } from '@/utils/notification'

const { notifications, removeNotification } = useNotification()
</script>

<style scoped>
.notifications-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 400px;
}

.notification {
  display: flex;
  align-items: flex-start;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  border-left: 4px solid #ccc;
  transition: all 0.3s ease;
  min-width: 300px;
}

.notification:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}

.notification.success {
  border-left-color: var(--success-color, #10b981);
}

.notification.error {
  border-left-color: var(--error-color, #ef4444);
}

.notification.warning {
  border-left-color: var(--warning-color, #f59e0b);
}

.notification.info {
  border-left-color: var(--primary-color, #6366f1);
}

.notification-content {
  flex: 1;
  margin-right: 12px;
}

.notification-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.notification-message {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.close-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.close-button:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}
</style>