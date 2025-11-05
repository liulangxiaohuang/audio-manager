<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2 class="logo" @click="handleBackHome">
        <span>Audio Management</span>
      </h2>
    </div>
    
    <div class="sidebar-tabs">
      <button 
        class="tab-button" 
        @click="setActiveTab('folders')"
      >
        <HouseIcon :size="16" />
        Home
      </button>
      <button 
        class="tab-button" 
        @click="setActiveTab('favorites')"
      >
        <FolderUpIcon :size="16" />
        Upload
      </button>
    </div>

    <div class="sidebar-content">
      <div v-if="activeTab === 'folders'" class="folder-tree">
        <div 
          class="folder-item"
          :class="{ active: currentMenu === 'dashboard' }"
          @click="selectMenu('dashboard')"
        >
          <GaugeIcon :size="16" />
          <span class="folder-name">Dashboard</span>
        </div>
        <div 
          class="folder-item"
          :class="{ active: currentMenu === 'Audios' }"
          @click="selectMenu('Audios')"
        >
          <FolderIcon :size="16" />
          <span class="folder-name">Audios</span>
        </div>
        <div 
          class="folder-item"
          :class="{ active: currentMenu === 'Members' }"
          @click="selectMenu('Members')"
        >
          <UsersRoundIcon :size="16" />
          <span class="folder-name">Members</span>
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
      <button class="settings-button" @click="openSettings" v-if="audioStore.isAdmin">
        <SettingsIcon :size="16" />
        Settings
      </button>
      <div class="settings-btn-group">
        <button class="theme-toggle" @click="syncAudio" :disabled="audioStore.syncLoading" v-if="audioStore.isAdmin">
          <RefreshCwIcon :size="16" :class="{ spinning: audioStore.syncLoading }" />
          Sync
        </button>
        <button class="theme-toggle" @click="toggleTheme">
          <SunIcon v-if="currentTheme === 'light'" :size="16" />
          <MoonIcon v-else :size="16" />
          Theme
        </button>
      </div>
    </div>

    <SettingsModal 
      v-if="showSettings"
      @close="showSettings = false"
      @synced="audioStore.syncAudioFiles()"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAudioStore } from '@/store/audio'
import {
  FolderIcon,
  StarIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  RefreshCwIcon,
  UsersRoundIcon,
  GaugeIcon,
  HouseIcon,
  FolderUpIcon
} from 'lucide-vue-next'
import SettingsModal from '@/components/SettingsModal.vue'

const router = useRouter()
const audioStore = useAudioStore()

const activeTab = ref<'folders' | 'favorites'>('folders')
const currentMenu = ref('dashboard')
const currentFavorite = ref('default')
const showSettings = ref(false)

const favoriteFolders = computed(() => {
  return audioStore.favoriteFolders
})

const currentTheme = computed(() => audioStore.currentTheme)

const setActiveTab = (tab: 'folders' | 'favorites') => {
  activeTab.value = tab
  router.push('/')
}

const selectMenu = (name: string) => {
  currentMenu.value = name
  // 确保切换到文件夹视图
  activeTab.value = 'folders'
  if (name === 'dashboard') {
    return router.push({name: 'Admin'})
  }
  router.push({name})
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

const syncAudio = () => {
  audioStore.syncAudioFiles()
}

const toggleTheme = () => {
  audioStore.toggleTheme()
}

const handleBackHome = () => {
  router.push('/')
}

onMounted(() => {
  if (!audioStore.folderStructure.length) {
    audioStore.loadFolderStructure()
  }
})
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
  /* padding: 20px; */
  padding: 0 20px;
  height: 70px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0;
  display: flex;
  align-items: center;
  height: 100%;
}
.logo img {
  /* width: 69px; */
  /* width: 100%; */
  height: 100%;
}
.logo span {
  margin-left: 25px;
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

.settings-btn-group {
  display: flex;
  gap: 15px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}
</style>