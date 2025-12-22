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
    try {
      console.log('开始加载MediaPipe Hands...');
      
      // 首先检查是否已经通过script标签加载（全局对象）
      if (typeof window !== 'undefined' && window.Hands) {
        console.log('✅ 发现全局Hands对象（通过script标签加载）');
        const Hands = window.Hands;
        
        this.hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469404/${file}`;
          },
        });
        
        this.hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
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
        
        console.log('GestureManager初始化完成（使用全局对象）');
        return;
      }
      
      // 如果没有全局对象，尝试动态导入
      console.log('未找到全局对象，尝试动态导入...');
      
      // 尝试多个CDN源
      const cdnUrls = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469404/hands.js',
        'https://unpkg.com/@mediapipe/hands@0.4.1675469404/hands.js'
      ];
      
      let handsModule = null;
      let lastError = null;
      
      for (const url of cdnUrls) {
        try {
          console.log(`尝试从 ${url} 加载...`);
          handsModule = await import(url);
          console.log(`✅ 成功从 ${url} 加载`);
          console.log('MediaPipe模块加载完成，模块内容:', Object.keys(handsModule));
          break;
        } catch (err) {
          console.warn(`❌ 从 ${url} 加载失败:`, err.message);
          lastError = err;
          continue;
        }
      }
      
      if (!handsModule) {
        throw new Error(`所有CDN都加载失败。请检查网络连接或尝试刷新页面。\n最后一个错误: ${lastError?.message || '未知错误'}`);
      }
      
      // 尝试多种方式获取Hands类
      const Hands = handsModule.Hands || 
                    handsModule.default?.Hands ||
                    (handsModule.default && typeof handsModule.default === 'function' ? handsModule.default : null) ||
                    window.Hands; // 最后尝试全局对象
      
      if (!Hands) {
        console.error('无法找到Hands类。模块导出:', handsModule);
        throw new Error('MediaPipe Hands模块加载失败：无法找到Hands类');
      }
      
      console.log('✅ 成功获取Hands类');

      this.hands = new Hands({
        locateFile: (file) => {
          // 使用jsdelivr CDN作为主要源
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469404/${file}`;
        },
      });

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
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
      
      console.log('GestureManager初始化完成');
    } catch (error) {
      console.error('GestureManager初始化失败:', error);
      throw error;
    }
  }

  async startCamera() {
    try {
      console.log('开始启动摄像头...');
      
      if (!this.hands) {
        await this.init();
      }

      console.log('加载Camera工具...');
      
      // 尝试多个CDN源
      const cameraUrls = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js',
        'https://unpkg.com/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js',
        'https://esm.sh/@mediapipe/camera_utils@0.3.1640029074'
      ];
      
      let cameraModule = null;
      let lastCameraError = null;
      
      for (const url of cameraUrls) {
        try {
          console.log(`尝试从 ${url} 加载Camera...`);
          cameraModule = await import(url);
          console.log(`✅ 成功从 ${url} 加载Camera`);
          console.log('Camera模块加载完成，模块内容:', Object.keys(cameraModule));
          break;
        } catch (err) {
          console.warn(`❌ 从 ${url} 加载Camera失败:`, err.message);
          lastCameraError = err;
          continue;
        }
      }
      
      if (!cameraModule) {
        throw new Error(`所有CDN都无法加载Camera。最后一个错误: ${lastCameraError?.message || '未知错误'}`);
      }
      
      // 优先尝试全局对象（通过script标签加载）
      const Camera = window.Camera ||
                     cameraModule.Camera || 
                     cameraModule.default?.Camera ||
                     (cameraModule.default && typeof cameraModule.default === 'function' ? cameraModule.default : null);
      
      if (!Camera) {
        console.error('无法找到Camera类。模块导出:', cameraModule);
        throw new Error('Camera工具模块加载失败：无法找到Camera类');
      }
      
      console.log('✅ 成功获取Camera类');

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.hands) {
            await this.hands.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480,
      });

      console.log('尝试启动摄像头...');
      await this.camera.start();
      this.isInitialized = true;
      console.log('摄像头启动成功！');
      return true;
    } catch (error) {
      console.error('摄像头启动失败:', error);
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
