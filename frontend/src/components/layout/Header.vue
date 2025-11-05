<template>
  <header class="header">
    <div class="header-left">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <div class="breadcrumb" v-if="breadcrumbs.length && !audioStore.searchQuery">
        <span 
          v-for="(crumb, index) in breadcrumbs" 
          :key="crumb.path"
          class="breadcrumb-item"
        >
          <span 
            class="breadcrumb-link"
            :class="{ 'last-item': index === breadcrumbs.length - 1 }"
            @click="navigateTo(crumb.path)"
          >
            {{ crumb.name }}
          </span>
          <span class="breadcrumb-separator" v-if="index < breadcrumbs.length - 1">/</span>
        </span>
      </div>
      <div class="search-indicator" v-else-if="audioStore.searchQuery">
        <span>搜索结果: "{{ audioStore.searchQuery }}"</span>
        <button @click="clearSearch" class="clear-search-btn">
          <XIcon :size="14" />
          清除搜索
        </button>
      </div>
    </div>

    <div class="header-right">
      <div class="search-box" :class="{ 'active': searchQuery }">
        <SearchIcon :size="16" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索音频名称或标签..." 
          class="search-input"
          @input="handleSearchInput"
          @keyup.enter="performSearch"
        />
        <button 
          v-if="searchQuery" 
          @click="clearSearch" 
          class="clear-search"
        >
          <XIcon :size="16" />
        </button>
      </div>
      
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
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAudioStore } from '@/store/audio'
import { SearchIcon, XIcon, LogOutIcon, ShieldUserIcon, CircleUserRound } from 'lucide-vue-next'

const router = useRouter()
const audioStore = useAudioStore()

const searchQuery = ref('')

const pageTitle = computed(() => {
  if (audioStore.searchQuery) {
    return `搜索: ${audioStore.searchQuery}`
  }
  return audioStore.currentFolder ? '文件夹' : '收藏夹'
})

const breadcrumbs = computed(() => {
  if (!audioStore.currentFolder || audioStore.searchQuery) return []
  
  const parts = audioStore.currentFolder.split('/').filter(Boolean)
  const crumbs = [{ name: '根目录', path: '' }]
  
  let currentPath = ''
  parts.forEach(part => {
    currentPath += `/${part}`
    crumbs.push({
      name: part,
      path: currentPath
    })
  })
  
  return crumbs
})

// 处理搜索输入
const handleSearchInput = () => {
  // 使用防抖，避免频繁搜索
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300)
}

let searchTimeout: number

// 执行搜索
const performSearch = () => {
  audioStore.setSearchQuery(searchQuery.value)
}

// 清空搜索
const clearSearch = () => {
  searchQuery.value = ''
  audioStore.clearSearch()
}

const navigateTo = (path: string) => {
  audioStore.setCurrentFolder(path)
}

// 监听 store 中的搜索查询变化
watch(() => audioStore.searchQuery, (newQuery) => {
  if (newQuery !== searchQuery.value) {
    searchQuery.value = newQuery
  }
})

const handleLogin = () => {
  router.push('/login')
}

const handleLogout = async () => {
  await audioStore.logout()
  // 退出后跳转到登录页
  router.push('/login')
}

// 组件卸载时清除定时器
onUnmounted(() => {
  clearTimeout(searchTimeout)
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
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--text-secondary);
}

.breadcrumb-link {
  cursor: pointer;
  transition: color 0.3s ease;
}

.breadcrumb-link:hover:not(.last-item) {
  color: var(--primary-color);
}

.breadcrumb-link.last-item {
  color: var(--text-primary);
  cursor: default;
}

.breadcrumb-separator {
  margin: 0 4px;
}

.search-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.clear-search-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.clear-search-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 300px;
  transition: all 0.3s ease;
}

.search-box.active {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.search-box svg {
  color: var(--text-secondary);
  margin-right: 8px;
}

.search-input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.clear-search {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.sync-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.sync-button:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.sync-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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