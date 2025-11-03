import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 1000,
})

// 请求拦截器 - 添加日志
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`)
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

// 添加配置 API
export const configApi = {
  getBasePath: () => api.get('/config/base-path'),
  setBasePath: (basePath: string) => api.post('/config/base-path', { basePath }),
  testBasePath: (basePath: string) => api.post('/config/test-path', { basePath }),
}

export default api