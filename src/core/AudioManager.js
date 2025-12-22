// 音频管理器 - 管理背景音乐播放
export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.currentAudio = null;
    this.audioList = [];
    this.currentIndex = 0;
    this.volume = 0.3;
    this.isPlaying = false;
  }

  init() {
    try {
      // 使用Web Audio API创建音频上下文
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.error('音频上下文创建失败:', error);
    }

    // 默认音乐列表
    // 用户可以添加自己的音乐文件到 assets/audio/ 目录，命名为 music1.mp3, music2.mp3 等
    // 或者使用在线音乐URL
    this.audioList = [
      'assets/audio/music1.mp3',
      'assets/audio/music2.mp3',
      'assets/audio/music3.mp3',
    ];

    // 如果本地音乐不存在，使用在线圣诞音乐（需要用户提供或使用公共资源）
    // 注意：GitHub Pages上可以放置音乐文件在assets/audio/目录中
  }

  async loadAudio(url) {
    return new Promise((resolve, reject) => {
      if (!this.audioContext) {
        reject(new Error('音频上下文未初始化'));
        return;
      }

      const audio = new Audio(url);
      audio.volume = this.volume;
      audio.loop = true;
      audio.crossOrigin = 'anonymous';

      audio.addEventListener('canplaythrough', () => {
        resolve(audio);
      });

      audio.addEventListener('error', (e) => {
        console.error('音频加载失败:', url, e);
        // 如果加载失败，尝试使用默认的圣诞音乐（在线生成或使用base64）
        this._loadDefaultMusic().then(resolve).catch(reject);
      });

      audio.load();
    });
  }

  async _loadDefaultMusic() {
    // 如果所有音乐都加载失败，使用静默音频
    const silentAudio = new Audio();
    silentAudio.volume = 0;
    return silentAudio;
  }

  async play(index = null) {
    if (index !== null) {
      this.currentIndex = index;
    }

    // 停止当前播放
    if (this.currentAudio) {
      this.stop();
    }

    try {
      const url = this.audioList[this.currentIndex % this.audioList.length];
      this.currentAudio = await this.loadAudio(url);
      
      // 尝试播放（需要用户交互后才能自动播放）
      const playPromise = this.currentAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            console.log('音乐开始播放');
          })
          .catch((error) => {
            console.log('自动播放被阻止，需要用户交互:', error);
            this.isPlaying = false;
          });
      }
    } catch (error) {
      console.error('播放音乐失败:', error);
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.isPlaying = false;
    }
  }

  pause() {
    if (this.currentAudio && this.isPlaying) {
      this.currentAudio.pause();
      this.isPlaying = false;
    }
  }

  resume() {
    if (this.currentAudio && !this.isPlaying) {
      this.currentAudio.play().catch((error) => {
        console.error('恢复播放失败:', error);
      });
      this.isPlaying = true;
    }
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.audioList.length;
    this.play();
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }
}
