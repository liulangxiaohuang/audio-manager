<template>
  <div class="folder-view">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-nav" v-if="!audioStore.searchQuery" style="display: none;">
      <button 
        class="breadcrumb-item root" 
        @click="navigateToRoot"
        :disabled="audioStore.currentPath.length === 0"
      >
        <HomeIcon :size="16" />
        根目录
      </button>
      
      <span class="breadcrumb-separator" v-if="audioStore.currentPath.length > 0">
        <ChevronRightIcon :size="16" />
      </span>
      
      <button 
        v-for="(segment, index) in audioStore.currentPath" 
        :key="index"
        class="breadcrumb-item"
        @click="navigateToPath(index)"
      >
        {{ segment }}
        <span class="breadcrumb-separator" v-if="index < audioStore.currentPath.length - 1">
          <ChevronRightIcon :size="16" />
        </span>
      </button>
    </div>

    <div class="view-actions" style="display: none;">
      <div class="view-info">
        <!-- <h2>{{ currentFolderName }}</h2>
        <p v-if="audioStore.currentFolder">路径: {{ audioStore.currentFolder }}</p>
        <p v-else>根目录</p> -->
        <!-- <h2>{{ currentViewTitle }}</h2> -->
        <!-- <p v-if="audioStore.searchQuery">搜索: "{{ audioStore.searchQuery }}" - 找到 {{ audioFiles.length }} 个结果</p>
        <p v-else-if="audioStore.currentFolder">路径: {{ audioStore.currentFolder }}</p> -->
        <!-- <p v-else>根目录</p> -->
      </div>
    </div>

    <div class="folder-content">
      <!-- 文件夹列表 -->
      <div v-if="folders.length && !audioStore.searchQuery" class="folders-section">
        <h3>文件夹</h3>
        <div class="folders-grid">
          <div 
            v-for="folder in folders" 
            :key="folder.path"
            class="folder-card"
            @click="enterFolder(folder)"
          >
            <FolderIcon :size="32" />
            <div class="folder-info">
              <h4>{{ folder.name }}</h4>
              <p>文件夹</p>
            </div>
            <ChevronRightIcon :size="16" class="folder-arrow" />
          </div>
        </div>
      </div>

      <!-- 音频文件列表 -->
      <div v-if="audioFiles.length" class="audios-section">
        <!-- <h3 v-if="folders.length">音频文件 ({{ audioFiles.length }})</h3>
        <div v-else class="section-header">
          <h3>音频文件 ({{ audioFiles.length }})</h3>
        </div> -->
        <h3 v-if="folders.length && !audioStore.searchQuery">音频文件 ({{ audioFiles.length }})</h3>
        <div v-else class="section-header">
          <h3 v-if="audioStore.searchQuery">搜索结果 ({{ audioFiles.length }})</h3>
          <h3 v-else>音频文件 ({{ audioFiles.length }})</h3>
        </div>
        
        <AudioList
          :audios="audioFiles"
        />
      </div>

      <!-- 空状态 -->
      <div v-if="!folders.length && !audioFiles.length" class="empty-state">
        <FolderOpenIcon v-if="!audioStore.searchQuery" :size="48" />
        <SearchIcon v-else :size="48" />
        <h3>{{ emptyStateTitle }}</h3>
        <p>{{ emptyStateMessage }}</p>
        <button v-if="!audioStore.searchQuery" class="btn-primary" @click="audioStore.syncAudioFiles()">
          同步音频文件
        </button>
        <button v-else class="btn-primary" @click="audioStore.clearSearch()">
          返回文件列表
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { 
  HomeIcon, 
  ChevronRightIcon, 
  FolderIcon, 
  FolderOpenIcon, 
  SearchIcon
} from 'lucide-vue-next'
import AudioList from '@/components/AudioList.vue'
import type { AudioFile, FolderItem } from '@/types/audio'
import { useAudioStore } from '@/store/audio'

const audioStore = useAudioStore()

const folders = computed(() => {
  // 搜索状态下不显示文件夹
  if (audioStore.searchQuery) return []
  return audioStore.currentFolderContents.filter(item => item.type === 'folder') as FolderItem[]
})

const audioFiles = computed(() => {
  return audioStore.currentFolderContents.filter(item => item.type === 'audio') as AudioFile[]
})

const currentFolderName = computed(() => {
  if (audioStore.currentPath.length === 0) return '根目录'
  return audioStore.currentPath[audioStore.currentPath.length - 1]
})

const currentViewTitle = computed(() => {
  if (audioStore.searchQuery) {
    return `搜索: ${audioStore.searchQuery}`
  }
  if (audioStore.currentPath.length === 0) return '根目录'
  return audioStore.currentPath[audioStore.currentPath.length - 1]
})

const emptyStateTitle = computed(() => {
  if (audioStore.searchQuery) {
    return '没有找到匹配的音频'
  }
  return '文件夹为空'
})

const emptyStateMessage = computed(() => {
  if (audioStore.searchQuery) {
    return `没有找到包含 "${audioStore.searchQuery}" 的音频文件`
  }
  return '此文件夹中没有内容'
})

onMounted(() => {
  // 初始化时加载当前文件夹内容
  audioStore.loadFolderContents(audioStore.currentFolder)
})

// 修复：只有一个 enterFolder 函数定义
const enterFolder = (folder: FolderItem) => {
  audioStore.navigateToFolder(folder.name)
}

const navigateToPath = (index: number) => {
  const targetPath = audioStore.currentPath.slice(0, index + 1).join('/')
  audioStore.setCurrentFolder(targetPath)
}

const navigateToRoot = () => {
  audioStore.navigateToRoot()
}
</script>

<style scoped>
.folder-view {
  /* padding: 24px; */
}

.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  flex-wrap: wrap;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.3s ease;
  text-decoration: none;
}

.breadcrumb-item:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.breadcrumb-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.breadcrumb-item.root {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.breadcrumb-separator {
  color: var(--text-secondary);
  margin: 0 8px;
}

.view-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 20px;
}

.view-info h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.view-info p {
  color: var(--text-secondary);
  margin: 0;
  font-size: 14px;
}

.folder-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.folders-section h3,
.audios-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.folders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.folder-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--card-bg);
}

.folder-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.folder-card svg:first-child {
  color: var(--primary-color);
}

.folder-info {
  flex: 1;
}

.folder-info h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.folder-info p {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.folder-arrow {
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state svg {
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  margin-bottom: 20px;
  color: var(--text-secondary);
}
</style>