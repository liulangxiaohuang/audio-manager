<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>系统设置</h3>
        <button class="close-button" @click="$emit('close')">
          <XIcon :size="20" />
        </button>
      </div>
      
      <div class="modal-body">
        <div class="settings-section">
          <h4>音频文件夹设置</h4>
          <div class="form-group">
            <label class="form-label">音频文件夹路径</label>
            <div class="path-input-group">
              <input 
                v-model="basePath" 
                type="text" 
                class="form-input"
                placeholder="请输入音频文件夹的完整路径，例如：/Users/username/Music"
              />
              <!-- <button class="btn-secondary" @click="browseFolder">
                浏览
              </button> -->
            </div>
            <p class="form-hint">
              设置您的音频根目录，系统会扫描该目录下所有音频文件
            </p>
            <p class="form-hint">
              请确保该文件夹包含您的音频文件（支持 MP3、WAV、OGG、FLAC 等格式）
            </p>
          </div>
          
          <div class="current-status">
            <h5>当前状态</h5>
            <div class="status-item">
              <span class="status-label">配置状态：</span>
              <span class="status-value" :class="statusClass">
                {{ statusMessage }}
              </span>
            </div>
            <div class="status-item" v-if="currentPath">
              <span class="status-label">当前路径：</span>
              <span class="status-value">{{ currentPath }}</span>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h4>同步设置</h4>
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="autoSync"
              />
              <span class="checkmark"></span>
              启动时自动同步音频文件
            </label>
          </div>
          
          <div class="sync-actions">
            <button 
              class="btn-primary" 
              @click="saveAndSync"
              :disabled="!basePath || saving"
            >
              <RefreshCwIcon v-if="saving" :size="16" class="spinning" />
              {{ saving ? '保存中...' : '保存并同步' }}
            </button>
            <button 
              class="btn-secondary" 
              @click="testPath"
              :disabled="!basePath"
            >
              测试路径
            </button>
          </div>
        </div>

        <div class="settings-section">
          <h4>应用设置</h4>
          <div class="form-group">
            <label class="form-label">默认收藏夹</label>
            <select v-model="defaultFavoriteFolder" class="form-select">
              <option value="default">默认收藏夹</option>
              <option value="work">工作音频</option>
              <option value="music">音乐</option>
              <option value="recordings">录音</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="autoPlay"
              />
              <span class="checkmark"></span>
              点击音频时自动播放
            </label>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">
          取消
        </button>
        <button class="btn-primary" @click="saveSettings" :disabled="saving">
          {{ saving ? '保存中...' : '保存设置' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { XIcon, RefreshCwIcon } from 'lucide-vue-next'
import { configApi } from '@/services/api'

interface Emits {
  (e: 'close'): void
  (e: 'synced'): void
}

const emit = defineEmits<Emits>()

const basePath = ref('')
const currentPath = ref('')
const autoSync = ref(true)
const autoPlay = ref(true)
const defaultFavoriteFolder = ref('default')
const saving = ref(false)
const statusMessage = ref('未配置')
const statusClass = ref('status-warning')

// 加载当前配置
const loadCurrentConfig = async () => {
  try {
    const response = await configApi.getBasePath()
    if (response.data.basePath) {
      basePath.value = response.data.basePath
      currentPath.value = response.data.basePath
      statusMessage.value = '已配置'
      statusClass.value = 'status-success'
    }
  } catch (error) {
    console.error('Failed to load config:', error)
    statusMessage.value = '加载配置失败'
    statusClass.value = 'status-error'
  }
}

// 浏览文件夹（模拟功能）
const browseFolder = () => {
  // 在实际应用中，这里可能会调用 Electron 的对话框或其他文件选择API
  // 这里我们简单模拟一个路径
  const examplePaths = [
    '/Users/username/Music',
    '/home/username/Music',
    'C:\\Users\\username\\Music'
  ]
  const randomPath = examplePaths[Math.floor(Math.random() * examplePaths.length)]
  basePath.value = randomPath
}

// 测试路径
const testPath = async () => {
  if (!basePath.value) return
  
  saving.value = true
  try {
    // 这里应该调用后端API测试路径有效性
    // 暂时模拟成功
    await new Promise(resolve => setTimeout(resolve, 1000))
    statusMessage.value = '路径有效'
    statusClass.value = 'status-success'
  } catch (error) {
    statusMessage.value = '路径无效或无法访问'
    statusClass.value = 'status-error'
  } finally {
    saving.value = false
  }
}

// 保存设置
const saveSettings = async () => {
  if (!basePath.value) {
    statusMessage.value = '请先设置音频文件夹路径'
    statusClass.value = 'status-error'
    return
  }

  saving.value = true
  try {
    // 先测试路径
    statusMessage.value = '正在验证路径...'
    statusClass.value = 'status-warning'
    
    await configApi.setBasePath(basePath.value)
    
    statusMessage.value = '路径设置成功，正在同步文件...'
    currentPath.value = basePath.value
    
    // 保存其他设置到 localStorage
    localStorage.setItem('audioManager_autoSync', autoSync.value.toString())
    localStorage.setItem('audioManager_autoPlay', autoPlay.value.toString())
    localStorage.setItem('audioManager_defaultFavoriteFolder', defaultFavoriteFolder.value)
    
    // 触发同步
    emit('synced')
    
    statusMessage.value = '设置已保存并开始同步'
    statusClass.value = 'status-success'
    
    // 延迟关闭让用户看到成功消息
    setTimeout(() => {
      emit('close')
    }, 2000)
  } catch (error: any) {
    console.error('Failed to save settings:', error)
    const errorMsg = error.response?.data?.message || error.message || '保存失败'
    statusMessage.value = `保存失败: ${errorMsg}`
    statusClass.value = 'status-error'
  } finally {
    saving.value = false
  }
}

// 保存并同步
const saveAndSync = async () => {
  await saveSettings()
  // synced 事件会在保存成功后自动触发
}

// 加载保存的设置
const loadSavedSettings = () => {
  const savedAutoSync = localStorage.getItem('audioManager_autoSync')
  const savedAutoPlay = localStorage.getItem('audioManager_autoPlay')
  const savedDefaultFolder = localStorage.getItem('audioManager_defaultFavoriteFolder')
  
  if (savedAutoSync) autoSync.value = savedAutoSync === 'true'
  if (savedAutoPlay) autoPlay.value = savedAutoPlay === 'true'
  if (savedDefaultFolder) defaultFavoriteFolder.value = savedDefaultFolder
}

onMounted(() => {
  loadCurrentConfig()
  loadSavedSettings()
})
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
  width: 600px;
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
  max-height: 53vh;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
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

.form-input,
.form-select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.path-input-group {
  display: flex;
  gap: 8px;
}

.path-input-group .form-input {
  flex: 1;
}

.form-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  margin-bottom: 0;
}

.current-status {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}

.current-status h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-item {
  display: flex;
  margin-bottom: 8px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 80px;
}

.status-value {
  font-size: 14px;
  font-weight: 500;
}

.status-success {
  color: var(--success-color);
}

.status-warning {
  color: var(--warning-color);
}

.status-error {
  color: var(--error-color);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}

.checkbox-label input {
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

.checkbox-label input:checked + .checkmark {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-label input:checked + .checkmark::after {
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

.sync-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.btn-primary,
.btn-secondary {
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

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}
</style>