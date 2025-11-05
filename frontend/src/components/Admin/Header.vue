<template>
  <header class="header">
    <div class="header-left">
      <div class="data-list">
        <span><UsersIcon :size="20" /></span>
        <span>{{ audioStore.dashboardStats.userCount || 0 }} <i>人 / 会员</i></span>
      </div>
      <div class="data-list">
        <span><ListMusicIcon :size="20" /></span>
        <span>{{ audioStore.dashboardStats.audioCount || 0 }} <i>个 / 音频</i></span>
      </div>
      <div class="data-list">
        <span><HeartPlusIcon :size="20" /></span>
        <span>{{ audioStore.dashboardStats.favoriteCount || 0 }} <i>次 / 收藏</i></span>
      </div>
      <div class="data-list">
        <span><Clock4Icon :size="20" /></span>
        <span>{{ audioStore.formatDuration(audioStore.dashboardStats.totalDuration || 0) }} <i>分钟 / 时长</i></span>
      </div>
    </div>

    <div class="header-right">
      <div class="user-menu" v-if="audioStore.isAuthenticated">
        <ShieldUserIcon :size="16" v-if="audioStore.isAdmin" />
        <CircleUserRound :size="16" v-else />
        <span class="username">{{ audioStore.user?.username }}</span>
        <LogOutIcon :size="16" class="logout-btn" @click="handleLogout" />
      </div>
      <span v-else @click="handleLogin">Login</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAudioStore } from '@/store/audio'
import { UsersIcon, ListMusicIcon, HeartPlusIcon, LogOutIcon, ShieldUserIcon, CircleUserRound, Clock4Icon } from 'lucide-vue-next'

const router = useRouter()
const audioStore = useAudioStore()

// 定时器
let refreshTimer: number | null = null

const handleLogin = () => {
  router.push('/login')
}

const handleLogout = async () => {
  await audioStore.logout()
  router.push('/login')
}

onMounted(async () => {
  await audioStore.fetchStats()

  // 每2分钟更新一次数据
  refreshTimer = window.setInterval(async () => {
    await audioStore.fetchStats()
  }, 1000 * 60 * 2)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  height: 70px;
}

.header-left {
  display: flex;
  /* flex-direction: column; */
  gap: 40px;
}

.data-list {
}
.data-list span {
  font-size: 30px;
  &:first-child {
    color: #666;
    margin-right: 10px;
  }
  &:last-child {
    color: #666;
    i {
      font-style: normal;
      font-size: 12px;
      color: #888;
    }
  }
  svg {
    vertical-align: middle;
  }
}

.header-right {
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.user-menu {
  margin-left: 15px;
  display: flex;
  color: #686868;
}
.username {
  vertical-align: middle;
  display: inline-block;
  line-height: 16px;
  font-size: 13px;
  margin-left: 3px;
}
.logout-btn {
  cursor: pointer;
  margin-left: 10px;
  color: var(--primary-color);
}
</style>