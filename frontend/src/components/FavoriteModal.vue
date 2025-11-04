<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>添加到收藏夹</h3>
        <button class="close-button" @click="$emit('close')">
          <XIcon :size="20" />
        </button>
      </div>
      
      <div class="modal-body">
        <div class="favorite-folders" v-if="isFavorite">
          <p><b>{{ filename }}</b> 已被收藏在 <b>{{ selectedFolder }}</b></p>
          <p style="padding-top: 10px;">确定要取消收藏么？</p>
        </div>
        <div class="favorite-folders" v-else>
          <h4>选择收藏夹</h4>
          <div class="folders-list">
            <label 
              v-for="folder in availableFolders" 
              :key="folder.id"
              class="folder-radio"
            >
              <input 
                type="radio" 
                :value="folder.id"
                v-model="selectedFolder"
              />
              <span class="radio-checkmark"></span>
              <div class="folder-info">
                <span class="folder-name">{{ folder.name }}</span>
                <span class="folder-count">{{ folder.count }} 个音频</span>
              </div>
            </label>
          </div>
        </div>
        
        <div class="new-folder-section" v-if="!isFavorite">
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
        <button class="btn-secondary" @click="$emit('close')">
          取消
        </button>
        <button 
          class="btn-primary" 
          @click="confirmFavorite"
          :disabled="!selectedFolder"
        >
          {{ isFavorite ? '取消收藏' : '添加到收藏' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { XIcon } from 'lucide-vue-next'
import { useAudioStore } from '@/store/audio'

interface Props {
  audioId: string,
  isFavorite: boolean,
  filename: string,
  currentFolders: string[]
}

interface Emits {
  (e: 'close'): void
  (e: 'favorite', folderId: string): void
  (e: 'create-folder', folderName: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const audioStore = useAudioStore()
const selectedFolder = ref('default')
const newFolderName = ref('')

// 可用的收藏夹列表
const availableFolders = computed(() => {
  return audioStore.favoriteFolders.map(folder => ({
    ...folder,
    count: audioStore.favorites.filter(audio =>
      audio.favoriteFolders.includes(folder.id)
    ).length
  }))
})

onMounted(() => {
  // 如果音频已经在某个收藏夹中，默认选中第一个收藏夹
  if (props.currentFolders.length > 0) {
    selectedFolder.value = props.currentFolders[0]
  }
})

const createNewFolder = () => {
  if (!newFolderName.value.trim()) return
  
  const newFolder = {
    id: newFolderName.value.trim().toLowerCase().replace(/\s+/g, '-'),
    name: newFolderName.value.trim(),
    count: 0
  }
  
  // 添加到收藏夹列表
  audioStore.favoriteFolders.push(newFolder)
  
  // 选中新创建的收藏夹
  selectedFolder.value = newFolder.id
  
  // 清空输入框
  newFolderName.value = ''
  
  emit('create-folder', newFolder.name)
}

const confirmFavorite = () => {
  emit('favorite', selectedFolder.value)
  emit('close')
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

.folder-radio:hover {
  border-color: var(--primary-color);
  background: var(--hover-bg);
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

.folder-radio input:checked + .radio-checkmark {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.folder-radio input:checked + .radio-checkmark::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 4px;
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
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
</style>