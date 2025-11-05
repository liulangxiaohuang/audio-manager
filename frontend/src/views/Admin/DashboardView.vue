<template>
  <div class="dashboard">
    <!-- 加载状态 -->
    <div v-if="audioStore.dashboardLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>正在加载仪表盘数据...</span>
    </div>

    <!-- 图表区域 -->
    <div class="charts-grid">
      <!-- 音频格式分布 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>音频格式分布</h3>
          <div class="chart-actions">
            <PieChartIcon :size="16" />
            <RefreshCwIcon :size="16" class="refresh-btn" @click="refreshChart('format')" />
          </div>
        </div>
        <div class="chart-container" ref="formatChartContainer"></div>
      </div>

      <!-- 音频时长分布 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>音频时长分布</h3>
          <div class="chart-actions">
            <BarChart3Icon :size="16" />
            <RefreshCwIcon :size="16" class="refresh-btn" @click="refreshChart('duration')" />
          </div>
        </div>
        <div class="chart-container" ref="durationChartContainer"></div>
      </div>

      <!-- 用户注册趋势 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>用户注册趋势 (最近30天)</h3>
          <div class="chart-actions">
            <TrendingUpIcon :size="16" />
            <RefreshCwIcon :size="16" class="refresh-btn" @click="refreshChart('trend')" />
          </div>
        </div>
        <div class="chart-container" ref="userTrendChartContainer"></div>
      </div>

      <!-- 热门标签 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>热门标签</h3>
          <div class="chart-actions">
            <TagIcon :size="16" />
            <RefreshCwIcon :size="16" class="refresh-btn" @click="refreshChart('tags')" />
          </div>
        </div>
        <div class="chart-toggle">
          <button 
            :class="['toggle-btn', tagChartType === 'bar' ? 'active' : '']"
            @click="switchTagChartType('bar')"
          >
            柱状图
          </button>
          <button 
            :class="['toggle-btn', tagChartType === 'wordcloud' ? 'active' : '']"
            @click="switchTagChartType('wordcloud')"
          >
            词云图
          </button>
        </div>
        <div class="chart-container" ref="tagChartContainer"></div>
      </div>
    </div>

    <!-- 最近上传的音频 -->
    <div class="recent-audios">
      <div class="section-header">
        <h3>最近上传的音频</h3>
        <div class="section-actions">
          <ListMusicIcon :size="20" />
          <RefreshCwIcon :size="16" class="refresh-btn" @click="refreshRecentAudios" />
        </div>
      </div>
      <div class="audio-list">
        <div v-for="audio in audioStore.dashboardRecentAudios" :key="audio._id" class="audio-item">
          <div class="audio-info">
            <div class="audio-name">{{ audio.name }}</div>
            <div class="audio-meta">
              <span class="format">{{ audio.format.toUpperCase() }}</span>
              <span class="duration">{{ formatAudioDuration(audio.duration) }}</span>
              <span class="folder">{{ audio.folder }}</span>
            </div>
          </div>
          <div class="audio-time">
            {{ formatTime(audio.createdAt) }}
          </div>
          <HeartIcon v-if="audio.isFavorite" :size="16" class="favorite-icon" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { 
  UsersIcon, 
  ListMusicIcon, 
  FolderIcon, 
  HeartIcon,
  ClockIcon,
  PieChartIcon,
  BarChart3Icon,
  TrendingUpIcon,
  TagIcon,
  RefreshCwIcon
} from 'lucide-vue-next'
import { useAudioStore } from '@/store/audio'

const audioStore = useAudioStore()

// 图表容器 ref
const formatChartContainer = ref<HTMLDivElement | null>(null)
const durationChartContainer = ref<HTMLDivElement | null>(null)
const userTrendChartContainer = ref<HTMLDivElement | null>(null)
const tagChartContainer = ref<HTMLDivElement | null>(null)

// ECharts 实例
let formatChart: echarts.ECharts | null = null
let durationChart: echarts.ECharts | null = null
let userTrendChart: echarts.ECharts | null = null
let tagChart: echarts.ECharts | null = null

// 标签图表类型状态
const tagChartType = ref('bar') // 默认使用柱状图

// 格式化函数
const formatDuration = (seconds: number): string => {
  if (!seconds) return '0秒'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`
  } else {
    return `${secs}秒`
  }
}

const formatAudioDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

// 安全销毁图表函数
const safeDisposeChart = (chart: echarts.ECharts | null) => {
  if (chart && typeof chart.dispose === 'function') {
    try {
      chart.dispose()
    } catch (error) {
      console.warn('销毁图表时出错:', error)
    }
  }
}

// 初始化图表
const initCharts = () => {
  nextTick(() => {
    setTimeout(() => {
      initFormatChart()
      initDurationChart()
      initUserTrendChart()
      initTagChart()
    }, 100)
  })
}

// 刷新特定图表
const refreshChart = async (type: string) => {
  try {
    switch (type) {
      case 'format':
        await audioStore.fetchFormatDistribution()
        initFormatChart()
        break
      case 'duration':
        await audioStore.fetchDurationDistribution()
        initDurationChart()
        break
      case 'trend':
        await audioStore.fetchUserTrend()
        initUserTrendChart()
        break
      case 'tags':
        await audioStore.fetchTagStats()
        initTagChart()
        break
    }
  } catch (error) {
    console.error(`刷新 ${type} 图表失败:`, error)
  }
}

// 刷新最近上传的音频
const refreshRecentAudios = async () => {
  try {
    await audioStore.fetchRecentAudios(8)
  } catch (error) {
    console.error('刷新最近音频失败:', error)
  }
}

// 切换标签图表类型
const switchTagChartType = (type: string) => {
  tagChartType.value = type
  nextTick(() => {
    initTagChart()
  })
}

// 图表初始化函数
const initFormatChart = () => {
  if (!formatChartContainer.value) return
  
  safeDisposeChart(formatChart)
  
  try {
    formatChart = echarts.init(formatChartContainer.value)
    
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center'
      },
      series: [
        {
          name: '音频格式',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 18,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: audioStore.dashboardFormatDistribution
        }
      ]
    }
    formatChart.setOption(option)
  } catch (error) {
    console.error('初始化格式图表失败:', error)
  }
}

const initDurationChart = () => {
  if (!durationChartContainer.value) return
  
  safeDisposeChart(durationChart)
  
  try {
    durationChart = echarts.init(durationChartContainer.value)
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: audioStore.dashboardDurationDistribution.map((item: any) => item.range)
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          data: audioStore.dashboardDurationDistribution.map((item: any) => item.count),
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#83bff6' },
              { offset: 0.5, color: '#188df0' },
              { offset: 1, color: '#188df0' }
            ])
          }
        }
      ]
    }
    durationChart.setOption(option)
  } catch (error) {
    console.error('初始化时长图表失败:', error)
  }
}

const initUserTrendChart = () => {
  if (!userTrendChartContainer.value) return
  
  safeDisposeChart(userTrendChart)
  
  try {
    userTrendChart = echarts.init(userTrendChartContainer.value)
    
    const option = {
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: audioStore.dashboardUserTrend.dates
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          data: audioStore.dashboardUserTrend.counts,
          type: 'line',
          smooth: true,
          lineStyle: {
            color: '#ff6b6b'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
              { offset: 1, color: 'rgba(255, 107, 107, 0.1)' }
            ])
          }
        }
      ]
    }
    userTrendChart.setOption(option)
  } catch (error) {
    console.error('初始化趋势图表失败:', error)
  }
}

const initTagChart = () => {
  if (!tagChartContainer.value || !audioStore.dashboardTagStats.length) return
  
  safeDisposeChart(tagChart)
  
  try {
    tagChart = echarts.init(tagChartContainer.value)
    
    const tagData = [...audioStore.dashboardTagStats]
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)
    
    if (tagChartType.value === 'wordcloud') {
      // 词云图选项
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c}'
        },
        series: [{
          type: 'wordCloud',
          shape: 'circle',
          left: 'center',
          top: 'center',
          width: '90%',
          height: '90%',
          right: null,
          bottom: null,
          sizeRange: [12, 60],
          rotationRange: [-90, 90],
          rotationStep: 45,
          gridSize: 8,
          drawOutOfBound: false,
          textStyle: {
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            color: function () {
              return 'rgb(' + [
                Math.round(Math.random() * 160 + 50),
                Math.round(Math.random() * 160 + 50),
                Math.round(Math.random() * 160 + 50)
              ].join(',') + ')'
            }
          },
          emphasis: {
            focus: 'self',
            textStyle: {
              shadowBlur: 10,
              shadowColor: '#333'
            }
          },
          data: tagData.map(item => ({
            name: item.name,
            value: item.value,
            textStyle: {
              color: 'rgb(' + [
                Math.round(Math.random() * 160 + 50),
                Math.round(Math.random() * 160 + 50),
                Math.round(Math.random() * 160 + 50)
              ].join(',') + ')'
            }
          }))
        }]
      }
      tagChart.setOption(option)
    } else {
      // 柱状图选项
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: function (params: any) {
            const data = params[0]
            return `${data.name}<br/>数量: ${data.value}`
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          name: '数量',
          axisLabel: {
            fontSize: 10
          }
        },
        yAxis: {
          type: 'category',
          data: tagData.map(item => item.name),
          name: '标签',
          axisLabel: {
            interval: 0,
            fontSize: 10
          }
        },
        series: [
          {
            name: '标签数量',
            type: 'bar',
            data: tagData.map(item => item.value),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#5470c6' },
                { offset: 1, color: '#91cc75' }
              ])
            },
            label: {
              show: true,
              position: 'right',
              fontSize: 10,
              formatter: '{c}'
            }
          }
        ]
      }
      tagChart.setOption(option)
    }
  } catch (error) {
    console.error('初始化标签图表失败:', error)
  }
}

// 组件挂载
onMounted(async () => {
  // 尝试加载词云扩展
  try {
    wordcloudExtension = await import('echarts-wordcloud')
    if (wordcloudExtension && wordcloudExtension.default) {
      // 注册词云组件
      wordcloudExtension.default
      console.log('词云扩展加载成功')
    }
  } catch (error) {
    console.warn('echarts-wordcloud 扩展加载失败，将使用柱状图替代:', error)
  }

  await audioStore.fetchDashboardData()

  // 初始化图表
  initCharts()
})

// 组件卸载
onUnmounted(() => {
  safeDisposeChart(formatChart)
  safeDisposeChart(durationChart)
  safeDisposeChart(userTrendChart)
  safeDisposeChart(tagChart)
})
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chart-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
}

.toggle-btn {
  padding: 4px 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: var(--border-color);
}

.toggle-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon.users { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-icon.audio { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-icon.folder { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.stat-icon.favorite { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.stat-icon.duration { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.chart-card {
  background: var(--card-bg);
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.chart-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.2s;
}

.refresh-btn:hover {
  color: var(--primary-color);
}

.chart-container {
  height: 300px;
  width: 100%;
}

.recent-audios {
  background: var(--card-bg);
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.audio-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audio-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 0px;
  transition: background-color 0.2s;
}

.audio-item:hover {
  background: var(--border-color);
}

.audio-info {
  flex: 1;
}

.audio-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.audio-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.audio-meta span {
  padding: 2px 8px;
  background: var(--bg-primary);
  border-radius: 4px;
}

.audio-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-right: 8px;
}

.favorite-icon {
  color: #ff6b6b;
}

@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: 16px;
  }
  
  .stats-cards {
    grid-template-columns: 1fr 1fr;
  }
  
  .stat-card {
    padding: 16px;
  }
}
</style>
