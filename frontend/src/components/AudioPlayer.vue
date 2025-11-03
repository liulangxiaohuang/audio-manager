<template>
  <div class="audio-player" :class="{ 'is-playing': isPlaying }">
    <div class="player-controls">
      <button @click="togglePlay" class="play-button">
        <Play v-if="!isPlaying" />
        <Pause v-else />
      </button>
      
      <div class="track-info">
        <div class="track-name">{{ audio.name }}</div>
        <div class="track-duration">{{ formattedDuration }}</div>
      </div>
    </div>
    
    <div class="waveform-container">
      <div ref="waveformRef" class="waveform"></div>
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause } from 'lucide-vue-next';
import type { AudioFile } from '@/types/audio';

interface Props {
  audio: AudioFile;
}

const props = defineProps<Props>();

const waveformRef = ref<HTMLDivElement>();
const wavesurfer = ref<WaveSurfer | null>(null);
const isPlaying = ref(false);
const progress = ref(0);

const formattedDuration = computed(() => {
  const minutes = Math.floor(props.audio.duration / 60);
  const seconds = Math.floor(props.audio.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

onMounted(() => {
  if (waveformRef.value) {
    wavesurfer.value = WaveSurfer.create({
      container: waveformRef.value,
      waveColor: 'var(--wave-color)',
      progressColor: 'var(--primary-color)',
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 60,
      normalize: true,
      partialRender: true
    });

    wavesurfer.value.load(props.audio.url);

    wavesurfer.value.on('play', () => {
      isPlaying.value = true;
    });

    wavesurfer.value.on('pause', () => {
      isPlaying.value = false;
    });

    wavesurfer.value.on('timeupdate', (currentTime: number) => {
      progress.value = (currentTime / props.audio.duration) * 100;
    });
  }
});

onUnmounted(() => {
  if (wavesurfer.value) {
    wavesurfer.value.destroy();
  }
});

const togglePlay = () => {
  if (wavesurfer.value) {
    wavesurfer.value.playPause();
  }
};
</script>

<style scoped>
.audio-player {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  background: var(--card-bg);
  transition: all 0.3s ease;
}

.audio-player.is-playing {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.play-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.play-button:hover {
  transform: scale(1.05);
}

.track-info {
  flex: 1;
}

.track-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.track-duration {
  font-size: 12px;
  color: var(--text-secondary);
}

.waveform-container {
  position: relative;
  width: 100%;
}

.waveform {
  width: 100%;
}

.progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, 
    var(--primary-color) 0%, 
    rgba(var(--primary-color-rgb), 0.3) 100%);
  pointer-events: none;
  border-radius: 4px;
  transition: width 0.1s ease;
}
</style>