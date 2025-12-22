// 手势管理器 - 使用MediaPipe Hands进行手势识别
export class GestureManager {
  constructor() {
    this.rawResults = null;
    this.videoElement = null;
    this.hands = null;
    this.camera = null;
    this.isInitialized = false;
    this.lastHeartTime = 0;
    this.lastMusicSwitchTime = 0;
  }

  async init() {
    console.log("🖐️ 开始加载 MediaPipe Hands...");

    // MediaPipe Hands 必须通过 script 标签加载，不能使用 import
    // 等待 script 标签加载完成（最多等待5秒）
    let waitCount = 0;
    let Hands = null;
    
    while (waitCount < 50) {
      // 检查可能的全局变量名
      Hands = window.Hands || 
              window.MediaPipeHands?.Hands ||
              (window.MediaPipeHands && typeof window.MediaPipeHands === 'function' ? window.MediaPipeHands : null);
      
      if (Hands) {
        console.log("✅ 找到 MediaPipe Hands 全局对象");
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      waitCount++;
      
      if (waitCount % 10 === 0) {
        console.log(`等待 MediaPipe Hands 加载... (${waitCount * 0.1}秒)`);
      }
    }

    if (!Hands) {
      console.error("❌ 无法找到 MediaPipe Hands 全局对象");
      console.error("检查 window 对象中相关的键:", Object.keys(window).filter(k => 
        k.toLowerCase().includes('hand') || 
        k.toLowerCase().includes('mediapipe') ||
        k.toLowerCase().includes('mp')
      ));
      throw new Error("❌ MediaPipe Hands 未通过 script 标签加载。请检查 index.html 中的 script 标签是否正确加载。");
    }

    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469404/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults((results) => {
      this.rawResults = results;
    });

    if (!this.videoElement) {
      this.videoElement = document.createElement('video');
      this.videoElement.style.display = 'none';
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      document.body.appendChild(this.videoElement);
    }

    this.isInitialized = true;
    console.log("✅ MediaPipe Hands 初始化完成");
  }

  async startCamera() {
    try {
      console.log('📷 开始启动摄像头...');
      
      if (!this.hands) {
        await this.init();
      }

      // Camera 也必须通过 script 标签加载
      // 等待 script 标签加载完成（最多等待5秒）
      let waitCount = 0;
      let Camera = null;
      
      while (waitCount < 50) {
        Camera = window.Camera ||
                 window.MediaPipeCamera?.Camera ||
                 (window.MediaPipeCamera && typeof window.MediaPipeCamera === 'function' ? window.MediaPipeCamera : null);
        
        if (Camera) {
          console.log("✅ 找到 MediaPipe Camera 全局对象");
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
        
        if (waitCount % 10 === 0) {
          console.log(`等待 MediaPipe Camera 加载... (${waitCount * 0.1}秒)`);
        }
      }

      if (!Camera) {
        console.error("❌ 无法找到 MediaPipe Camera 全局对象");
        console.error("检查 window 对象中相关的键:", Object.keys(window).filter(k => k.toLowerCase().includes('camera')));
        throw new Error("❌ MediaPipe Camera 未通过 script 标签加载。请检查 index.html 中的 script 标签是否正确加载。");
      }

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.hands) {
            await this.hands.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480,
      });

      await this.camera.start();
      this.isInitialized = true;
      console.log('✅ 摄像头启动成功！');
      return true;
    } catch (error) {
      console.error('❌ 摄像头启动失败:', error);
      console.error('错误详情:', error.stack);
      return false;
    }
  }

  getGestureState() {
    if (!this.rawResults || !this.rawResults.multiHandLandmarks || this.rawResults.multiHandLandmarks.length === 0) {
      return null;
    }

    const landmarks = this.rawResults.multiHandLandmarks;
    const state = {
      numHands: landmarks.length,
      hands: landmarks.map((hand) => ({
        landmarks: hand,
        center: this._getCenter(hand),
        isPinching: this._checkPinch(hand),
        fingersUp: this._getFingersUp(hand),
      })),
    };

    // 双手手势
    if (state.numHands === 2) {
      state.distance = this._getDist(
        state.hands[0].center,
        state.hands[1].center
      );
      // 检测比心手势
      state.isHeartGesture = this._checkHeartGesture(state.hands[0], state.hands[1]);
      // 检测音乐切换手势（双手向上挥手）
      state.isMusicSwitch = this._checkMusicSwitchGesture(state.hands);
    }

    // 单手指向上（切换音乐的另一个手势）
    if (state.numHands === 1 && state.hands[0].fingersUp[1] === 1 && 
        state.hands[0].fingersUp.every((f, i) => i === 1 || f === 0)) {
      const now = Date.now();
      if (now - this.lastMusicSwitchTime > 2000) {
        state.isMusicSwitch = true;
        this.lastMusicSwitchTime = now;
      }
    }

    return state;
  }

  _getCenter(hand) {
    // 使用手掌中心（手腕和手指中点的平均）
    const wrist = hand[0];
    const middleMCP = hand[9];
    return {
      x: (wrist.x + middleMCP.x) / 2,
      y: (wrist.y + middleMCP.y) / 2,
      z: (wrist.z + middleMCP.z) / 2,
    };
  }

  _getDist(p1, p2) {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + 
      Math.pow(p1.y - p2.y, 2) + 
      Math.pow(p1.z - p2.z, 2)
    );
  }

  _checkPinch(hand) {
    // 检查大拇指和食指是否捏合
    const thumbTip = hand[4];
    const indexTip = hand[8];
    const dist = this._getDist(thumbTip, indexTip);
    return dist < 0.05;
  }

  _getFingersUp(hand) {
    // 检测哪些手指是竖起的
    // [拇指, 食指, 中指, 无名指, 小指]
    const fingers = [0, 0, 0, 0, 0];
    
    // 拇指：检查x坐标（左手或右手不同）
    fingers[0] = hand[4].x > hand[3].x ? 1 : 0;
    
    // 其他四指：检查y坐标
    const fingerTips = [8, 12, 16, 20];
    const fingerPIPs = [6, 10, 14, 18];
    
    for (let i = 0; i < 4; i++) {
      fingers[i + 1] = hand[fingerTips[i]].y < hand[fingerPIPs[i]].y ? 1 : 0;
    }
    
    return fingers;
  }

  _checkHeartGesture(hand1, hand2) {
    // 比心手势：两个手的食指和拇指相对靠近，形成心形
    const now = Date.now();
    if (now - this.lastHeartTime < 1000) {
      return false; // 防止重复触发
    }

    const h1 = hand1.landmarks;
    const h2 = hand2.landmarks;

    // 检查两手的食指和拇指是否靠近
    const h1IndexTip = h1[8];
    const h1ThumbTip = h1[4];
    const h2IndexTip = h2[8];
    const h2ThumbTip = h2[4];

    const distIndex = this._getDist(h1IndexTip, h2IndexTip);
    const distThumb = this._getDist(h1ThumbTip, h2ThumbTip);

    // 如果两手的食指和拇指都靠近，认为是比心手势
    if (distIndex < 0.08 && distThumb < 0.08) {
      // 检查是否形成心形（两手的其他手指弯曲）
      const h1FingersUp = this._getFingersUp(h1);
      const h2FingersUp = this._getFingersUp(h2);

      // 比心时，除了拇指和食指，其他手指应该弯曲
      const h1OthersDown = h1FingersUp[2] === 0 && h1FingersUp[3] === 0 && h1FingersUp[4] === 0;
      const h2OthersDown = h2FingersUp[2] === 0 && h2FingersUp[3] === 0 && h2FingersUp[4] === 0;

      if (h1OthersDown && h2OthersDown) {
        this.lastHeartTime = now;
        return true;
      }
    }

    return false;
  }

  _checkMusicSwitchGesture(hands) {
    // 音乐切换手势：双手向上快速移动
    // 这里简化处理，检测双手是否都向上张开
    const h1 = hands[0].landmarks;
    const h2 = hands[1].landmarks;

    const h1FingersUp = this._getFingersUp(h1);
    const h2FingersUp = this._getFingersUp(h2);

    // 检查是否所有手指都向上
    const allFingersUp1 = h1FingersUp.every(f => f === 1);
    const allFingersUp2 = h2FingersUp.every(f => f === 1);

    const now = Date.now();
    if ((allFingersUp1 || allFingersUp2) && now - this.lastMusicSwitchTime > 2000) {
      this.lastMusicSwitchTime = now;
      return true;
    }

    return false;
  }
}
