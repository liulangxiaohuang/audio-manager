<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3>同步音频文件</h3>
      </div>
      
      <div class="modal-body">
        <div class="sync-progress">
          <div class="spinner"></div>
          <p>正在扫描音频文件夹，请稍候...</p>
          <p class="sync-detail">这可能需要几分钟时间，具体取决于音频文件的数量和文件夹结构</p>
          
          <div class="debug-info" v-if="showDebug">
            <p><strong>当前状态:</strong> {{ syncStatus }}</p>
            <p><strong>已扫描:</strong> {{ scannedCount }} 个文件</p>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" @click="cancelSync" :disabled="!cancellable">
          取消
        </button>
        
        <button class="btn-info" @click="toggleDebug">
          {{ showDebug ? '隐藏详情' : '显示详情' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const cancellable = ref(true)
const showDebug = ref(false)
const syncStatus = ref('初始化...')
const scannedCount = ref(0)

// 模拟扫描进度更新（在实际应用中，这应该通过 WebSocket 或轮询从后端获取）
const updateProgress = () => {
  const statuses = [
    '扫描根目录...',
    '处理音频文件...',
    '生成波形数据...',
    '更新数据库...',
    '完成扫描...'
  ]
  
  let index = 0
  const interval = setInterval(() => {
    if (index < statuses.length) {
      syncStatus.value = statuses[index]
      scannedCount.value += Math.floor(Math.random() * 10) + 5
      index++
    } else {
      clearInterval(interval)
    }
  }, 1000)
  
  return interval
}

let progressInterval: number

onMounted(() => {
  progressInterval = updateProgress()
})

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
})

const cancelSync = () => {
  // 取消同步逻辑
  console.log('取消同步')
  if (progressInterval) {
    clearInterval(progressInterval)
  }
}

const toggleDebug = () => {
  showDebug.value = !showDebug.value
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
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  padding: 20px 24px 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
}

.sync-progress {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.sync-progress p {
  margin: 0 0 8px;
  color: var(--text-primary);
}

.sync-detail {
  font-size: 14px;
  color: var(--text-secondary) !important;
}

.modal-footer {
  padding: 0 24px 20px;
  display: flex;
  justify-content: flex-end;
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

.btn-secondary:hover:not(:disabled) {
  background: var(--hover-bg);
  border-color: var(--text-secondary);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.debug-info {
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 12px;
  text-align: left;
}

.debug-info p {
  margin: 4px 0;
}

.btn-info {
  padding: 8px 16px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  margin-left: 15px;
}

.btn-info:hover {
  background: var(--hover-bg);
  border-color: var(--text-secondary);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>