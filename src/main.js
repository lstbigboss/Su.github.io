import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { TreeBuilder } from "./particles/TreeBuilder.js";
import { PhotoManager } from "./particles/PhotoManager.js";
import { GestureManager } from "./core/GestureManager.js";
import { ExplodeController } from "./particles/ExplodeController.js";
import { InteractionLogic } from "./controls/InteractionLogic.js";
import { PhotoInteraction } from "./controls/PhotoInteraction.js";
import { MusicController } from "./controls/MusicController.js";
import { AudioManager } from "./core/AudioManager.js";

// --- 1. 初始化 Three.js 基础 ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.02);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ReinhardToneMapping;
document.getElementById("canvas-container").appendChild(renderer.domElement);

// --- 2. 后期处理 (Bloom 辉光效果) ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
);
bloomPass.threshold = 0;
bloomPass.strength = 1.2;
bloomPass.radius = 0.5;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- 3. 模块实例化 ---
const treeBuilder = new TreeBuilder(scene);
const treeGroup = treeBuilder.createTree();

// 获取自定义文字（从输入框或使用默认值）
const getCustomText = () => {
  const input = document.getElementById("heart-text-input");
  return input ? input.value.toUpperCase().substring(0, 20) : "MERRY XMAS";
};

const explodeController = new ExplodeController(treeGroup, getCustomText());

const photoManager = new PhotoManager(scene, camera);
const gestureManager = new GestureManager();
const interactionLogic = new InteractionLogic(treeGroup);
const photoInteraction = new PhotoInteraction(camera, photoManager);
const musicController = new MusicController(treeBuilder);

// 绑定 ExplodeController 到交互逻辑中
interactionLogic.explodeController = explodeController;
photoInteraction.setExploded(false);

// --- 4. 资源加载 ---
// 照片URL列表（如果assets/photos中有图片，使用相对路径；否则使用占位图）
const imageUrls = Array.from(
  { length: 30 },
  (_, i) => `assets/photos/img${i + 1}.jpg`
);
photoManager.init(imageUrls).catch(err => {
  console.warn('部分照片加载失败，将使用占位图:', err);
});

// --- 5. UI交互 ---
let cameraStarted = false;

// 等待DOM加载后再绑定事件
function setupUI() {
  const startCameraBtn = document.getElementById("start-camera-btn");
  const cameraPermissionDiv = document.getElementById("camera-permission");
  const customTextInput = document.getElementById("custom-text-input");
  const overlay = document.getElementById("overlay");

  if (!startCameraBtn) {
    console.error("找不到摄像头启动按钮！当前DOM状态:", document.readyState);
    console.error("尝试查找的元素:", document.getElementById("start-camera-btn"));
    return;
  }

  console.log("✅ 找到摄像头启动按钮，准备绑定点击事件");

  // 移除可能存在的旧事件监听器（通过克隆节点）
  const newBtn = startCameraBtn.cloneNode(true);
  startCameraBtn.parentNode.replaceChild(newBtn, startCameraBtn);
  const btn = newBtn;

  console.log("✅ 绑定点击事件监听器");
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🖱️ 按钮被点击了！");
    
    try {
      btn.disabled = true;
      btn.textContent = "正在启动摄像头...";
      
      console.log("开始初始化摄像头...");
      const success = await gestureManager.startCamera();
      
      if (success) {
        console.log("摄像头启动成功");
        cameraStarted = true;
        cameraPermissionDiv.style.display = "none";
        customTextInput.style.display = "block";
        
        // 延迟隐藏覆盖层
        setTimeout(() => {
          overlay.classList.add("hidden");
        }, 2000);
        
        // 初始化音乐控制器
        await musicController.init();
        
        console.log("所有组件初始化完成");
      } else {
        alert("无法访问摄像头，请检查权限设置或查看控制台错误信息");
        btn.disabled = false;
        btn.textContent = "启用摄像头";
      }
    } catch (error) {
      console.error("摄像头启动出错:", error);
      alert("摄像头启动失败: " + error.message + "\n\n请查看浏览器控制台获取详细信息");
      btn.disabled = false;
      btn.textContent = "启用摄像头";
    }
  });

  // 测试：添加一个简单的点击测试
  btn.style.cursor = 'pointer';
  btn.addEventListener('mouseenter', () => {
    console.log('鼠标悬停在按钮上');
  });

  // 自定义文字保存
  const saveTextBtn = document.getElementById("save-text-btn");
  if (saveTextBtn) {
    saveTextBtn.addEventListener("click", () => {
      const text = getCustomText();
      explodeController.setText(text);
      alert(`文字已设置为: ${text}`);
    });
  }

  // 照片模态框关闭
  const closeModal = document.querySelector(".close-modal");
  const photoModal = document.getElementById("photo-modal");
  if (closeModal) {
    closeModal.addEventListener("click", () => {
      photoModal.style.display = "none";
    });
  }
}

// --- 6. 手势驱动与渲染循环 ---
async function initInteraction() {
  // 不自动启动摄像头，等待用户点击按钮
  console.log("等待用户启动摄像头...");
}

// 初始化UI - 确保DOM已加载
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM加载完成，初始化UI");
    setupUI();
  });
} else {
  // DOM已经加载完成
  console.log("DOM已加载，立即初始化UI");
  setupUI();
}

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() * 0.001;

  if (cameraStarted) {
    const gestureState = gestureManager.getGestureState();

    if (gestureState) {
      // 分发手势指令到各个控制器
      interactionLogic.apply(gestureState); // 旋转/缩放/炸开
      photoInteraction.update(gestureState); // 照片选中/放大
      musicController.handleGestures(gestureState); // 音乐切换/播放

      // 特殊状态判断：比心手势文字模式
      if (gestureState.isHeartGesture) {
        explodeController.toggle("TEXT");
      }
    }

    // 更新爆炸状态
    photoInteraction.setExploded(explodeController.isExploded || explodeController.isTextMode);
  }

  // 更新各个模块的动画
  treeBuilder.update(time);
  photoManager.update(time);
  explodeController.updateFloating(time);

  // 添加雪花飘落效果
  updateSnowflakes(time);

  // 使用后期处理渲染
  composer.render();
}

// 添加环境雪花
const snowGeometry = new THREE.BufferGeometry();
const snowCount = 500;
const snowPositions = [];

for (let i = 0; i < snowCount; i++) {
  snowPositions.push(
    (Math.random() - 0.5) * 50,
    Math.random() * 50,
    (Math.random() - 0.5) * 50
  );
}

snowGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(snowPositions, 3)
);

// 创建雪花纹理
const createSnowTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.8)");
  grad.addColorStop(0.6, "rgba(255,255,255,0.3)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

const snowTexture = createSnowTexture();
const snowMaterial = new THREE.PointsMaterial({
  size: 0.1,
  color: 0xffffff,
  map: snowTexture,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const snow = new THREE.Points(snowGeometry, snowMaterial);
scene.add(snow);

function updateSnowflakes(time) {
  const positions = snow.geometry.attributes.position.array;
  for (let i = 1; i < positions.length; i += 3) {
    positions[i] -= 0.02;
    if (positions[i] < -25) {
      positions[i] = 25;
      positions[i - 1] = (Math.random() - 0.5) * 50;
      positions[i + 1] = (Math.random() - 0.5) * 50;
    }
  }
  snow.geometry.attributes.position.needsUpdate = true;
  snow.rotation.y = time * 0.01;
}

// 处理窗口调整
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// 鼠标点击作为备用交互方式
renderer.domElement.addEventListener("click", (event) => {
  if (cameraStarted && explodeController.isExploded) {
    photoInteraction.handleMouseClick(event);
  }
});

// 启动
initInteraction();

// 启动基础动画（无论是否启用摄像头都显示场景）
animate();