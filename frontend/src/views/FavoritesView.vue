<template>
  <div class="favorites-view">
    <!-- <div class="view-header">
      <h2>我的收藏</h2>
      <p>您收藏的音频文件</p>
    </div> -->

    <div class="favorites-content">
      <div class="favorites-filter">
        <div class="filter-tabs">
          <button 
            v-for="folder in favoriteFolders" 
            :key="folder.id"
            class="filter-tab"
            :class="{ active: currentFilter === folder.id }"
            @click="setFilter(folder.id)"
          >
            {{ folder.name }}
            <span class="tab-count">{{ getFavoriteCount(folder.id) }}</span>
          </button>
        </div>
      </div>

      <div class="favorites-list">
        <AudioList 
          :audios="filteredFavorites"
          @play="playAudio"
        />

        <div v-if="!filteredFavorites.length" class="empty-state">
          <StarIcon :size="48" />
          <h3>暂无收藏</h3>
          <p v-if="currentFilter === 'all'">您还没有收藏任何音频文件</p>
          <p v-else>此收藏夹中没有音频文件</p>
          <!-- <button class="btn-primary" @click="navigateToFolders">
            浏览音频文件
          </button> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAudioStore } from '@/store/audio'
import { StarIcon } from 'lucide-vue-next'
import AudioList from '@/components/AudioList.vue'

const router = useRouter()
const audioStore = useAudioStore()

const currentFilter = ref('all')

const favoriteFolders = [
  { id: 'all', name: '全部收藏' },
  { id: 'default', name: '默认收藏夹' },
  { id: 'work', name: '工作音频' },
  { id: 'music', name: '音乐' }
]

const filteredFavorites = computed(() => {
  if (currentFilter.value === 'all') {
    return audioStore.favorites
  }
  return audioStore.favorites.filter(audio => 
    audio.favoriteFolders.includes(currentFilter.value)
  )
})

const getFavoriteCount = (folderId: string) => {
  if (folderId === 'all') {
    return audioStore.favorites.length
  }
  return audioStore.favorites.filter(audio => 
    audio.favoriteFolders.includes(folderId)
  ).length
}

onMounted(() => {
  audioStore.loadFavorites()
})

// 监听收藏状态变化，自动刷新
watch(() => audioStore.favorites, () => {
  console.log('Favorites updated:', audioStore.favorites.length)
})

const setFilter = (filterId: string) => {
  currentFilter.value = filterId
}

const playAudio = (audio: any) => {
  console.log('播放音频:', audio.name)
}

const navigateToFolders = () => {
  router.push('/')
}
</script>

<style scoped>
.favorites-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.view-header {
  text-align: center;
  margin-bottom: 32px;
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

.favorites-filter {
  margin-bottom: 24px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.filter-tab:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.filter-tab.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.tab-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.filter-tab:not(.active) .tab-count {
  background: var(--tag-bg);
  color: var(--tag-color);
}

.favorites-list {
  min-height: 400px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state svg {
  color: var(--warning-color);
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  margin-bottom: 20px;
}
</style>