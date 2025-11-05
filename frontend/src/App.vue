<template>
  <div class="app" :class="`theme-${audioStore.currentTheme}`">
    <RouterView />
    
    <AppNotification />
    
    <SyncModal v-if="audioStore.syncLoading" />
    
    <!-- 新增初始设置弹窗 -->
    <SettingsModal 
      v-if="showInitialSettings"
      @close="showInitialSettings = false"
      @synced="() => {
        audioStore.syncAudioFiles()
        audioStore.loadFolderStructure()
        audioStore.loadFavorites()
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAudioStore } from '@/store/audio'
import { configApi } from '@/services/api'
import SyncModal from '@/components/SyncModal.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import AppNotification from '@/components/AppNotification.vue'

const audioStore = useAudioStore()
const showInitialSettings = ref(false)

onMounted(async () => {
  await audioStore.initializeAuth()

  // 如果用户已登录，再检查基础路径配置
  if (audioStore.isAuthenticated) {
    // 检查是否已配置基础路径
    try {
      const response = await configApi.getBasePath()
      if (!response.data.basePath) {
        // 如果没有配置基础路径，显示设置弹窗
        showInitialSettings.value = true
      } else {
        // 如果已配置，加载数据
        await audioStore.initializeAudioStore()
        audioStore.loadFolderStructure()
        audioStore.loadFavorites()
      }
    } catch (error) {
      console.error('Failed to check config:', error)
      // 如果检查失败，也显示设置弹窗
      showInitialSettings.value = true
    }
  }
})
</script>

<style>
:root {
  /* Light theme */
  --primary-color: #6366f1;
  --primary-color-rgb: 99, 102, 241;
  --primary-light: #f1f5f9;
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --card-bg: #ffffff;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  --hover-bg: #f1f5f9;
  --format-tag-bg: #10b981;
  --format-color: #ffffff;
  --tag-bg: #6366f1;
  --tag-color: #fff;
  --wave-color: #cbd5e1;
  --wave-color-light: #e2e8f0;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --success-color: #10b981;
}

[data-theme="dark"] {
  --primary-color: #818cf8;
  --primary-color-rgb: 129, 140, 248;
  --primary-light: #20262e;
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --card-bg: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border-color: #334155;
  --hover-bg: #334155;
  --tag-bg: #334155;
  --tag-color: #cbd5e1;
  --wave-color: #475569;
  --wave-color-light: #64748b;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.app {
  height: 100vh;
  overflow: hidden;
}

.app-layout {
  display: flex;
  height: 100%;
}

.admin-layout {
  display: flex;
  height: 100%;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-area {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>