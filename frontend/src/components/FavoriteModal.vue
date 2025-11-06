<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>管理收藏</h3>
        <button class="close-button" @click="$emit('close')">
          <XIcon :size="20" />
        </button>
      </div>
      
      <div class="modal-body">
        <div class="current-status" v-if="currentFavorite">
          <p><b>{{ filename }}</b> 已收藏在 <b>{{ currentFavorite.folder.name }}</b></p>
        </div>
        
        <div class="favorite-folders">
          <h4>选择收藏夹</h4>
          <div class="folders-list">
            <label 
              v-for="folder in availableFolders" 
              :key="folder._id"
              class="folder-radio"
              :class="{ disabled: folder._id === currentFavorite?.folder?._id }"
            >
              <input 
                type="radio" 
                :value="folder._id"
                v-model="selectedFolder"
                :disabled="folder._id === currentFavorite?.folder?._id"
              />
              <span class="radio-checkmark"></span>
              <div class="folder-color" :style="{ backgroundColor: folder.color }"></div>
              <div class="folder-info">
                <span class="folder-name">{{ folder.name }}</span>
                <span class="folder-count">{{ folder.audioCount }} 个音频</span>
              </div>
            </label>
          </div>
        </div>
        
        <div class="new-folder-section">
          <h4>新建收藏夹</h4>
          <div class="new-folder-input">
            <input 
              v-model="newFolderName" 
              type="text" 
              placeholder="输入收藏夹名称"
              class="form-input"
              @keyup.enter="createNewFolder"
            />
            <button 
              @click="createNewFolder" 
              class="btn-primary"
              :disabled="!newFolderName.trim()"
            >
              创建
            </button>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          class="btn-danger" 
          @click="removeFavorite"
          v-if="currentFavorite"
          :disabled="loading"
        >
          <Trash2Icon :size="16" />
          取消收藏
        </button>
        <button class="btn-secondary" @click="$emit('close')" :disabled="loading">
          取消
        </button>
        <button 
          class="btn-primary" 
          @click="confirmFavorite"
          :disabled="!selectedFolder || loading || selectedFolder === currentFavorite?.folder?._id"
        >
          <StarIcon :size="16" />
          {{ currentFavorite ? '移动到收藏夹' : '添加到收藏' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { XIcon, StarIcon, Trash2Icon } from 'lucide-vue-next'
import { useAudioStore } from '@/store/audio'

interface Props {
  audioId: string,
  filename: string,
  currentFavorite?: any
}

interface Emits {
  (e: 'close'): void
  (e: 'favorite', folderId: string): void
  (e: 'unfavorite'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const audioStore = useAudioStore()
const selectedFolder = ref('')
const newFolderName = ref('')
const loading = ref(false)

// 可用的收藏夹列表
const availableFolders = computed(() => {
  return audioStore.getUserFavoriteFolders
})

onMounted(() => {
  // 如果音频已经在某个收藏夹中，默认选中该收藏夹
  if (props.currentFavorite) {
    selectedFolder.value = props.currentFavorite.folder._id
  } else if (availableFolders.value.length > 0) {
    // 否则选中第一个收藏夹
    selectedFolder.value = availableFolders.value[0]._id
  }
})

const createNewFolder = async () => {
  if (!newFolderName.value.trim()) return
  
  try {
    const newFolder = await audioStore.createFavoriteFolder({
      name: newFolderName.value.trim(),
      description: '',
      color: getRandomColor()
    })
    
    // 选中新创建的收藏夹
    selectedFolder.value = newFolder._id
    
    // 清空输入框
    newFolderName.value = ''
  } catch (error) {
    // 错误处理已经在 store 中完成
  }
}

const confirmFavorite = async () => {
  if (!selectedFolder.value) return
  
  loading.value = true
  try {
    emit('favorite', selectedFolder.value)
    emit('close')
  } finally {
    loading.value = false
  }
}

const removeFavorite = async () => {
  if (!confirm('确定要取消收藏这个音频吗？')) return
  
  loading.value = true
  try {
    emit('unfavorite')
    emit('close')
  } finally {
    loading.value = false
  }
}

// 生成随机颜色
const getRandomColor = () => {
  const colors = [
    '#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1',
    '#e83e8c', '#fd7e14', '#20c997', '#17a2b8', '#6c757d'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
</script>

<style scoped>
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
  max-height: 50vh;
  overflow-y: auto;
}

.current-status {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 20px;
}

.current-status p {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
}

.favorite-folders h4,
.new-folder-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.folders-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.folder-radio {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.folder-radio:hover:not(.disabled) {
  border-color: var(--primary-color);
  background: var(--hover-bg);
}

.folder-radio.disabled {
  background: var(--bg-secondary);
  cursor: not-allowed;
  opacity: 0.7;
}

.folder-radio input {
  display: none;
}

.radio-checkmark {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  position: relative;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.folder-radio:not(.disabled) input:checked + .radio-checkmark {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.folder-radio:not(.disabled) input:checked + .radio-checkmark::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 4px;
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
}

.folder-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.folder-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.folder-name {
  font-weight: 500;
  color: var(--text-primary);
}

.folder-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.new-folder-input {
  display: flex;
  gap: 8px;
}

.new-folder-input .form-input {
  flex: 1;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
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

.btn-secondary:hover:not(:disabled) {
  background: var(--hover-bg);
  border-color: var(--text-secondary);
}

.btn-danger {
  background: #dc3545;
  color: white;
  margin-right: auto;
}

.btn-danger:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>