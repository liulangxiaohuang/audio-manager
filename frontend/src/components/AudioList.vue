<template>
  <div class="action-buttons" v-if="audios.length">
    <!-- 多选模式开关 -->
    <button 
      class="btn-secondary" 
      @click="toggleMultiSelect"
      :class="{ 'active': showCheckbox }"
    >
      <CheckSquareIcon :size="16" />
      {{ showCheckbox ? '退出多选' : '多选' }}
    </button>

    <!-- 全选按钮，只在多选模式下显示 -->
    <button 
      v-if="showCheckbox" 
      class="btn-secondary" 
      @click="selectAll"
    >
      <CheckIcon :size="16" />
      {{ selectedItems.size === allSelectableItems.length ? '取消全选' : '全选' }}
    </button>
    
    <button 
      v-if="showCheckbox && selectedItems.size > 0" 
      class="btn-primary"
      @click="batchAddToFavorites"
    >
      <StarIcon :size="16" />
      批量收藏 ({{ selectedItems.size }})
    </button>
    
    <button 
      v-if="showCheckbox && selectedItems.size > 0 && hasSelectedAudios" 
      class="btn-danger"
      @click="batchDelete"
    >
      <Trash2Icon :size="16" />
      批量删除 ({{ selectedAudioCount }})
    </button>
  </div>

  <div class="audio-list-container" v-if="audios.length">
    <div class="audio-list">
      <AudioListItem 
        v-for="audio in audios" 
        :key="audio._id" 
        :audio="audio"
        :show-checkbox="showCheckbox"
        :selected="selectedItems?.has(audio._id)"
        @select="toggleSelect(audio)"
        @play="handlePlay"
        @pause="handlePause"
      />
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { 
  StarIcon, 
  Trash2Icon,
  CheckSquareIcon,
  CheckIcon
} from 'lucide-vue-next'
import AudioListItem from './AudioListItem.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import type { AudioFile } from '@/types/audio'
import { useAudioStore } from '@/store/audio'

interface Props {
  audios: AudioFile[]
}

interface Emits {
  (e: 'select', audio: AudioFile): void
  (e: 'play', audio: AudioFile): void
}

const audioStore = useAudioStore()

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedItems = ref<Set<string>>(new Set())
const showCheckbox = ref(false)
const showDeleteConfirm = ref(false)

const handlePlay = (audio: AudioFile) => {
  // emit('play', audio)
  // play逻辑已经在 item 中处理过
}

const handlePause = () => {
  // 暂停逻辑已经在 store 中处理
}

const allSelectableItems = computed(() => {
  return [...props.audios]
})

const hasSelectedAudios = computed(() => {
  return Array.from(selectedItems.value).some(id => 
    props.audios.some(audio => audio._id === id)
  )
})

const selectedAudioCount = computed(() => {
  return Array.from(selectedItems.value).filter(id => 
    props.audios.some(audio => audio._id === id)
  ).length
})

const toggleMultiSelect = () => {
  showCheckbox.value = !showCheckbox.value
  if (!showCheckbox.value) {
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
    const audio = props.audios.find(a => a._id === audioId)
    if (audio) {
      audioStore.toggleFavorite(audioId, 'default')
    }
  })
  selectedItems.value.clear()
}

const batchDelete = () => {
  showDeleteConfirm.value = true
}

const handleDeleteConfirm = () => {
  selectedItems.value.forEach(audioId => {
    audioStore.deleteAudio(audioId)
  })
  selectedItems.value.clear()
  showDeleteConfirm.value = false
}

// 监听搜索状态变化
watch(() => audioStore.searchQuery, async (newQuery) => {
  if (newQuery) {
    // 搜索状态下，清除多选模式
    showCheckbox.value = false
    selectedItems.value.clear()
  }
})
</script>

<style scoped>
.audio-list-container {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-bg);
}

.audio-list {
  display: flex;
  flex-direction: column;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 10px;
}

.btn-secondary,
.btn-primary,
.btn-danger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
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
</style>