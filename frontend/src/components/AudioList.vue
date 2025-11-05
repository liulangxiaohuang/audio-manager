<template>
  <div class="audio-list-container">
    <div class="audio-list">
      <AudioListItem 
        v-for="audio in audios" 
        :key="audio._id" 
        :audio="audio"
        :show-checkbox="showCheckbox"
        :selected="selectedAudios?.has(audio._id)"
        @select="$emit('select', audio)"
        @play="handlePlay"
        @pause="handlePause"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import AudioListItem from './AudioListItem.vue'
import type { AudioFile } from '@/types/audio'
import { useAudioStore } from '@/store/audio'

interface Props {
  audios: AudioFile[]
  selectedAudios?: Set<string>
  showCheckbox?: boolean
}

interface Emits {
  (e: 'select', audio: AudioFile): void
  (e: 'play', audio: AudioFile): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const audioStore = useAudioStore()

const handlePlay = (audio: AudioFile) => {
  emit('play', audio)
}

const handlePause = () => {
  // 暂停逻辑已经在 store 中处理
}
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
</style>