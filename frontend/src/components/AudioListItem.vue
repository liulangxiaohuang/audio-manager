<template>
  <div 
    class="audio-list-item" 
    :class="{ 
      'is-playing': isCurrentlyPlaying, 
      'is-favorite': audio.favoriteFolders.length > 0,
      'selected': selected
    }"
  >
    <div class="item-select" v-if="showCheckbox">
      <input 
        type="checkbox" 
        :checked="selected"
        @click.stop="$emit('select', audio)"
      />
    </div>
    
    <div class="item-content" @click="handleItemClick">
      <div class="audio-info">
        <div class="audio-header">
          <div class="audio-name">{{ audio.name }}</div>
        </div>
        
        <div class="audio-meta">
          <div class="audio-tags">
            <span class="format">{{ audio.format.toUpperCase() }}</span>
            <span 
              v-for="tag in audio.tags" 
              :key="tag" 
              class="tag"
            >
              {{ tag.tag }}
            </span>
          </div>
        </div>
      </div>

      <div class="audio-time">
        <span class="current-time">{{ formattedCurrentTime }}</span>
        <span class="time-separator">/</span>
        <span class="total-time">{{ formattedDuration }}</span>
      </div>
      
      <div class="audio-controls">
        <div class="waveform-container" @click.stop>
          <CanvasWaveform 
            :waveform="audio.waveform"
            :is-playing="isCurrentlyPlaying"
            :progress="playProgress"
            @play="handlePlay"
            @pause="handlePause"
            @seek="handleSeek"
          />
        </div>
        
        <div class="item-actions" @click.stop>
          <button 
            @click="showFavoriteModal = true"
            class="action-btn favorite-btn"
            :class="{ 'is-favorite': audio.favorite.isFavorite }"
            :title="audio.favorite.isFavorite ? '取消收藏' : '收藏'"
          >
            <StarIcon :size="16" />
          </button>

          <button 
            @click="handleDownload" 
            class="action-btn"
            title="下载"
          >
            <ArrowDownFromLineIcon :size="16" />
          </button>
          
          <button 
            v-if="audioStore.isAdmin"
            @click="showEditModal = true" 
            class="action-btn"
            title="编辑"
          >
            <Edit3Icon :size="16" />
          </button>
          
          <button 
            v-if="audioStore.isAdmin"
            @click="showDeleteConfirm = true" 
            class="action-btn delete-btn"
            title="删除"
          >
            <Trash2Icon :size="16" />
          </button>
        </div>
      </div>
    </div>
    
    <EditAudioModal 
      v-if="showEditModal"
      :audio="audio"
      @save="handleSave"
      @close="showEditModal = false"
    />

    <FavoriteModal 
      v-if="showFavoriteModal"
      :audioId="audio._id"
      :isFavorite="audio.isFavorite"
      :filename="audio.name"
      :currentFolders="audio.favoriteFolders"
      @close="showFavoriteModal = false"
      @favorite="handleFavorite"
      @create-folder="handleCreateFolder"
    />

    <ConfirmModal 
      v-if="showDeleteConfirm"
      title="删除音频"
      :message="`确定要删除音频 ${audio.name} 吗？此操作不可撤销。`"
      confirm-text="删除"
      @close="showDeleteConfirm = false"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { StarIcon, Edit3Icon, Trash2Icon, ArrowDownFromLineIcon } from 'lucide-vue-next'
import axios from 'axios'
import CanvasWaveform from './CanvasWaveform.vue'
import EditAudioModal from './EditAudioModal.vue'
import FavoriteModal from './FavoriteModal.vue'
import ConfirmModal from './ConfirmModal.vue'
import type { AudioFile } from '@/types/audio'
import { useAudioStore } from '@/store/audio'
import { audioPlayer } from '@/utils/audioPlayer'

interface Props {
  audio: AudioFile
  showCheckbox?: boolean
  selected?: boolean
}

interface Emits {
  (e: 'select', audio: AudioFile): void
  (e: 'play', audio: AudioFile): void
  (e: 'pause'): void
  // (e: 'seek', progress: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const audioStore = useAudioStore()
const showEditModal = ref(false)
const playProgress = ref(0)
const showFavoriteModal = ref(false)
const showDeleteConfirm = ref(false)
const currentTime = ref(0)

// 计算当前是否正在播放
const isCurrentlyPlaying = computed(() => {
  return audioStore.currentPlayingId === props.audio._id && 
    audioPlayer.isPlaying(props.audio._id)
})

// 修复：改进的时间格式化，避免 NaN
const formattedCurrentTime = computed(() => {
  if (isNaN(currentTime.value) || !isFinite(currentTime.value)) {
    return '00:00'
  }
  
  const minutes = Math.floor(currentTime.value / 60)
  const seconds = Math.floor(currentTime.value % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

const formattedDuration = computed(() => {
  const duration = props.audio.duration || 0
  if (duration === 0 || isNaN(duration)) {
    return '--:--'
  }
  
  const minutes = Math.floor(duration / 60)
  const seconds = Math.floor(duration % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// 注册音频播放器回调
onMounted(() => {
  // 设置进度回调
  audioPlayer.onProgress(props.audio._id, (audioId: string, progress: number, time: number) => {
    if (audioId === props.audio._id) {
      playProgress.value = isNaN(progress) ? 0 : progress
      currentTime.value = isNaN(time) ? 0 : time
    }
  })
  
  // 设置暂停回调
  audioPlayer.onPause(props.audio._id, (audioId: string) => {
    if (audioId === props.audio._id) {
      // 暂停时更新当前时间
      currentTime.value = audioPlayer.getSavedProgress(audioId)
    }
  })
  
  // 设置结束回调
  audioPlayer.onEnd(props.audio._id, (audioId: string) => {
    if (audioId === props.audio._id) {
      playProgress.value = 0
      currentTime.value = 0
    }
  })
  
  // 新增：重置状态回调
  audioPlayer.onReset(props.audio._id, (audioId: string) => {
    if (audioId === props.audio._id) {
      console.log('重置音频状态:', props.audio.name)
      playProgress.value = 0
      currentTime.value = 0
    }
  })
  
  // 初始化时检查是否有保存的进度
  const savedTime = audioPlayer.getSavedProgress(props.audio._id)
  if (savedTime > 0) {
    currentTime.value = savedTime
    const duration = props.audio.duration || 1
    playProgress.value = (savedTime / duration) * 100
  }
})

onUnmounted(() => {
  // 清理回调
  audioPlayer.removeCallbacks(props.audio._id)
})


// 新增：处理进度跳转
// 修复：处理进度跳转时的播放状态
const handleSeek = (progress: number) => {
  console.log('跳转到进度:', progress)
  
  // 执行跳转
  audioStore.seekAudio(props.audio._id, progress)
  
  // 关键修复：跳转后总是播放，不管之前是什么状态
  // 但如果当前正在播放的是其他音频，先停止它
  if (audioStore.currentPlayingId && audioStore.currentPlayingId !== props.audio._id) {
    audioStore.stopAudio()
  }
  
  // 开始播放当前音频
  audioStore.playAudio(props.audio)
}

const handleDeleteConfirm = () => {
  audioStore.deleteAudio(props.audio._id)
  showDeleteConfirm.value = false
}

const handleFavorite = async (folderId: string) => {
  await audioStore.toggleFavorite(props.audio._id, folderId)
  showFavoriteModal.value = false
}

const handleCreateFolder = (folderName: string) => {
  console.log('创建了新收藏夹:', folderName)
}

const handleItemClick = (event: Event) => {
  const target = event.target as HTMLElement
  
  // 排除以下元素的点击：
  // - 复选框区域
  // - 波形图区域（由波形图组件自己处理）
  // - 操作按钮区域
  if (target.closest('.item-select') || 
      target.closest('.waveform-container') || 
      target.closest('.item-actions')) {
    return
  }
  
  // 只有点击音频信息区域才触发播放/暂停
  if (isCurrentlyPlaying.value) {
    handlePause()
  } else {
    handlePlay()
  }
}

const handlePlay = () => {
  console.log('播放音频:', props.audio.name)
  audioStore.playAudio(props.audio)
  emit('play', props.audio)
}

const handlePause = () => {
  console.log('暂停音频:', props.audio.name)
  audioStore.pauseAudio()
  emit('pause')
}

const toggleFavorite = () => {
  audioStore.toggleFavorite(props.audio._id)
}

const handleSave = (updates: Partial<AudioFile>) => {
  audioStore.updateAudio(props.audio._id, updates)
  showEditModal.value = false
}

const handleDelete = () => {
  if (confirm('确定要删除这个音频吗？')) {
    audioStore.deleteAudio(props.audio._id)
  }
}

const handleDownload = () => {
  const url = `${location.protocol}//${location.host}`
  console.log(props.audio, url)
  downloadByFrontend(url + props.audio.url, props.audio.filename)
}

const downloadByFrontend = (url: string, filename?: string) => {
  downloadByAxios(url, filename)
};

const downloadByAxios = async (url: string, filename?: string) => {
  try {
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'User-Action': 'Download'
      }
    });

    // 创建 blob URL
    const blobUrl = URL.createObjectURL(response.data);
    
    // 创建隐藏的 a 标签进行下载
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || url.split('/').pop() || 'audio';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 释放 blob URL 内存
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('下载失败:', error);
  }
};

// 监听播放状态变化，确保进度正确显示
watch(isCurrentlyPlaying, (newVal) => {
  console.log(`音频 ${props.audio.name} 播放状态:`, newVal)
  if (newVal) {
    // 确保进度正确显示
    const savedTime = audioPlayer.getSavedProgress(props.audio._id)
    currentTime.value = savedTime
    const duration = props.audio.duration || 1
    playProgress.value = (savedTime / duration) * 100
  }
})

// 在音频列表组件中添加波形数据调试
watch(() => props.audio.waveform, (newWaveform) => {
  if (newWaveform && newWaveform.length > 0) {
    console.log(`音频 "${props.audio.name}" 的波形数据:`, {
      length: newWaveform.length,
      data: newWaveform,
      stats: {
        max: Math.max(...newWaveform),
        min: Math.min(...newWaveform),
        firstQuarter: newWaveform.slice(0, 10),
        lastQuarter: newWaveform.slice(-10)
      }
    })
  }
}, { immediate: true })

// 监听进度更新
watch(playProgress, (newProgress) => {
  console.log(`音频 ${props.audio.name} 进度更新:`, {
    progress: newProgress,
    currentTime: currentTime.value,
    isPlaying: isCurrentlyPlaying.value
  })
})
</script>

<style scoped>
.audio-list-item {
  display: flex;
  align-items: center;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  border-left: none;
  border-right: none;
  background: var(--card-bg);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  padding: 12px 16px;
  margin-bottom: -1px; /* 让边框重叠 */
}

.audio-list-item:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  border-top: none;
}

.audio-list-item:last-child {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  margin-bottom: 0;
  border-bottom: 0;
}

.audio-list-item:hover {
  background: var(--hover-bg);
}

.audio-list-item.is-playing {
  background: var(--primary-light);
}

.audio-list-item.selected {
  background: var(--primary-light);
}

.audio-list-item.is-favorite {
  /* border-left: 4px solid var(--warning-color); */
}

.item-select {
  margin-right: 16px;
  flex-shrink: 0;
}

.item-select input {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.item-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.audio-info {
  flex: 1;
  min-width: 0;
}

.audio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.audio-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  overflow: hidden;
  white-space: break-spaces;
  text-overflow: ellipsis;
}

.audio-duration {
  font-size: 13px;
  color: var(--text-secondary);
  margin-left: 12px;
  flex-shrink: 0;
}

.audio-meta {
  display: flex;
  align-items: center;
}

.audio-tags {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.audio-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-left: 12px;
  flex-shrink: 0;
}

.current-time {
  color: var(--primary-color);
  font-weight: 500;
}

.time-separator {
  color: var(--text-secondary);
}

.total-time {
  color: var(--text-secondary);
}

.tag {
  background: var(--tag-bg);
  color: var(--tag-color);
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
}

.format {
  font-size: 11px;
  color: var(--format-color);
  background: var(--format-tag-bg);
  padding: 2px 6px;
  border-radius: 2px;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.waveform-container {
  width: 300px;
  /* 确保波形图容器不干扰其他元素的点击 */
  pointer-events: none; /* 让波形图组件自己处理点击 */
}
.waveform-container > * {
  pointer-events: auto; /* 但允许波形图组件接收点击 */
}

.item-actions {
  display: flex;
  gap: 4px;
  pointer-events: auto; /* 确保按钮可以点击 */
}

.action-btn {
  padding: 6px;
  border: none;
  background: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.favorite-btn.is-favorite {
  color: var(--warning-color);
}

.delete-btn:hover {
  color: var(--error-color);
  background: rgba(239, 68, 68, 0.1);
}
</style>