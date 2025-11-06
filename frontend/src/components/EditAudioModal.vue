<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>编辑音频信息</h3>
        <button class="close-button" @click="$emit('close')">
          <XIcon :size="20" />
        </button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">音频名称</label>
          <input 
            v-model="formData.name" 
            type="text" 
            class="form-input"
            placeholder="输入音频名称"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">标签</label>
          <div class="tags-input">
            <span 
              v-for="tag in currentTags" 
              :key="tag._id" 
              class="tag"
            >
              {{ tag.tag }}
              <button 
                @click="removeTag(tag._id)" 
                class="tag-remove"
                :disabled="tagLoading"
              >
                <XIcon :size="12" />
              </button>
            </span>
            <input 
              v-model="newTag" 
              type="text" 
              class="tag-input"
              placeholder="回车以添加标签..."
              @keydown.enter="addTag"
              @keydown.backspace="handleBackspace"
              :disabled="tagLoading"
            />
          </div>
          <div v-if="tagLoading" class="loading-text">
            加载中...
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">收藏夹</label>
          <div class="favorite-folders">
            <!-- 无收藏选项 -->
            <label class="folder-radio">
              <input 
                type="radio" 
                :value="null"
                v-model="selectedFolderId"
              />
              <span class="radio-mark"></span>
              <span class="folder-info">
                <span class="folder-name">无收藏</span>
              </span>
            </label>
            
            <!-- 收藏夹选项 -->
            <label 
              v-for="folder in userFavoriteFolders" 
              :key="folder._id"
              class="folder-radio"
            >
              <input 
                type="radio" 
                :value="folder._id"
                v-model="selectedFolderId"
              />
              <span class="radio-mark"></span>
              <span class="folder-info">
                <span class="folder-name">{{ folder.name }}</span>
                <span class="folder-color" :style="{ backgroundColor: folder.color }"></span>
                <span class="folder-count">({{ folder.audioCount }})</span>
              </span>
            </label>
          </div>
          
          <!-- 创建新收藏夹 -->
          <div class="create-folder-section" v-if="showCreateFolder">
            <input 
              v-model="newFolderName" 
              type="text" 
              placeholder="新收藏夹名称"
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
          
          <button 
            class="add-folder-btn" 
            @click="startCreateFolder" 
            v-if="!showCreateFolder"
          >
            <PlusIcon :size="14" />
            新建收藏夹
          </button>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')" :disabled="loading">
          取消
        </button>
        <button class="btn-primary" @click="saveChanges" :disabled="loading">
          {{ loading ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { XIcon, PlusIcon, CheckIcon } from 'lucide-vue-next'
import type { AudioFile } from '@/types/audio'
import { useAudioStore } from '@/store/audio'

interface Props {
  audio: AudioFile
}

interface Emits {
  (e: 'save', updates: Partial<AudioFile>): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const audioStore = useAudioStore()
const newTag = ref('')
const loading = ref(false)
const tagLoading = ref(false)
const selectedFolderId = ref<string | null>(null)
const showCreateFolder = ref(false)
const newFolderName = ref('')
const folderInput = ref<HTMLInputElement | null>(null)

// 使用计算属性获取用户收藏夹和标签
const userFavoriteFolders = computed(() => audioStore.getUserFavoriteFolders)
const currentTags = computed(() => audioStore.getAudioTags(props.audio._id))

const formData = reactive({
  name: props.audio.name
})

// 初始化时加载标签和收藏夹数据
onMounted(async () => {
  try {
    tagLoading.value = true
    // 加载用户收藏夹
    await audioStore.fetchUserFavoriteFolders()
    // 加载当前音频的标签
    await audioStore.fetchAudioTags(props.audio._id)
    
    // 初始化收藏夹选中状态
    initializeFolderSelection()
  } catch (error) {
    console.error('初始化数据失败:', error)
  } finally {
    tagLoading.value = false
  }
})

// 初始化收藏夹选择
const initializeFolderSelection = () => {
  if (props.audio.favorite && props.audio.favorite.isFavorite && props.audio.favorite.folder) {
    selectedFolderId.value = props.audio.favorite.folder._id
  } else {
    selectedFolderId.value = null
  }
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
    const newFolder = await audioStore.createFavoriteFolder({
      name: newFolderName.value.trim(),
      description: '',
      color: getRandomColor()
    })
    
    // 创建成功后自动选中新创建的收藏夹
    selectedFolderId.value = newFolder._id
    showCreateFolder.value = false
    newFolderName.value = ''
  } catch (error) {
    console.error('创建收藏夹失败:', error)
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

const addTag = async () => {
  const tag = newTag.value.trim()
  if (tag && !tagLoading.value) {
    try {
      tagLoading.value = true
      await audioStore.addAudioTag(props.audio._id, tag)
      newTag.value = ''
    } catch (error) {
      console.error('添加标签失败:', error)
    } finally {
      tagLoading.value = false
    }
  }
}

const removeTag = async (tagId: string) => {
  if (!tagLoading.value) {
    try {
      tagLoading.value = true
      await audioStore.removeAudioTag(props.audio._id, tagId)
    } catch (error) {
      console.error('移除标签失败:', error)
    } finally {
      tagLoading.value = false
    }
  }
}

const handleBackspace = () => {
  if (!newTag.value && currentTags.value.length > 0) {
    // 这里可以添加移除最后一个标签的逻辑，但通常用户期望的是删除输入框内容
    // 如果需要实现按退格键删除最后一个标签，可以取消注释下面的代码
    // const lastTag = currentTags.value[currentTags.value.length - 1]
    // removeTag(lastTag._id)
  }
}

const saveChanges = async () => {
  if (loading.value) return
  
  try {
    loading.value = true
    
    // 保存基本信息
    const updates: Partial<AudioFile> = {
      name: formData.name
    }
    await audioStore.updateAudio(props.audio._id, updates)
    
    // 处理收藏夹变更
    const currentFavoriteFolderId = props.audio.favorite && props.audio.favorite.isFavorite 
      ? props.audio.favorite.folder?._id 
      : null
    
    // 如果收藏状态发生变化
    if (currentFavoriteFolderId !== selectedFolderId.value) {
      if (selectedFolderId.value) {
        // 添加到收藏夹
        await audioStore.toggleFavorite(props.audio._id, selectedFolderId.value)
      } else if (currentFavoriteFolderId) {
        // 从收藏夹移除（通过再次调用toggleFavorite来取消收藏）
        await audioStore.toggleFavorite(props.audio._id, currentFavoriteFolderId)
      }
    }
    
    emit('save', updates)
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    loading.value = false
  }
}

// 当音频数据变化时更新表单
watch(() => props.audio, (newAudio) => {
  formData.name = newAudio.name
  initializeFolderSelection()
  
  // 重新加载标签
  audioStore.fetchAudioTags(newAudio._id)
}, { deep: true })
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
  width: 480px;
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
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  min-height: 44px;
  align-items: center;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--primary-color);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-remove:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.tag-remove:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.tag-input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
  min-width: 100px;
}

.tag-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.loading-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.favorite-folders {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.folder-radio {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.3s ease;
}

.folder-radio:hover {
  background: var(--hover-bg);
}

.folder-radio input {
  display: none;
}

.radio-mark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  position: relative;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.folder-radio input:checked + .radio-mark {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.folder-radio input:checked + .radio-mark::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
}

.folder-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.folder-name {
  flex: 1;
}

.folder-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.folder-count {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 创建收藏夹区域 */
.create-folder-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
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

.action-button {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--bg-primary);
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

.add-folder-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  font-size: 13px;
  justify-content: center;
}

.add-folder-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-primary {
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  min-width: 80px;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-secondary {
  padding: 8px 16px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  min-width: 80px;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--hover-bg);
  border-color: var(--text-secondary);
}

.btn-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>