<template>
  <div class="waveform-display" @click="handleClick">
    <div class="waveform-bars">
      <div 
        v-for="(value, index) in normalizedWaveform" 
        :key="index"
        class="waveform-bar"
        :class="{ 
          'active': isActiveBar(index),
          'playing': isPlaying && isActiveBar(index)
        }"
        :style="{ height: value + '%' }"
      ></div>
    </div>
    
    <div class="progress-overlay" :style="{ width: progress + '%' }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  waveform: number[]
  isPlaying?: boolean
  progress?: number
  clickToPlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false,
  progress: 0,
  clickToPlay: true
})

const emit = defineEmits(['play', 'pause'])

// 归一化波形数据
const normalizedWaveform = computed(() => {
  if (!props.waveform || props.waveform.length === 0) {
    // 生成默认波形数据
    return Array.from({ length: 40 }, () => Math.random() * 60 + 20)
  }
  
  const max = Math.max(...props.waveform)
  const min = Math.min(...props.waveform)
  const range = max - min || 1
  
  return props.waveform.map(value => 
    ((value - min) / range) * 60 + 20 // 20-80% 高度范围
  )
})

const isActiveBar = (index: number) => {
  const totalBars = normalizedWaveform.value.length
  const activeIndex = Math.floor((props.progress / 100) * totalBars)
  return index <= activeIndex
}

const handleClick = () => {
  if (props.clickToPlay) {
    if (props.isPlaying) {
      emit('pause')
    } else {
      emit('play')
    }
  }
}
</script>

<style scoped>
.waveform-display {
  position: relative;
  height: 32px;
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-secondary);
  transition: all 0.2s ease;
}

.waveform-display:hover {
  background: var(--hover-bg);
}

.waveform-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 100%;
  padding: 4px 8px;
  position: relative;
  z-index: 2;
  gap: 1px;
}

.waveform-bar {
  flex: 1;
  background: var(--wave-color);
  border-radius: 1px;
  min-height: 2px;
  transition: all 0.3s ease;
  position: relative;
}

.waveform-bar.active {
  background: var(--primary-color);
  opacity: 0.7;
}

.waveform-bar.playing {
  background: var(--primary-color);
  opacity: 1;
}

.progress-overlay {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, rgba(var(--primary-color-rgb), 0.1) 0%, rgba(var(--primary-color-rgb), 0.05) 100%);
  z-index: 1;
  transition: width 0.1s ease;
  pointer-events: none;
  border-radius: 6px;
}
</style>