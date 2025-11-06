import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AudioFile, FolderItem } from '@/types/audio'
import { audioApi, authApi, statsApi } from '@/services/api'
import { audioPlayer } from '@/utils/audioPlayer'
import { useNotification } from '@/utils/notification'
import { hashPassword } from '@/utils/password'

// 添加用户类型定义
interface User {
  id: string
  username: string
  email: string
  role: string
  // 可以根据需要添加更多字段
}

// 添加统计相关类型定义
interface StatsData {
  userCount: number;
  audioCount: number;
  folderCount: number;
  favoriteCount: number;
  totalDuration: number;
}

interface FormatDistribution {
  name: string;
  value: number;
}

interface DurationDistribution {
  range: string;
  count: number;
}

interface UserTrend {
  dates: string[];
  counts: number[];
}

interface TagStat {
  name: string;
  value: number;
}

interface DashboardState {
  stats: StatsData;
  formatDistribution: FormatDistribution[];
  durationDistribution: DurationDistribution[];
  userTrend: UserTrend;
  tagStats: TagStat[];
  recentAudios: AudioFile[];
  mostFavoritedAudios: AudioFile[]; // 新增
  mostDownloadedAudios: AudioFile[]; // 新增
  dashboardLoading: boolean;
}

export const useAudioStore = defineStore('audio', () => {
  // State
  const audioList = ref<AudioFile[]>([])
  const folderStructure = ref<FolderItem[]>([])
  const currentFolder = ref('')
  const currentPath = ref<string[]>([])
  const currentFolderContents = ref<Array<FolderItem | AudioFile>>([])
  const searchQuery = ref('')
  const favorites = ref<AudioFile[]>([])
  const currentPlayingId = ref<string | null>(null)
  const favoriteFolders = ref([
    { id: 'default', name: '默认收藏夹', count: 0 },
  ])
  const currentTheme = ref<'light' | 'dark'>('light')
  const syncLoading = ref(false)
  
  // 新增：认证相关状态
  const isAuthenticated = ref(false)
  const user = ref<User | null>(null)
  const authLoading = ref(false)
  const authInitialized = ref(false) // 新增：标记认证是否已初始化

  // 新增：仪表盘相关状态
  const dashboardState = ref<DashboardState>({
    stats: {
      userCount: 0,
      audioCount: 0,
      folderCount: 0,
      favoriteCount: 0,
      totalDuration: 0
    },
    formatDistribution: [],
    durationDistribution: [],
    userTrend: {
      dates: [],
      counts: []
    },
    tagStats: [],
    recentAudios: [],
    mostFavoritedAudios: [], // 新增
    mostDownloadedAudios: [], // 新增
    dashboardLoading: false
  })

  // Getters
  const filteredAudioList = computed(() => {
    let filtered = audioList.value
    
    if (currentFolder.value) {
      filtered = filtered.filter(audio => audio.folder === currentFolder.value)
    }
    
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(audio => 
        audio.name.toLowerCase().includes(query) ||
        audio.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
    
    return filtered
  })

  const breadcrumbs = computed(() => {
    const crumbs = [{ name: '根目录', path: [] }]
    let accumulatedPath = ''
    
    for (const segment of currentPath.value) {
      accumulatedPath += `/${segment}`
      crumbs.push({
        name: segment,
        path: [...currentPath.value.slice(0, crumbs.length)]
      })
    }
    
    return crumbs
  })

  // 新增：认证相关的 computed
  const userRole = computed(() => user.value?.role || 'user')
  const isAdmin = computed(() => userRole.value === 'admin')

  // 新增：仪表盘相关的 Getters
  const dashboardStats = computed(() => dashboardState.value.stats)
  const dashboardFormatDistribution = computed(() => dashboardState.value.formatDistribution)
  const dashboardDurationDistribution = computed(() => dashboardState.value.durationDistribution)
  const dashboardUserTrend = computed(() => dashboardState.value.userTrend)
  const dashboardTagStats = computed(() => dashboardState.value.tagStats)
  const dashboardRecentAudios = computed(() => dashboardState.value.recentAudios)
  const dashboardMostFavoritedAudios = computed(() => dashboardState.value.mostFavoritedAudios)
  const dashboardMostDownloadedAudios = computed(() => dashboardState.value.mostDownloadedAudios)
  const dashboardLoading = computed(() => dashboardState.value.dashboardLoading)

  // 修复：简化的音频播放器事件监听
  const setupAudioPlayerListeners = () => {
    // 这些监听器只用于状态同步，不处理UI更新
    audioPlayer.onPlay((audioId: string) => {
      console.log('Store: 开始播放', audioId)
      currentPlayingId.value = audioId
    })

    audioPlayer.onPause((audioId: string) => {
      console.log('Store: 暂停播放', audioId)
      // 暂停时不改变 currentPlayingId，这样我们知道哪个音频被暂停了
    })

    audioPlayer.onEnd((audioId: string) => {
      console.log('Store: 播放结束', audioId)
      if (currentPlayingId.value === audioId) {
        currentPlayingId.value = null
      }
    })
  }

  // 修复：简化的音频播放方法
  const playAudio = (audio: AudioFile) => {
    console.log('Store: 请求播放音频', audio._id, audio.name)
    
    // 直接调用音频播放器，它会处理所有状态切换
    audioPlayer.play(audio.url, audio._id)
  }

  // 修复：暂停方法
  const pauseAudio = () => {
    console.log('Store: 请求暂停当前音频')
    audioPlayer.pause()
  }

  // 修复：停止方法
  const stopAudio = () => {
    console.log('Store: 停止播放')
    audioPlayer.stop()
    currentPlayingId.value = null
  }

  // 新增：跳转到指定进度
  const seekAudio = (audioId: string, progress: number) => {
    console.log('Store: 跳转进度', { audioId, progress })
    audioPlayer.seek(audioId, progress)
  }

  // 新增：获取当前播放状态
  const getCurrentPlayingState = () => {
    return {
      audioId: currentPlayingId.value,
      isPlaying: currentPlayingId.value ? audioPlayer.isPlaying(currentPlayingId.value) : false
    }
  }

  // 新增：认证相关的方法
  const login = async (credentials: { username: string; password: string }) => {
    try {
      authLoading.value = true

      // 在前端对密码进行哈希
      const frontendHashedPassword = await hashPassword(credentials.password);
      
      const response = await authApi.login({
        username: credentials.username,
        password: frontendHashedPassword
      })
      const { user: userData, token } = response.data
      console.log(11, user, token)
      
      // 保存认证信息
      isAuthenticated.value = true
      user.value = userData
      
      // 保存到本地存储
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      
      // showNotification('登录成功', 'success')
      return { success: true }
    } catch (error: any) {
      console.log('Login failed:', error)
      const errorMsg = error.response?.data?.message || '登录失败'
      // showNotification(errorMsg, 'error')
      return { success: false, error: errorMsg }
    } finally {
      authLoading.value = false
    }
  }

  const logout = async () => {
    try {
      // 调用登出API（如果有的话）
      await authApi.logout()
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      // 清理本地状态
      isAuthenticated.value = false
      user.value = null
      
      // 清理本地存储
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      
      // 停止当前播放的音频
      stopAudio()
      
      // showNotification('已退出登录', 'info')
    }
  }

  // 新增：从本地存储恢复认证状态
  const restoreAuthFromStorage = () => {
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (token && userData) {
        isAuthenticated.value = true
        user.value = JSON.parse(userData)
        console.log('✅ 从本地存储恢复认证状态')
      } else {
        isAuthenticated.value = false
        user.value = null
      }
    } catch (error) {
      console.error('恢复认证状态失败:', error)
      isAuthenticated.value = false
      user.value = null
    } finally {
      authInitialized.value = true
    }
  }

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')
      
      if (!token || !savedUser) {
        return false
      }
      
      // 验证 token 有效性
      const response = await authApi.verifyToken()
      
      if (response.data.success) {
        user.value = response.data.user
        isAuthenticated.value = true
        return true
      }
      
      return false
    } catch (error) {
      console.error('Auth check failed:', error)
      // 验证失败时清理状态
      logout()
      return false
    }
  }

  // 初始化认证状态 - 修改为同步恢复 + 异步验证
  const initializeAuth = async () => {
    // 同步从本地存储恢复状态（立即设置，避免路由守卫判断错误）
    restoreAuthFromStorage()
    
    // 异步验证 token 有效性
    if (isAuthenticated.value) {
      try {
        await checkAuthStatus()
      } catch (error) {
        console.error('Token验证失败:', error)
      }
    }
  }

  // Actions
  const loadAudioList = async (folder?: string) => {
    try {
      const params: any = {}
      if (folder !== undefined) params.folder = folder
      if (searchQuery.value) params.search = searchQuery.value
      
      const response = await audioApi.getAudioList(params)
      audioList.value = response.data
    } catch (error) {
      console.error('Failed to load audio list:', error)
      audioList.value = getMockAudioData()
    }
  }

  const loadFolderStructure = async () => {
    try {
      const response = await audioApi.getFolderStructure()
      folderStructure.value = response.data
    } catch (error) {
      console.error('Failed to load folder structure:', error)
      folderStructure.value = getMockFolderStructure()
    }
  }

  const loadFolderContents = async (folderPath: string = '') => {
    try {
      const response = await audioApi.getFolderContents(folderPath)
      currentFolderContents.value = response.data
    } catch (error) {
      console.error('Failed to load folder contents:', error)
      currentFolderContents.value = getMockFolderContents()
    }
  }

  const navigateToFolder = async (folderName: string) => {
    currentPath.value.push(folderName)
    const fullPath = currentPath.value.join('/')
    currentFolder.value = fullPath
    await loadFolderContents(fullPath)
  }

  const navigateUp = async () => {
    if (currentPath.value.length > 0) {
      currentPath.value.pop()
      const fullPath = currentPath.value.join('/')
      currentFolder.value = fullPath
      await loadFolderContents(fullPath)
    }
  }

  const navigateToRoot = async () => {
    currentPath.value = []
    currentFolder.value = ''
    await loadFolderContents('')
  }

  const setCurrentFolder = async (folder: string) => {
    currentFolder.value = folder
    if (folder) {
      currentPath.value = folder.split('/').filter(Boolean)
    } else {
      currentPath.value = []
    }
    await loadFolderContents(folder)
  }

  const setSearchQuery = async (query: string) => {
    searchQuery.value = query
    
    if (query.trim()) {
      await searchAudio(query)
    } else {
      await clearSearch()
    }
  }

  const searchAudio = async (query: string) => {
    try {
      console.log(`Searching for: ${query}`)
      
      if (!query.trim()) {
        await loadFolderContents(currentFolder.value)
        return
      }
      
      const response = await audioApi.searchAudio(query, currentFolder.value)
      const searchResults: Array<FolderItem | AudioFile> = response.data.map(audio => ({
        ...audio,
        type: 'audio' as const
      }))
      
      currentFolderContents.value = searchResults
    } catch (error) {
      console.error('Search failed:', error)
      showNotification('搜索失败，请重试', 'error')
      await loadFolderContents(currentFolder.value)
    }
  }

  const clearSearch = async () => {
    searchQuery.value = ''
    await loadFolderContents(currentFolder.value)
  }

  const toggleFavorite = async (audioId: string, folderName: string = 'default') => {
    try {
      const response = await audioApi.toggleFavorite(audioId, folderName);
      
      const audioIndex = audioList.value.findIndex(a => a._id === audioId);
      if (audioIndex !== -1) {
        audioList.value[audioIndex] = { 
          ...audioList.value[audioIndex], 
          ...response.data 
        };
      }
      
      const contentIndex = currentFolderContents.value.findIndex(item => 
        item.type === 'audio' && (item as AudioFile)._id === audioId
      );
      if (contentIndex !== -1) {
        currentFolderContents.value[contentIndex] = {
          ...(currentFolderContents.value[contentIndex] as AudioFile),
          ...response.data
        };
      }
      
      await loadFavorites();
      updateFavoriteFoldersCount();
      
      showNotification(
        response.data.favoriteFolders.includes(folderName) ? '已添加到收藏' : '已从收藏移除',
        'success'
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      showNotification('操作失败，请重试', 'error');
    }
  };

  const updateFavoriteFoldersCount = () => {
    favoriteFolders.value.forEach(folder => {
      folder.count = favorites.value.filter(audio => 
        audio.favoriteFolders.includes(folder.id)
      ).length;
    });
  };

  const loadFavorites = async (folder?: string) => {
    try {
      const params = folder && folder !== 'all' ? { folder } : {};
      const response = await audioApi.getFavorites(params);
      favorites.value = response.data;
      updateFavoriteFoldersCount();
    } catch (error) {
      console.error('Failed to load favorites:', error);
      favorites.value = audioList.value.filter(audio => audio.favoriteFolders.length > 0);
      updateFavoriteFoldersCount();
    }
  };

  const updateAudio = async (audioId: string, updates: Partial<AudioFile>) => {
    try {
      await audioApi.updateAudio(audioId, updates)
      await loadAudioList(currentFolder.value)
      showNotification('音频信息已更新', 'success')
    } catch (error) {
      console.error('Failed to update audio:', error)
      showNotification('更新失败，请重试', 'error')
      const audioIndex = audioList.value.findIndex(a => a._id === audioId)
      if (audioIndex !== -1) {
        audioList.value[audioIndex] = { ...audioList.value[audioIndex], ...updates }
      }
    }
  }

  const deleteAudio = async (audioId: string) => {
    try {
      await audioApi.deleteAudio(audioId);
      
      const audioIndex = audioList.value.findIndex(audio => audio._id === audioId);
      if (audioIndex !== -1) {
        audioList.value.splice(audioIndex, 1);
      }
      
      const contentIndex = currentFolderContents.value.findIndex(item => 
        item.type === 'audio' && (item as AudioFile)._id === audioId
      );
      if (contentIndex !== -1) {
        currentFolderContents.value.splice(contentIndex, 1);
      }
      
      const favoriteIndex = favorites.value.findIndex(audio => audio._id === audioId);
      if (favoriteIndex !== -1) {
        favorites.value.splice(favoriteIndex, 1);
      }
      
      updateFavoriteFoldersCount();
      showNotification('音频已永久删除', 'success');
      await loadFolderContents(currentFolder.value);
      
    } catch (error) {
      console.error('Failed to delete audio:', error);
      showNotification('删除失败，请重试', 'error');
    }
  };

  const toggleTheme = () => {
    currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', currentTheme.value)
  }

  const syncAudioFiles = async () => {
    try {
      syncLoading.value = true;
      console.log('Starting sync...');
      
      const response = await audioApi.syncAudio();
      
      if (response.data.success) {
        console.log('Sync successful:', response.data.message);
        
        await Promise.all([
          loadFolderContents(currentFolder.value),
          loadFolderStructure(),
          loadFavorites()
        ]);
        
        showNotification(`同步成功！${response.data.message}`, 'success');
      } else {
        throw new Error(response.data.message || '同步失败');
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      const errorMessage = error.response?.data?.message || error.message || '同步过程中发生未知错误';
      showNotification(`同步失败: ${errorMessage}`, 'error');
      
      try {
        await loadFolderContents(currentFolder.value);
        await loadFolderStructure();
      } catch (reloadError) {
        console.error('Failed to reload data after sync error:', reloadError);
      }
    } finally {
      syncLoading.value = false;
      console.log('Sync process completed');
    }
  };

  const initializeAudioStore = async () => {
    // 初始化认证状态
    await initializeAuth()
    // 初始化音频播放器监听器
    setupAudioPlayerListeners()
    await loadFolderContents('')
  }

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const { addNotification } = useNotification()
    addNotification({
      type,
      title: type === 'success' ? '成功' : 
            type === 'error' ? '错误' : 
            type === 'warning' ? '警告' : '提示',
      message,
      duration: 3000
    })
  }

  const fetchStats = async (): Promise<StatsData> => {
    try {
      const result = await statsApi.count();
      if (result.data.success) {
        dashboardState.value.stats = result.data.data;
        return result.data.data;
      }
    } catch (error: any) {
      console.error('获取统计信息失败:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // 新增：获取格式分布
  const fetchFormatDistribution = async (): Promise<FormatDistribution[]> => {
    try {
      const result = await statsApi.getFormatDistribution();
      if (result.data.code === 200) {
        dashboardState.value.formatDistribution = result.data.data;
        return result.data.data;
      }
      throw new Error(result.data.message || '获取格式分布失败');
    } catch (error: any) {
      console.error('获取格式分布失败:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // 新增：获取时长分布
  const fetchDurationDistribution = async (): Promise<DurationDistribution[]> => {
    try {
      const result = await statsApi.getDurationDistribution();
      if (result.data.code === 200) {
        dashboardState.value.durationDistribution = result.data.data;
        return result.data.data;
      }
      throw new Error(result.data.message || '获取时长分布失败');
    } catch (error: any) {
      console.error('获取时长分布失败:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // 新增：获取用户注册趋势
  const fetchUserTrend = async (days: number = 30): Promise<UserTrend> => {
    try {
      const result = await statsApi.getUserRegistrationTrend(days);
      if (result.data.code === 200) {
        dashboardState.value.userTrend = result.data.data;
        return result.data.data;
      }
      throw new Error(result.data.message || '获取用户注册趋势失败');
    } catch (error: any) {
      console.error('获取用户注册趋势失败:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // 新增：获取标签统计
  const fetchTagStats = async (): Promise<TagStat[]> => {
    try {
      const result = await statsApi.getTagStats();
      if (result.data.code === 200) {
        dashboardState.value.tagStats = result.data.data;
        return result.data.data;
      }
      throw new Error(result.data.message || '获取标签统计失败');
    } catch (error: any) {
      console.error('获取标签统计失败:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // 添加获取收藏最多音频的方法
  const fetchMostFavoritedAudios = async (limit: number = 10): Promise<AudioFile[]> => {
    try {
      const result = await statsApi.getMostFavoritedAudios(limit);
      if (result.data.code === 200) {
        dashboardState.value.mostFavoritedAudios = result.data.data;
        return result.data.data;
      }
      throw new Error(result.data.message || '获取收藏最多音频失败');
    } catch (error: any) {
      console.error('获取收藏最多音频失败:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // 添加获取下载最多音频的方法
  const fetchMostDownloadedAudios = async (limit: number = 10): Promise<AudioFile[]> => {
    try {
      const result = await statsApi.getMostDownloadedAudios(limit);
      if (result.data.code === 200) {
        dashboardState.value.mostDownloadedAudios = result.data.data;
        return result.data.data;
      }
      throw new Error(result.data.message || '获取下载最多音频失败');
    } catch (error: any) {
      console.error('获取下载最多音频失败:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // 新增：获取最近上传的音频
  const fetchRecentAudios = async (limit: number = 10): Promise<AudioFile[]> => {
    try {
      const result = await statsApi.getRecentAudios(limit);
      if (result.data.code === 200) {
        dashboardState.value.recentAudios = result.data.data;
        return result.data.data;
      }
      throw new Error(result.data.message || '获取最近音频失败');
    } catch (error: any) {
      console.error('获取最近音频失败:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // 新增：获取所有仪表盘数据
  const fetchDashboardData = async () => {
    dashboardState.value.dashboardLoading = true;
    try {
      await Promise.all([
        // fetchStats(),
        fetchFormatDistribution(),
        fetchDurationDistribution(),
        fetchUserTrend(),
        fetchTagStats(),
        fetchRecentAudios(8),
        fetchMostFavoritedAudios(5), // 新增：获取前5个收藏最多的音频
        fetchMostDownloadedAudios(5) // 新增
      ]);
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    } finally {
      dashboardState.value.dashboardLoading = false;
    }
  }

  // 新增：刷新仪表盘数据
  const refreshDashboard = async () => {
    return await fetchDashboardData();
  }

  // 格式化时长工具函数
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0秒'
    
    const hours = Math.floor(seconds / 3600)
    // const minutes = Math.floor((seconds % 3600) / 60)
    // const secs = seconds % 60
 
    return hours * 60
  }

  const formatAudioDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  // 模拟数据函数（保持不变）
  const getMockAudioData = (): AudioFile[] => {
    return [
      {
        _id: '1',
        name: '示例音乐',
        filename: 'sample-music.mp3',
        format: 'mp3',
        folder: '/',
        path: '/sample-music.mp3',
        url: '/api/audio/file/sample-music.mp3',
        duration: 180,
        waveform: [10, 25, 45, 60, 80, 95, 85, 70, 50, 30],
        tags: ['音乐', '示例'],
        isFavorite: false,
        favoriteFolders: [],
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }

  const getMockFolderStructure = (): FolderItem[] => {
    return [
      {
        name: '音乐',
        type: 'folder',
        path: '/音乐',
        items: []
      }
    ]
  }

  const getMockFolderContents = (): Array<FolderItem | AudioFile> => {
    return [
      {
        name: '音乐',
        type: 'folder',
        path: '/音乐'
      },
      {
        _id: '1',
        name: '示例音乐',
        filename: 'sample-music.mp3',
        format: 'mp3',
        folder: '/',
        path: '/sample-music.mp3',
        url: '/api/audio/file/sample-music.mp3',
        duration: 180,
        waveform: [10, 25, 45, 60, 80, 95, 85, 70, 50, 30],
        tags: ['音乐', '示例'],
        isFavorite: false,
        favoriteFolders: [],
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'audio'
      }
    ]
  }

  return {
    // State
    audioList,
    folderStructure,
    currentFolder,
    currentPath,
    currentFolderContents,
    searchQuery,
    favorites,
    favoriteFolders,
    currentTheme,
    syncLoading,
    currentPlayingId,
    
    // 新增：认证相关状态
    isAuthenticated,
    user,
    authLoading,
    authInitialized, // 新增：导出认证初始化状态

    // Getters
    filteredAudioList,
    breadcrumbs,
    
    // 新增：认证相关的 computed
    userRole,
    isAdmin,

    // 仪表盘相关的 Getters
    dashboardStats,
    dashboardFormatDistribution,
    dashboardDurationDistribution,
    dashboardUserTrend,
    dashboardTagStats,
    dashboardRecentAudios,
    dashboardMostFavoritedAudios,
    dashboardMostDownloadedAudios,
    dashboardLoading,
    
    // Actions
    loadAudioList,
    loadFolderStructure,
    loadFolderContents,
    navigateToFolder,
    navigateUp,
    navigateToRoot,
    setCurrentFolder,
    setSearchQuery,
    toggleFavorite,
    loadFavorites,
    updateAudio,
    deleteAudio,
    toggleTheme,
    syncAudioFiles,
    initializeAudioStore,
    clearSearch,
    
    // 音频播放相关方法
    playAudio,
    pauseAudio,
    stopAudio,
    seekAudio,
    getCurrentPlayingState,
    
    // 新增：认证相关方法
    login,
    logout,
    checkAuthStatus,
    initializeAuth,
    restoreAuthFromStorage, // 新增：导出恢复认证方法

    // 新增：统计相关方法
    fetchStats,

    // 仪表盘相关方法
    fetchFormatDistribution,
    fetchDurationDistribution,
    fetchUserTrend,
    fetchTagStats,
    fetchRecentAudios,
    fetchMostFavoritedAudios,
    fetchMostDownloadedAudios,
    fetchDashboardData,
    refreshDashboard,

    // 格式化工具函数
    formatDuration,
    formatAudioDuration,
    formatTime
  }
})