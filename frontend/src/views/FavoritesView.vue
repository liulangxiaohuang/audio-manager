<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAudioStore } from '@/store/audio'
import { StarIcon, EditIcon, Trash2Icon, XIcon } from 'lucide-vue-next'
import AudioList from '@/components/AudioList.vue'

// 定义props接口
interface Props {
  folderId?: string
}

// 接收路由参数作为props
const props = defineProps<Props>()

const route = useRoute()
const router = useRouter()
const audioStore = useAudioStore()

const showEditDialog = ref(false)
const editingFolder = ref<any>(null)
const loading = ref(false)
const folderAudios = ref<array>([])

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

// 计算属性：当前收藏夹信息
const currentFolder = computed(() => {
  if (!props.folderId) return null
  return audioStore.getUserFavoriteFolders.find(folder => folder._id === props.folderId)
})

// 计算属性：用户收藏夹列表
const userFavoriteFolders = computed(() => {
  return audioStore.getUserFavoriteFolders
})

// 初始化加载数据
onMounted(async () => {
  await loadFolderData()
})

// 监听路由参数变化
watch(() => props.folderId, async (newFolderId) => {
  await loadFolderData()
})

// 加载收藏夹数据
const loadFolderData = async () => {
  try {
    loading.value = true
    console.log('开始加载收藏夹数据:', props.folderId)
    
    // 加载用户收藏夹列表
    // await audioStore.fetchUserFavoriteFolders()
    
    if (props.folderId) {
      // 特定收藏夹：加载该收藏夹的音频
      const result = await audioStore.fetchFolderAudios(props.folderId)
      folderAudios.value = result.audios
    } else {
      // 加载全部收藏
      await audioStore.loadFavorites()
      folderAudios.value = audioStore.favorites
    }
    console.log('收藏夹数据结果：', folderAudios.value)
  } catch (error) {
    console.error('加载收藏夹数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 格式化时间
const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

// 编辑收藏夹
const editFolder = () => {
  if (!currentFolder.value) return
  
  editingFolder.value = currentFolder.value
  editFolderData.value = {
    name: currentFolder.value.name,
    description: currentFolder.value.description || '',
    color: currentFolder.value.color
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
  if (!editFolderData.value.name.trim() || !editingFolder.value) return
  
  try {
    // TODO: 这里需要添加更新收藏夹的 store 方法
    // await audioStore.updateFavoriteFolder(editingFolder.value._id, editFolderData.value)
    
    // 重新加载收藏夹数据
    await audioStore.fetchUserFavoriteFolders()
    
    showEditDialog.value = false
    editingFolder.value = null
  } catch (error) {
    console.error('更新收藏夹失败:', error)
  }
}

// 删除收藏夹
const deleteFolder = async () => {
  if (!currentFolder.value || currentFolder.value.isDefault) return
  
  if (!confirm(`确定要删除收藏夹 "${currentFolder.value.name}" 吗？此操作不可恢复。`)) return
  
  try {
    // TODO: 这里需要添加删除收藏夹的 store 方法
    // await audioStore.deleteFavoriteFolder(currentFolder.value._id)
    
    // 重新加载收藏夹数据
    await audioStore.fetchUserFavoriteFolders()
    
    // 跳转到全部收藏页面
    router.push('/favorites')
  } catch (error) {
    console.error('删除收藏夹失败:', error)
  }
}

const playAudio = (audio: any) => {
  console.log('播放音频:', audio.name)
  audioStore.playAudio(audio)
}

const navigateToFolders = () => {
  router.push('/')
}
</script>

<template>
  <div class="favorites-view">
    <div class="favorites-content">
      <!-- 收藏夹头部信息 -->
      <div v-if="currentFolder" class="folder-header">
        <div class="folder-info">
          <div class="folder-color" :style="{ backgroundColor: currentFolder.color }"></div>
          <div class="folder-details">
            <h2 class="folder-name">
              {{ currentFolder.name }}
              <span class="stat">
                <span class="stat-label"><span class="stat-value">{{ folderAudios.length }}</span>个音频</span>
              </span>
              <span class="stat">
                <span class="stat-label">/</span>
              </span>
              <span class="stat" v-if="currentFolder.createdAt">
                <span class="stat-label">创建于 {{ formatTime(currentFolder.createdAt) }}</span>
              </span>
            </h2>
            <p class="folder-description" v-if="currentFolder.description">
              {{ currentFolder.description }}
            </p>
          </div>
        </div>
        <div class="folder-actions" v-if="!currentFolder.isDefault">
          <button class="btn-secondary" @click="editFolder">
            <EditIcon :size="16" />
            编辑
          </button>
          <button class="btn-danger" @click="deleteFolder">
            <Trash2Icon :size="16" />
            删除
          </button>
        </div>
      </div>

      <!-- 全部收藏视图 -->
      <div v-else class="all-favorites-header">
        <h2 class="header-title">
          <span>全部收藏</span>
          <span class="stat">
            <span class="stat-label"><span class="stat-value">{{ folderAudios.length }}</span>个音频</span>
          </span>
          <span class="stat">
            <span class="stat-label">/</span>
          </span>
          <span class="stat">
            <span class="stat-label"><span class="stat-value">{{ userFavoriteFolders.length }}</span>个收藏夹</span>
          </span>
        </h2>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <p>加载中...</p>
      </div>

      <!-- 音频列表 -->
      <div class="favorites-list" v-else>
        <AudioList 
          :audios="folderAudios"
          @play="playAudio"
        />

        <div v-if="!folderAudios.length" class="empty-state">
          <StarIcon :size="48" />
          <h3 v-if="currentFolder">此收藏夹为空</h3>
          <h3 v-else>暂无收藏</h3>
          <p v-if="currentFolder">将此收藏夹添加到音频以开始构建您的收藏</p>
          <p v-else>您还没有收藏任何音频文件</p>
          <button class="btn-primary" @click="navigateToFolders" v-if="!currentFolder">
            浏览音频文件
          </button>
        </div>
      </div>
    </div>

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
            <textarea 
              v-model="editFolderData.description" 
              class="form-input textarea" 
              rows="3"
              placeholder="输入收藏夹描述..."
            ></textarea>
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
  </div>
</template>

<style scoped>
.favorites-view {
  max-width: 1200px;
  margin: 0 auto;
}

/* 调试信息样式 */
.debug-info {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 12px;
  color: #6c757d;
}

.debug-info p {
  margin: 4px 0;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

/* 其余样式保持不变 */
.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 15px;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.folder-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.folder-color {
  width: 20px;
  height: 20px;
  border-radius: 40px;
  flex-shrink: 0;
}

.folder-details {
  flex: 1;
}

.folder-name {
  font-size: 20px;
  font-weight: 500;
  color: var(--text-primary);
}

.folder-description {
  font-size: 14px;
  color: #888;
  line-height: 1.5;
}

.folder-stats {
  display: flex;
  gap: 24px;
  align-items: center;
}

.stat {
  /* display: flex; */
  /* align-items: baseline; */
  gap: 4px;
  font-size: 15px;
  font-weight: normal;
}

.stat-value {
  /* font-size: 20px; */
  /* font-weight: 700; */
  color: var(--primary-color);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  padding-left: 15px;
}

.folder-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.btn-secondary, .btn-danger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--hover-bg);
  border-color: var(--text-secondary);
}

.btn-danger {
  background: transparent;
  color: var(--error-color);
  border-color: var(--error-color);
}

.btn-danger:hover {
  background: var(--error-color);
  color: white;
}

/* 全部收藏头部 */
.all-favorites-header {
  margin-bottom: 24px;
  padding: 15px;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.header-title {
  font-size: 20px;
  font-weight: 500;
  color: var(--text-primary);
}

.header-description {
  font-size: 14px;
  color: #888;
}

.favorites-list {
  min-height: 400px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.empty-state svg {
  color: var(--warning-color);
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

.btn-primary {
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  opacity: 0.9;
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

.textarea {
  resize: vertical;
  min-height: 80px;
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
</style>