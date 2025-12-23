// 音乐控制器 - 处理背景音乐和手势切换
import { AudioManager } from "../core/AudioManager.js";

export class MusicController {
  constructor(treeBuilder) {
    this.audioManager = new AudioManager();
    this.treeBuilder = treeBuilder;
    this.lastSwitchTime = 0;
    this.switchCooldown = 2000; // 2秒冷却时间
  }

  async init() {
    this.audioManager.init();

    // 尝试播放第一首音乐（可能需要用户交互）
    // 这里不自动播放，等待用户手势触发
  }

  handleGestures(gestureState) {
    if (!gestureState) return;

    // 检测音乐切换手势
    if (gestureState.isMusicSwitch) {
      const now = Date.now();
      if (now - this.lastSwitchTime > this.switchCooldown) {
        this.switchMusic();
        this.lastSwitchTime = now;
      }
    }
  }

  switchMusic() {
    if (!this.audioManager.isPlaying) {
      // 如果还没播放，开始播放
      this.audioManager.play(0);
    } else {
      // 如果正在播放，切换到下一首
      this.audioManager.next();
    }
  }

  play() {
    this.audioManager.play();
  }

  pause() {
    this.audioManager.pause();
  }

  stop() {
    this.audioManager.stop();
  }

  setVolume(volume) {
    this.audioManager.setVolume(volume);
  }
}

