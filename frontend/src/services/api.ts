import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 1000,
})

// 请求拦截器 - 添加日志
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`)
    console.log(111222, config)
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器 - 增强错误处理
api.interceptors.response.use(
  (response) => {
    console.log(`Response received from: ${response.config.url}`, response.status)
    return response
  },
  (error) => {
    console.error('Response error:', error)
    
    if (error.code === 'ECONNREFUSED') {
      error.message = '无法连接到服务器，请确保后端服务正在运行'
    } else if (error.response) {
      // 服务器返回了错误状态码
      const message = error.response.data?.message || error.response.statusText
      error.message = `服务器错误 (${error.response.status}): ${message}`
    } else if (error.request) {
      // 请求发送了但没有收到响应
      error.message = '网络错误：无法连接到服务器'
    }
    
    return Promise.reject(error)
  }
)

export const audioApi = {
  getAudioList: (params?: any) => api.get('/audio/list', { params }),
  getFolderStructure: () => api.get('/audio/folders'),
  getFolderContents: (path: string) => api.get('/audio/contents', { params: { path } }),
  searchAudio: (query: string, folder?: string) => 
    api.get('/audio/list', { params: { search: query, folder } }), // 使用相同的端点
  syncAudio: () => api.post('/audio/sync', {}, {
    timeout: 20 * 60 * 1000 // 20分钟
  }),
  updateAudio: (id: string, data: any) => api.put(`/audio/${id}`, data),
  toggleFavorite: (id: string, folderName: string) => 
    api.post(`/audio/${id}/favorite`, { favoriteFolder: folderName }),
  deleteAudio: (id: string) => api.delete(`/audio/${id}`),
  getFavorites: (params?: any) => api.get('/audio/favorites', { params }),
}

export const authApi = {
  // 登录
  login: (credentials: { username: string; password: string }) => 
    axios.post('/api/auth/login', credentials),
  
  // 注册
  register: (userData: { 
    username: string; 
    password: string; 
    email: string; 
    phone?: string;
    ext?: any;
  }) => 
    axios.post('/api/auth/register', userData),
  
  // 验证 token
  verifyToken: () => 
    axios.get('/api/auth/verify', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }),
  
  // 获取当前用户
  getCurrentUser: () => 
    axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }),
  
  // 退出登录
  logout: () => 
    axios.post('/api/auth/logout', {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }),
  
  // 更新用户信息
  updateProfile: (updates: any) => 
    axios.put('/api/auth/profile', updates, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
}

export const statsApi = {
  // 基础统计
  count: () => 
    axios.get('/api/stats', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }),

  // 音频格式分布
  getFormatDistribution: () => 
    api.get('/stats/format-distribution', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }),
  
  // 音频时长分布
  getDurationDistribution: () => 
    api.get('/stats/duration-distribution', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }),
  
  // 用户注册趋势
  getUserRegistrationTrend: (days: number = 30) => 
    api.get(`/stats/user-registration-trend?days=${days}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }),
  
  // 标签统计
  getTagStats: () => 
    api.get('/stats/tag-stats', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }),
  
  // 最近上传的音频
  getRecentAudios: (limit: number = 10) => 
    api.get(`/stats/recent-audios?limit=${limit}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }),

  // 收藏最多的音频
  getMostFavoritedAudios: (limit: number = 10) => 
    api.get(`/stats/most-favorited?limit=${limit}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }),
  
  // 下载最多的音频
  getMostDownloadedAudios: (limit: number = 10) => 
    api.get(`/stats/most-downloaded?limit=${limit}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
}

// 添加配置 API
export const configApi = {
  getBasePath: () => api.get('/config/base-path'),
  setBasePath: (basePath: string) => api.post('/config/base-path', { basePath }),
  testBasePath: (basePath: string) => api.post('/config/test-path', { basePath }),
}

export default api