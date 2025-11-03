<template>
  <div class="canvas-waveform" @click="handleClick">
    <canvas ref="canvasRef" :width="width" :height="height"></canvas>
    
    <div class="play-overlay" v-if="showOverlay">
      <div class="play-icon">
        <PauseIcon v-if="isPlaying" :size="14" />
        <PlayIcon v-else :size="14" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { PlayIcon, PauseIcon } from 'lucide-vue-next'

const BAR_COUNT = 1000

interface Props {
  waveform: number[]
  isPlaying?: boolean
  progress?: number
  width?: number
  height?: number
  clickToPlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false,
  progress: 0,
  width: 300,
  height: 20, // 进一步降低高度
  clickToPlay: true
})

const emit = defineEmits(['play', 'pause', 'seek'])

const canvasRef = ref<HTMLCanvasElement>()
const showOverlay = ref(false)
const ctx = ref<CanvasRenderingContext2D>()

// 计算属性：波形数据归一化
const normalizedWaveform = computed(() => {
  if (!props.waveform || props.waveform.length === 0) {
    return generateDefaultWaveform()
  }
  
  return normalizeWaveformData(props.waveform)
})

// 计算属性：波形条布局信息 - 极细的线条
const waveformLayout = computed(() => {
  const barCount = normalizedWaveform.value.length
  // 极小的间隔
  const spacing = 0.1
  const availableWidth = props.width - (barCount - 1) * spacing
  const barWidth = Math.max(0.2, availableWidth / barCount) // 极细的线条
  const totalWidth = barCount * barWidth + (barCount - 1) * spacing
  
  return {
    barCount,
    barWidth,
    spacing,
    totalWidth,
    startX: (props.width - totalWidth) / 2
  }
})

// 计算属性：当前进度对应的x坐标
const progressPosition = computed(() => {
  return (props.progress / 100) * waveformLayout.value.totalWidth
})

onMounted(() => {
  if (canvasRef.value) {
    ctx.value = canvasRef.value.getContext('2d')!
    // 设置更高的绘制质量
    ctx.value.imageSmoothingEnabled = true
    ctx.value.imageSmoothingQuality = 'high'
    drawWaveform()
  }
})

// 监听相关变化
watch([() => props.waveform, () => props.progress, () => props.isPlaying], () => {
  nextTick(() => {
    drawWaveform()
  })
})

// 波形数据归一化
const normalizeWaveformData = (waveform: number[]): number[] => {
  if (waveform.length === 0) return []
  
  const maxValue = Math.max(...waveform)
  const minValue = Math.min(...waveform)
  
  if (maxValue === minValue) {
    return waveform.map(() => 0.3)
  }
  
  return waveform.map(value => {
    const normalized = (value - minValue) / (maxValue - minValue)
    return normalized * 0.8 + 0.1
  })
}

// 生成默认波形
const generateDefaultWaveform = (): number[] => {
  const barCount = BAR_COUNT
  const waveform = []
  
  for (let i = 0; i < barCount; i++) {
    const position = i / barCount
    const baseHeight = 0.3 + 0.5 * Math.sin(position * Math.PI * 4)
    const variation = 0.2 * Math.sin(position * Math.PI * 8)
    const randomNoise = (Math.random() - 0.5) * 0.1
    
    const height = baseHeight + variation + randomNoise
    waveform.push(Math.max(0.1, Math.min(0.9, height)))
  }
  
  return waveform
}

// 优化后的波形绘制 - 极细线条，完全透明背景
const drawWaveform = () => {
  if (!ctx.value || !canvasRef.value) return
  
  const canvas = canvasRef.value
  const width = canvas.width
  const height = canvas.height
  
  // 关键修复：完全透明背景
  ctx.value.clearRect(0, 0, width, height)
  
  const { barCount, barWidth, spacing, startX, totalWidth } = waveformLayout.value
  const currentProgress = progressPosition.value
  
  // 绘制进度背景 - 使用更浅的颜色
  if (props.progress > 0) {
    const progressColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#6366f1'
    ctx.value.fillStyle = 'transparent'
    ctx.value.globalAlpha = 0.05 // 极浅的背景
    ctx.value.fillRect(startX, 0, currentProgress, height)
    ctx.value.globalAlpha = 1
  }
  
  // 绘制波形条
  for (let i = 0; i < barCount; i++) {
    const barHeight = normalizedWaveform.value[i] * height
    const x = startX + i * (barWidth + spacing)
    const y = (height - barHeight) / 2
    
    // 精确判断是否在播放进度内
    const barEnd = x + barWidth
    const isActive = barEnd <= startX + currentProgress
    
    // 设置颜色 - 更简洁的颜色方案
    if (isActive && props.isPlaying) {
      // 播放中的活跃条
      ctx.value.fillStyle = 'green' // #6366f1
    } else if (isActive) {
      // 暂停时的活跃条
      ctx.value.fillStyle = '#000'
      ctx.value.globalAlpha = 0.6
    } else {
      // 未激活的条 - 更浅的颜色
      ctx.value.fillStyle = '#7c7d7f' // #94a3b8
      ctx.value.globalAlpha = 0.4
    }
    
    // 对于极细条，直接使用矩形
    ctx.value.fillRect(x, y, barWidth, barHeight)
    
    ctx.value.globalAlpha = 1
  }
}

// 点击事件处理保持不变
const handleClick = (event: MouseEvent) => {
  if (!canvasRef.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const { startX, totalWidth } = waveformLayout.value
  
  // 计算点击的进度位置
  if (clickX >= startX && clickX <= startX + totalWidth) {
    const relativeX = clickX - startX
    const clickedProgress = Math.max(0, Math.min(100, (relativeX / totalWidth) * 100))
    
    // 发送进度跳转事件
    emit('seek', clickedProgress)
    return
  }
  
  // 只有在非波形图区域点击时才触发播放/暂停
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
.canvas-waveform {
  position: relative;
  cursor: pointer;
  border-radius: 1px;
  overflow: hidden;
  transition: all 0.2s ease;
  background: transparent; /* 完全透明背景 */
}

.canvas-waveform:hover {
  opacity: 0.9;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 1px;
}

.canvas-waveform:hover .play-overlay {
  opacity: 1;
}

.play-icon {
  width: 20px; /* 更小的图标 */
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.canvas-waveform:hover .play-icon {
  transform: scale(1.05);
}
</style>