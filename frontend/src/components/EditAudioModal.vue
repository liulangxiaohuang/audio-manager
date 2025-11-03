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
              v-for="tag in formData.tags" 
              :key="tag" 
              class="tag"
            >
              {{ tag }}
              <button @click="removeTag(tag)" class="tag-remove">
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
            />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">收藏夹</label>
          <div class="favorite-folders">
            <label 
              v-for="folder in favoriteFolders" 
              :key="folder.id"
              class="folder-checkbox"
            >
              <input 
                type="checkbox" 
                :value="folder.id"
                v-model="formData.favoriteFolders"
              />
              <span class="checkmark"></span>
              {{ folder.name }}
            </label>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">
          取消
        </button>
        <button class="btn-primary" @click="saveChanges">
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { XIcon } from 'lucide-vue-next'
import type { AudioFile } from '@/types/audio'

interface Props {
  audio: AudioFile
}

interface Emits {
  (e: 'save', updates: Partial<AudioFile>): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const newTag = ref('')
const formData = reactive({
  name: props.audio.name,
  tags: [...props.audio.tags],
  favoriteFolders: [...props.audio.favoriteFolders]
})

const favoriteFolders = [
  { id: 'default', name: '默认收藏夹' },
  { id: 'work', name: '工作音频' },
  { id: 'music', name: '音乐' },
  { id: 'recordings', name: '录音' }
]

const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !formData.tags.includes(tag)) {
    formData.tags.push(tag)
    newTag.value = ''
  }
}

const removeTag = (tag: string) => {
  formData.tags = formData.tags.filter(t => t !== tag)
}

const handleBackspace = () => {
  if (!newTag.value && formData.tags.length > 0) {
    formData.tags.pop()
  }
}

const saveChanges = () => {
  const updates: Partial<AudioFile> = {
    name: formData.name,
    tags: formData.tags,
    favoriteFolders: formData.favoriteFolders
  }
  emit('save', updates)
}

// 当音频数据变化时更新表单
watch(() => props.audio, (newAudio) => {
  formData.name = newAudio.name
  formData.tags = [...newAudio.tags]
  formData.favoriteFolders = [...newAudio.favoriteFolders]
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

.tag-remove:hover {
  background: rgba(255, 255, 255, 0.2);
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

.favorite-folders {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.folder-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}

.folder-checkbox input {
  display: none;
}

.checkmark {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  position: relative;
  transition: all 0.3s ease;
}

.folder-checkbox input:checked + .checkmark {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.folder-checkbox input:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
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
}

.btn-primary:hover {
  opacity: 0.9;
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
}

.btn-secondary:hover {
  background: var(--hover-bg);
  border-color: var(--text-secondary);
}
</style>