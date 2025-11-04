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

    <div class="view-actions" style="display: block;">
      <div class="view-info">
        <!-- <h2>{{ currentFolderName }}</h2>
        <p v-if="audioStore.currentFolder">路径: {{ audioStore.currentFolder }}</p>
        <p v-else>根目录</p> -->
        <!-- <h2>{{ currentViewTitle }}</h2> -->
        <!-- <p v-if="audioStore.searchQuery">搜索: "{{ audioStore.searchQuery }}" - 找到 {{ audioFiles.length }} 个结果</p>
        <p v-else-if="audioStore.currentFolder">路径: {{ audioStore.currentFolder }}</p> -->
        <!-- <p v-else>根目录</p> -->
      </div>
      
      <div class="action-buttons" v-if="audioFiles.length">
        <!-- 多选模式开关 -->
        <button 
          class="btn-secondary" 
          @click="toggleMultiSelect"
          :class="{ 'active': multiSelectMode }"
        >
          <CheckSquareIcon :size="16" />
          {{ multiSelectMode ? '退出多选' : '多选' }}
        </button>

        <!-- 全选按钮，只在多选模式下显示 -->
        <button 
          v-if="multiSelectMode" 
          class="btn-secondary" 
          @click="selectAll"
        >
          <CheckIcon :size="16" />
          {{ selectedItems.size === allSelectableItems.length ? '取消全选' : '全选' }}
        </button>
        
        <button 
          v-if="multiSelectMode && selectedItems.size > 0" 
          class="btn-primary"
          @click="batchAddToFavorites"
        >
          <StarIcon :size="16" />
          批量收藏 ({{ selectedItems.size }})
        </button>
        
        <button 
          v-if="multiSelectMode && selectedItems.size > 0 && hasSelectedAudios" 
          class="btn-danger"
          @click="batchDelete"
        >
          <Trash2Icon :size="16" />
          批量删除 ({{ selectedAudioCount }})
        </button>
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
          :selected-audios="selectedItems"
          :show-checkbox="multiSelectMode"
          @select="toggleSelect"
          @play="playAudio"
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

    <ConfirmModal 
      v-if="showDeleteConfirm"
      title="删除音频"
      :message="`确定要删除所选的${selectedAudioCount}个音频吗？此操作不可撤销。`"
      confirm-text="删除"
      @close="showDeleteConfirm = false"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAudioStore } from '@/store/audio'
import { 
  HomeIcon, 
  ChevronRightIcon, 
  FolderIcon, 
  FolderOpenIcon, 
  StarIcon, 
  Trash2Icon,
  CheckSquareIcon,
  CheckIcon,
  SearchIcon
} from 'lucide-vue-next'
import AudioList from '@/components/AudioList.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import type { AudioFile, FolderItem } from '@/types/audio'

const audioStore = useAudioStore()

const selectedItems = ref<Set<string>>(new Set())
const multiSelectMode = ref(false)
const showDeleteConfirm = ref(false)

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

const allSelectableItems = computed(() => {
  return [...audioFiles.value]
})

const hasSelectedAudios = computed(() => {
  return Array.from(selectedItems.value).some(id => 
    audioFiles.value.some(audio => audio._id === id)
  )
})

const selectedAudioCount = computed(() => {
  return Array.from(selectedItems.value).filter(id => 
    audioFiles.value.some(audio => audio._id === id)
  ).length
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


// 监听搜索状态变化
watch(() => audioStore.searchQuery, async (newQuery) => {
  if (newQuery) {
    // 搜索状态下，清除多选模式
    multiSelectMode.value = false
    selectedItems.value.clear()
  }
})

onMounted(() => {
  // 初始化时加载当前文件夹内容
  audioStore.loadFolderContents(audioStore.currentFolder)
})

// 修复：只有一个 enterFolder 函数定义
const enterFolder = (folder: FolderItem) => {
  audioStore.navigateToFolder(folder.name)
  selectedItems.value.clear()
  multiSelectMode.value = false
}

const navigateToPath = (index: number) => {
  const targetPath = audioStore.currentPath.slice(0, index + 1).join('/')
  audioStore.setCurrentFolder(targetPath)
  selectedItems.value.clear()
  multiSelectMode.value = false
}

const navigateToRoot = () => {
  audioStore.navigateToRoot()
  selectedItems.value.clear()
  multiSelectMode.value = false
}

const toggleMultiSelect = () => {
  multiSelectMode.value = !multiSelectMode.value
  if (!multiSelectMode.value) {
    // 退出多选模式时清空选择
    selectedItems.value.clear()
  }
}

const toggleSelect = (audio: AudioFile) => {
  if (selectedItems.value.has(audio._id)) {
    selectedItems.value.delete(audio._id)
  } else {
    selectedItems.value.add(audio._id)
  }
}

const selectAll = () => {
  if (selectedItems.value.size === allSelectableItems.value.length) {
    selectedItems.value.clear()
  } else {
    selectedItems.value = new Set(allSelectableItems.value.map(audio => audio._id))
  }
}

const batchAddToFavorites = () => {
  selectedItems.value.forEach(audioId => {
    const audio = audioFiles.value.find(a => a._id === audioId)
    if (audio) {
      audioStore.toggleFavorite(audioId, 'default')
    }
  })
  selectedItems.value.clear()
}

const batchDelete = () => {
  showDeleteConfirm.value = true
}

const playAudio = (audio: AudioFile) => {
  console.log('播放音频:', audio.name)
  // 实现播放逻辑
}

const handleDeleteConfirm = () => {
  selectedItems.value.forEach(audioId => {
    audioStore.deleteAudio(audioId)
  })
  selectedItems.value.clear()
  showDeleteConfirm.value = false
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

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-secondary,
.btn-primary,
.btn-danger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--hover-bg);
  border-color: var(--text-secondary);
}

.btn-secondary.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-danger {
  background: var(--error-color);
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
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