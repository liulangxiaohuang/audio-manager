<template>
  <div class="home-view">
    <div class="view-header">
      <h2>欢迎使用音频管理器</h2>
      <p>开始管理您的音频文件吧！</p>
    </div>
    
    <div class="quick-actions">
      <div class="action-card" @click="syncAudio">
        <RefreshCwIcon :size="24" />
        <h3>同步音频</h3>
        <p>扫描并更新音频库</p>
      </div>
      
      <div class="action-card" @click="navigateToFavorites">
        <StarIcon :size="24" />
        <h3>我的收藏</h3>
        <p>查看收藏的音频</p>
      </div>
      
      <div class="action-card" @click="openSettings">
        <SettingsIcon :size="24" />
        <h3>设置</h3>
        <p>配置音频文件夹</p>
      </div>
    </div>
    
    <div class="recent-audios" v-if="recentAudios.length">
      <h3>最近添加</h3>
      <AudioList :audios="recentAudios" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAudioStore } from '@/store/audio'
import { RefreshCwIcon, StarIcon, SettingsIcon } from 'lucide-vue-next'
import AudioList from '@/components/AudioList.vue'

const router = useRouter()
const audioStore = useAudioStore()

const recentAudios = computed(() => {
  return audioStore.audioList
    .slice(0, 5)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const syncAudio = () => {
  audioStore.syncAudioFiles()
}

const navigateToFavorites = () => {
  router.push('/favorites')
}

const openSettings = () => {
  console.log('打开设置')
}
</script>

<style scoped>
.home-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.view-header {
  text-align: center;
  margin-bottom: 40px;
}

.view-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.view-header p {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.action-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.action-card svg {
  color: var(--primary-color);
  margin-bottom: 12px;
}

.action-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.action-card p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.recent-audios h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}
</style>