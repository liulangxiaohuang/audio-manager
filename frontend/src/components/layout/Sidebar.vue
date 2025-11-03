<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2 class="logo">音效管理器</h2>
    </div>
    
    <div class="sidebar-tabs">
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'folders' }"
        @click="setActiveTab('folders')"
      >
        <FolderIcon :size="16" />
        文件夹
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'favorites' }"
        @click="setActiveTab('favorites')"
      >
        <StarIcon :size="16" />
        收藏夹
      </button>
    </div>

    <div class="sidebar-content">
      <div v-if="activeTab === 'folders'" class="folder-tree">
        <div 
          v-for="folder in topLevelFolders" 
          :key="folder.path"
          class="folder-item"
          :class="{ active: currentFolder === folder.path }"
          @click="selectFolder(folder.path)"
        >
          <FolderIcon :size="16" />
          <span class="folder-name">{{ folder.name }}</span>
          <span class="folder-count" v-if="folder.items">{{ folder.items.length }}</span>
        </div>
      </div>

      <div v-else class="favorites-list">
        <div 
          v-for="favFolder in favoriteFolders" 
          :key="favFolder.id"
          class="favorite-item"
          :class="{ active: currentFavorite === favFolder.id }"
          @click="selectFavorite(favFolder.id)"
        >
          <StarIcon :size="16" />
          <span class="favorite-name">{{ favFolder.name }}</span>
          <span class="favorite-count">{{ favFolder.count }}</span>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="settings-button" @click="openSettings">
        <SettingsIcon :size="16" />
        设置
      </button>
      <button class="theme-toggle" @click="toggleTheme">
        <SunIcon v-if="currentTheme === 'light'" :size="16" />
        <MoonIcon v-else :size="16" />
        切换主题
      </button>
    </div>

    <SettingsModal 
      v-if="showSettings"
      @close="showSettings = false"
      @synced="audioStore.syncAudioFiles()"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAudioStore } from '@/store/audio'
import { FolderIcon, StarIcon, SettingsIcon, SunIcon, MoonIcon } from 'lucide-vue-next'
import SettingsModal from '@/components/SettingsModal.vue'

const router = useRouter()
const audioStore = useAudioStore()

const activeTab = ref<'folders' | 'favorites'>('folders')
const currentFolder = ref('')
const currentFavorite = ref('default')
const showSettings = ref(false)

const topLevelFolders = computed(() => {
  return audioStore.folderStructure.filter(item => item.type === 'folder')
})

const favoriteFolders = computed(() => {
  return audioStore.favoriteFolders
})

const setActiveTab = (tab: 'folders' | 'favorites') => {
  activeTab.value = tab
  if (tab === 'favorites') {
    // 切换到收藏夹视图
    audioStore.loadFavorites()
    // 更新路由或状态以显示收藏夹内容
    router.push('/favorites')
  } else {
    // 切换到文件夹视图
    router.push('/')
  }
}

const selectFolder = (folderPath: string) => {
  currentFolder.value = folderPath
  audioStore.setCurrentFolder(folderPath)
  // 确保切换到文件夹视图
  activeTab.value = 'folders'
  router.push('/')
}

const selectFavorite = (favoriteId: string) => {
  currentFavorite.value = favoriteId
  audioStore.loadFavorites(favoriteId === 'all' ? undefined : favoriteId)
  // 确保切换到收藏夹视图
  activeTab.value = 'favorites'
  router.push('/favorites')
}

// 监听路由变化，同步活动标签
watch(() => router.currentRoute.value.path, (path) => {
  if (path === '/favorites') {
    activeTab.value = 'favorites'
  } else {
    activeTab.value = 'folders'
  }
})

const openSettings = () => {
  showSettings.value = true
}

const toggleTheme = () => {
  audioStore.toggleTheme()
}

const currentTheme = computed(() => audioStore.currentTheme)
</script>

<style scoped>
.sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0;
}

.sidebar-tabs {
  display: flex;
  padding: 16px;
  gap: 8px;
  border-bottom: 1px solid var(--border-color);
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.tab-button:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tab-button.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.sidebar-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.folder-item,
.favorite-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 4px;
}

.folder-item:hover,
.favorite-item:hover {
  background: var(--hover-bg);
}

.folder-item.active,
.favorite-item.active {
  background: var(--primary-light);
  color: var(--primary-color);
}

.folder-name,
.favorite-name {
  flex: 1;
  font-size: 14px;
}

.folder-count,
.favorite-count {
  background: var(--tag-bg);
  color: var(--tag-color);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-button,
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  font-size: 14px;
}

.settings-button:hover,
.theme-toggle:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}
</style>