import { ref } from 'vue'

export interface Notification {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

const notifications = ref<Notification[]>([])

export const useNotification = () => {
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now()
    const newNotification = {
      id,
      duration: 3000,
      ...notification
    }
    
    notifications.value.push(newNotification)
    
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }
    
    return id
  }

  const removeNotification = (id: number) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearAll = () => {
    notifications.value = []
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  }
}