import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAudioStore } from '@/store/audio'

// 扩展路由meta类型
declare module 'vue-router' {
  interface RouteMeta {
    layout?: string
    authRequired?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/components/layout/DefaultLayout.vue'),
    meta: { authRequired: true },
    children: [
      {
        path: '',
        name: 'Folder',
        component: () => import('@/views/FolderView.vue')
      },
      {
        path: '/folder/:path*',
        name: 'FolderPath',
        component: () => import('@/views/FolderView.vue')
      },
      {
        path: '/favorites',
        name: 'Favorites',
        component: () => import('@/views/FavoritesView.vue')
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/components/layout/CleanLayout.vue'),
    meta: { layout: 'CleanLayout' },
    children: [
      {
        path: '/login',
        component: () => import('@/views/LoginView.vue')
      }
    ]
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/components/layout/AdminLayout.vue'),
    meta: { layout: 'AdminLayout', authRequired: true },
    children: [
      {
        path: '/admin',
        component: () => import('@/views/AdminView.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/components/layout/CleanLayout.vue'),
    meta: { layout: 'CleanLayout' },
    children: [
      {
        path: '/:pathMatch(.*)*',
        component: () => import('@/views/NotFoundView.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 权限检查
router.beforeEach((to, from, next) => {
  const audioStore = useAudioStore()

  // 如果认证状态尚未初始化，先同步恢复认证状态
  if (!audioStore.authInitialized) {
    audioStore.restoreAuthFromStorage()
  }
  
  console.log(1000000, audioStore.isAuthenticated)
  
  // 检查是否需要认证
  if (to.meta.authRequired && !audioStore.isAuthenticated) {
    next('/login')
    return
  }
  
  // 如果已经登录，访问登录页则重定向到首页
  if (to.name === 'Login' && audioStore.isAuthenticated) {
    next('/')
    return
  }
  
  next()
})

export default router