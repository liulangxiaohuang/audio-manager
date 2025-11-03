// utils/audioPlayer.ts
class AudioPlayerManager {
  private audioElement: HTMLAudioElement | null = null
  private currentAudioId: string | null = null
  private currentAudioUrl: string | null = null
  private onPlayCallbacks: Map<string, (audioId: string) => void> = new Map()
  private onPauseCallbacks: Map<string, (audioId: string) => void> = new Map()
  private onEndCallbacks: Map<string, (audioId: string) => void> = new Map()
  private onProgressCallbacks: Map<string, (audioId: string, progress: number, currentTime: number) => void> = new Map()
  private onResetCallbacks: Map<string, (audioId: string) => void> = new Map() // 新增：重置回调
  private progressInterval: number | null = null
  private audioProgressMap: Map<string, number> = new Map()

  play(audioUrl: string, audioId: string) {
    console.log('AudioPlayer: 请求播放', audioId)
    
    // 如果点击的是同一个音频
    if (this.currentAudioId === audioId) {
      // 如果正在播放，就暂停
      if (this.audioElement && !this.audioElement.paused) {
        console.log('AudioPlayer: 暂停当前音频')
        this.pause()
        return
      }
      // 如果已暂停，就从保存的位置恢复播放
      else if (this.audioElement) {
        console.log('AudioPlayer: 恢复播放', audioId)
        const savedTime = this.audioProgressMap.get(audioId) || 0
        this.audioElement.currentTime = savedTime
        
        this.audioElement.play().then(() => {
          this.notifyPlayCallbacks(audioId)
          this.startProgressTracking()
        }).catch(error => {
          console.error('恢复播放失败:', error)
        })
        return
      }
    }

    // 如果是不同的音频，先停止当前播放并重置状态
    console.log('AudioPlayer: 播放新音频', audioId, '停止上一个音频', this.currentAudioId)
    
    // 关键修复：在停止前通知上一个音频重置状态，并清除其进度
    if (this.currentAudioId && this.currentAudioId !== audioId) {
      // 清除上一个音频的进度
      this.audioProgressMap.delete(this.currentAudioId)
      this.notifyResetCallbacks(this.currentAudioId)
    }
    
    this.stop()

    // 创建新的音频元素
    this.audioElement = new Audio(audioUrl)
    this.currentAudioId = audioId
    this.currentAudioUrl = audioUrl

    // 关键修复：新音频总是从0开始播放
    this.audioElement.currentTime = 0

    // 设置从保存的位置开始播放
    // const savedTime = this.audioProgressMap.get(audioId) || 0
    // this.audioElement.currentTime = savedTime

    this.audioElement.play().then(() => {
      this.notifyPlayCallbacks(audioId)
      this.startProgressTracking()
    }).catch(error => {
      console.error('播放失败:', error)
    })

    // 监听事件
    this.audioElement.addEventListener('ended', () => {
      console.log('AudioPlayer: 播放结束', audioId)
      // 播放结束时清除进度
      this.audioProgressMap.delete(audioId)
      this.notifyEndCallbacks(audioId)
      this.notifyResetCallbacks(audioId) // 新增：通知重置状态
      this.stopProgressTracking()
      this.currentAudioId = null
      this.audioElement = null
    })

    this.audioElement.addEventListener('pause', () => {
      console.log('AudioPlayer: 音频暂停', audioId)
      // 暂停时保存当前进度
      if (this.audioElement && this.currentAudioId) {
        this.audioProgressMap.set(this.currentAudioId, this.audioElement.currentTime)
      }
      this.notifyPauseCallbacks(audioId)
      this.stopProgressTracking()
    })

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement && this.currentAudioId) {
        const progress = this.audioElement.duration ? 
          (this.audioElement.currentTime / this.audioElement.duration) * 100 : 0
        this.notifyProgressCallbacks(this.currentAudioId, progress, this.audioElement.currentTime)
      }
    })
  }

  pause() {
    if (this.audioElement && !this.audioElement.paused) {
      console.log('AudioPlayer: 执行暂停')
      // 保存当前进度
      if (this.currentAudioId) {
        this.audioProgressMap.set(this.currentAudioId, this.audioElement.currentTime)
      }
      this.audioElement.pause()
      this.notifyPauseCallbacks(this.currentAudioId!)
      this.stopProgressTracking()
    }
  }

  stop() {
    if (this.audioElement) {
      console.log('AudioPlayer: 停止播放')
      // 停止时保存进度
      if (this.currentAudioId) {
        this.audioProgressMap.set(this.currentAudioId, this.audioElement.currentTime)
      }
      this.audioElement.pause()
      this.audioElement.currentTime = 0
      this.audioElement = null
      this.currentAudioId = null
      this.currentAudioUrl = null
      this.stopProgressTracking()
    }
  }

  // 新增：seek 功能
  seek(audioId: string, progress: number) {
    if (this.currentAudioId === audioId && this.audioElement && this.audioElement.duration) {
      console.log('AudioPlayer: 跳转进度', progress)
      const time = (progress / 100) * this.audioElement.duration
      this.audioElement.currentTime = time
      this.audioProgressMap.set(audioId, time)
      
      // 立即通知进度更新
      this.notifyProgressCallbacks(audioId, progress, time)
    }
  }

  getSavedProgress(audioId: string): number {
    return this.audioProgressMap.get(audioId) || 0
  }

  clearSavedProgress(audioId: string) {
    this.audioProgressMap.delete(audioId)
  }

  private startProgressTracking() {
    this.stopProgressTracking()
    
    this.progressInterval = setInterval(() => {
      if (this.audioElement && this.currentAudioId && this.audioElement.duration) {
        const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100
        this.notifyProgressCallbacks(this.currentAudioId, progress, this.audioElement.currentTime)
        
        if (this.audioElement.ended) {
          this.notifyEndCallbacks(this.currentAudioId)
          this.stopProgressTracking()
        }
      }
    }, 100) as unknown as number
  }

  private stopProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval)
      this.progressInterval = null
    }
  }

  // 回调管理方法
  private notifyPlayCallbacks(audioId: string) {
    this.onPlayCallbacks.forEach((callback, id) => {
      if (id === audioId) callback(audioId)
    })
  }

  private notifyPauseCallbacks(audioId: string) {
    this.onPauseCallbacks.forEach((callback, id) => {
      if (id === audioId) callback(audioId)
    })
  }

  private notifyEndCallbacks(audioId: string) {
    this.onEndCallbacks.forEach((callback, id) => {
      if (id === audioId) callback(audioId)
    })
  }

  private notifyProgressCallbacks(audioId: string, progress: number, currentTime: number) {
    this.onProgressCallbacks.forEach((callback, id) => {
      if (id === audioId) callback(audioId, progress, currentTime)
    })
  }

  // 新增：重置状态回调
  private notifyResetCallbacks(audioId: string) {
    this.onResetCallbacks.forEach((callback, id) => {
      if (id === audioId) callback(audioId)
    })
  }

  // 注册回调的方法
  onPlay(audioId: string, callback: (audioId: string) => void) {
    this.onPlayCallbacks.set(audioId, callback)
  }

  onPause(audioId: string, callback: (audioId: string) => void) {
    this.onPauseCallbacks.set(audioId, callback)
  }

  onEnd(audioId: string, callback: (audioId: string) => void) {
    this.onEndCallbacks.set(audioId, callback)
  }

  onProgress(audioId: string, callback: (audioId: string, progress: number, currentTime: number) => void) {
    this.onProgressCallbacks.set(audioId, callback)
  }

  // 新增：注册重置回调
  onReset(audioId: string, callback: (audioId: string) => void) {
    this.onResetCallbacks.set(audioId, callback)
  }

  // 移除回调的方法
  removeCallbacks(audioId: string) {
    this.onPlayCallbacks.delete(audioId)
    this.onPauseCallbacks.delete(audioId)
    this.onEndCallbacks.delete(audioId)
    this.onProgressCallbacks.delete(audioId)
    this.onResetCallbacks.delete(audioId) // 新增：移除重置回调
  }

  setVolume(volume: number) {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume))
    }
  }

  getCurrentAudioId(): string | null {
    return this.currentAudioId
  }

  isPlaying(audioId: string): boolean {
    return this.currentAudioId === audioId && this.audioElement?.paused === false
  }

  getCurrentProgress(): number {
    if (!this.audioElement || !this.audioElement.duration) return 0
    return (this.audioElement.currentTime / this.audioElement.duration) * 100
  }

  getAudioElement(): HTMLAudioElement | null {
    return this.audioElement
  }
}

export const audioPlayer = new AudioPlayerManager()