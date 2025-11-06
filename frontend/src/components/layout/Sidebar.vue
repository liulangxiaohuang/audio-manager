<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2 class="logo" @click="handleBackHome">
        <img src="@/assets/logo.png">
        <span>音效管理器</span>
      </h2>
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
        <!-- 收藏夹列表 -->
        <div 
          v-for="favFolder in audioStore.getUserFavoriteFolders" 
          :key="favFolder._id"
          class="favorite-item"
          :class="{ active: currentFavorite === favFolder._id }"
          @click="selectFavorite(favFolder._id)"
        >
          <div class="folder-color" :style="{ backgroundColor: favFolder.color }"></div>
          <span class="favorite-name">{{ favFolder.name }}</span>
          <span class="favorite-count">{{ favFolder.audioCount }}</span>
          <div class="favorite-actions" v-if="!favFolder.isDefault">
            <button class="action-button" @click.stop="editFolder(favFolder)">
              <EditIcon :size="12" />
            </button>
            <button class="action-button" @click.stop="deleteFolder(favFolder._id)">
              <Trash2Icon :size="12" />
            </button>
          </div>
        </div>

        <!-- 创建新收藏夹 -->
        <div class="create-folder-section" v-if="showCreateFolder">
          <input 
            v-model="newFolderName" 
            type="text" 
            placeholder="收藏夹名称"
            class="folder-input"
            @keyup.enter="createFolder"
            @keyup.esc="cancelCreateFolder"
            ref="folderInput"
          />
          <div class="create-actions">
            <button class="action-button confirm" @click="createFolder">
              <CheckIcon :size="12" />
            </button>
            <button class="action-button cancel" @click="cancelCreateFolder">
              <XIcon :size="12" />
            </button>
          </div>
        </div>

        <!-- 添加收藏夹按钮 -->
        <button class="add-folder-btn" @click="startCreateFolder" v-if="!showCreateFolder">
          <PlusIcon :size="16" />
          新建收藏夹
        </button>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="settings-button" @click="openSettings" v-if="audioStore.isAdmin">
        <SettingsIcon :size="16" />
        设置
      </button>
      <div class="settings-btn-group">
        <button class="theme-toggle" @click="syncAudio" :disabled="audioStore.syncLoading" v-if="audioStore.isAdmin">
          <RefreshCwIcon :size="16" :class="{ spinning: audioStore.syncLoading }" />
          同步
        </button>
        <button class="theme-toggle" @click="toggleTheme">
          <SunIcon v-if="currentTheme === 'light'" :size="16" />
          <MoonIcon v-else :size="16" />
          切换主题
        </button>
      </div>
    </div>

    <SettingsModal 
      v-if="showSettings"
      @close="showSettings = false"
      @synced="audioStore.syncAudioFiles()"
    />

    <!-- 编辑收藏夹对话框 -->
    <div v-if="showEditDialog" class="modal-overlay" @click.self="closeEditDialog">
      <div class="modal-content small">
        <div class="modal-header">
          <h3>编辑收藏夹</h3>
          <button class="close-button" @click="closeEditDialog">
            <XIcon :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>收藏夹名称</label>
            <input v-model="editFolderData.name" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label>描述</label>
            <input v-model="editFolderData.description" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label>颜色</label>
            <div class="color-picker">
              <div 
                v-for="color in colorOptions" 
                :key="color"
                class="color-option"
                :class="{ active: editFolderData.color === color }"
                :style="{ backgroundColor: color }"
                @click="editFolderData.color = color"
              ></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeEditDialog">取消</button>
          <button class="btn-primary" @click="saveFolderEdit">保存</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAudioStore } from '@/store/audio'
import { 
  FolderIcon, 
  StarIcon, 
  SettingsIcon, 
  SunIcon, 
  MoonIcon, 
  RefreshCwIcon,
  EditIcon,
  Trash2Icon,
  PlusIcon,
  CheckIcon,
  XIcon
} from 'lucide-vue-next'
import SettingsModal from '@/components/SettingsModal.vue'

const router = useRouter()
const audioStore = useAudioStore()

const activeTab = ref<'folders' | 'favorites'>('folders')
const currentFolder = ref('')
const currentFavorite = ref('')
const showSettings = ref(false)
const showCreateFolder = ref(false)
const newFolderName = ref('')
const folderInput = ref<HTMLInputElement | null>(null)
const showEditDialog = ref(false)
const editingFolder = ref<any>(null)

// 编辑数据
const editFolderData = ref({
  name: '',
  description: '',
  color: '#007bff'
})

// 颜色选项
const colorOptions = [
  '#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1',
  '#e83e8c', '#fd7e14', '#20c997', '#17a2b8', '#6c757d'
]

const topLevelFolders = computed(() => {
  return audioStore.folderStructure.filter(item => item.type === 'folder')
})

const currentTheme = computed(() => audioStore.currentTheme)

const setActiveTab = async (tab: 'folders' | 'favorites') => {
  activeTab.value = tab
  if (tab === 'favorites') {
    // 加载用户收藏夹
    await audioStore.fetchUserFavoriteFolders()
    // 切换到收藏夹视图
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

const selectFavorite = (folderId: string) => {
  currentFavorite.value = folderId
  // 确保切换到收藏夹视图
  activeTab.value = 'favorites'
  router.push(`/favorites/${folderId}`)
}

// 开始创建收藏夹
const startCreateFolder = () => {
  showCreateFolder.value = true
  newFolderName.value = ''
  nextTick(() => {
    if (folderInput.value) {
      folderInput.value.focus()
    }
  })
}

// 取消创建收藏夹
const cancelCreateFolder = () => {
  showCreateFolder.value = false
  newFolderName.value = ''
}

// 创建收藏夹
const createFolder = async () => {
  if (!newFolderName.value.trim()) return
  
  try {
    await audioStore.createFavoriteFolder({
      name: newFolderName.value.trim(),
      description: '',
      color: colorOptions[Math.floor(Math.random() * colorOptions.length)]
    })
    showCreateFolder.value = false
    newFolderName.value = ''
  } catch (error) {
    // 错误处理已经在 store 中完成
  }
}

// 编辑收藏夹
const editFolder = (folder: any) => {
  editingFolder.value = folder
  editFolderData.value = {
    name: folder.name,
    description: folder.description || '',
    color: folder.color
  }
  showEditDialog.value = true
}

// 关闭编辑对话框
const closeEditDialog = () => {
  showEditDialog.value = false
  editingFolder.value = null
}

// 保存收藏夹编辑
const saveFolderEdit = async () => {
  if (!editFolderData.value.name.trim()) return
  
  try {
    // 这里需要添加更新收藏夹的 store 方法
    // await audioStore.updateFavoriteFolder(editingFolder.value._id, editFolderData.value)
    showEditDialog.value = false
    editingFolder.value = null
  } catch (error) {
    console.error('更新收藏夹失败:', error)
  }
}

// 删除收藏夹
const deleteFolder = async (folderId: string) => {
  if (!confirm('确定要删除这个收藏夹吗？此操作不可恢复。')) return
  
  try {
    // 这里需要添加删除收藏夹的 store 方法
    // await audioStore.deleteFavoriteFolder(folderId)
    // 如果当前选中的是这个收藏夹，重置选中状态
    if (currentFavorite.value === folderId) {
      currentFavorite.value = ''
    }
  } catch (error) {
    console.error('删除收藏夹失败:', error)
  }
}

// 监听路由变化，同步活动标签
watch(() => router.currentRoute.value.path, (path) => {
  if (path.startsWith('/favorites')) {
    activeTab.value = 'favorites'
    // 从路由中提取收藏夹ID
    const match = path.match(/\/favorites\/(.+)/)
    if (match) {
      currentFavorite.value = match[1]
    }
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

onMounted(async () => {
  if (!audioStore.folderStructure.length) {
    audioStore.loadFolderStructure()
  }
  
  // 加载用户收藏夹
  await audioStore.fetchUserFavoriteFolders()
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
  position: relative;
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

/* 收藏夹特定样式 */
.folder-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.favorite-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.favorite-item:hover .favorite-actions {
  opacity: 1;
}

.action-button {
  width: 20px;
  height: 20px;
  border: none;
  background: var(--bg-secondary);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.action-button:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.action-button.confirm {
  color: #28a745;
}

.action-button.cancel {
  color: #dc3545;
}

/* 创建收藏夹区域 */
.create-folder-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 8px;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
}

.folder-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.folder-input::placeholder {
  color: var(--text-secondary);
}

.create-actions {
  display: flex;
  gap: 4px;
}

.add-folder-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  font-size: 14px;
}

.add-folder-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
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

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 0;
  width: 450px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-content.small {
  width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
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
}

.close-button:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--text-primary);
  transform: scale(1.1);
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}
</style>