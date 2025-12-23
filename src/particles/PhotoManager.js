// 照片管理器 - 管理照片粒子的加载和显示
import * as THREE from "three";

export class PhotoManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.photosGroup = new THREE.Group();
    this.loader = new THREE.TextureLoader();
    this.photoMeshes = [];
    this.config = {
      baseSize: 0.6,
      hoverSize: 1.2,
      viewSize: 5.0,
      treeHeight: 20,
      treeRadius: 6,
    };
  }

  async init(imageUrls) {
    // 如果图片URL为空或加载失败，使用占位图片
    const placeholderUrls = this._generatePlaceholderUrls(imageUrls.length);
    
    const textures = await Promise.all(
      imageUrls.map((url, index) => 
        this._loadTexture(url).catch(() => 
          this._loadTexture(placeholderUrls[index])
        )
      )
    );

    textures.forEach((texture, index) => {
      if (!texture) {
        // 如果还是加载失败，创建彩色占位符
        texture = this._createPlaceholderTexture();
      }

      const aspect = texture.image ? 
        (texture.image.width / texture.image.height) : 1;
      const geometry = new THREE.PlaneGeometry(1 * aspect, 1);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthTest: true,
      });

      const mesh = new THREE.Mesh(geometry, material);
      const pos = this._calculatePosition(index, textures.length);
      mesh.position.copy(pos);

      const scale = this.config.baseSize;
      mesh.scale.set(scale, scale, scale);

      mesh.userData = {
        id: index,
        isPhoto: true,
        originPos: pos.clone(),
        originScale: new THREE.Vector3(scale, scale, scale),
        state: "idle",
        floatOffset: Math.random() * 100,
      };

      this.photosGroup.add(mesh);
      this.photoMeshes.push(mesh);
    });

    this.scene.add(this.photosGroup);
  }

  _loadTexture(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (tex) => {
          tex.needsUpdate = true;
          resolve(tex);
        },
        undefined,
        (error) => {
          console.warn('图片加载失败:', url);
          reject(error);
        }
      );
    });
  }

  _generatePlaceholderUrls(count) {
    // 使用在线占位图服务
    return Array.from({ length: count }, (_, i) => 
      `https://picsum.photos/200/200?random=${i}`
    );
  }

  _createPlaceholderTexture() {
    // 创建彩色占位符纹理
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', 
      '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e2'
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#fff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', 100, 100);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  _calculatePosition(i, total) {
    const { treeHeight, treeRadius } = this.config;
    const yRatio = 0.1 + Math.random() * 0.8;
    const y = yRatio * treeHeight - treeHeight / 2;
    const rBase = treeRadius * (1 - yRatio);
    const r = rBase * (0.8 + Math.random() * 0.3);
    const angle = Math.random() * Math.PI * 2;

    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    return new THREE.Vector3(x, y, z);
  }

  update(time) {
    this.photoMeshes.forEach((mesh) => {
      mesh.lookAt(this.camera.position);

      if (mesh.userData.state === "idle") {
        const floatSpeed = 1.5;
        const amp = 0.1;
        const offset = mesh.userData.floatOffset;

        mesh.position.y =
          mesh.userData.originPos.y +
          Math.sin(time * floatSpeed + offset) * amp;
      }
    });
  }

  setHover(mesh) {
    if (mesh.userData.state === "active") return;
    mesh.scale.setScalar(this.config.hoverSize);
    mesh.material.opacity = 1.0;
    mesh.userData.state = "hover";
  }

  resetState(mesh) {
    if (mesh.userData.state === "active") return;
    mesh.scale.copy(mesh.userData.originScale);
    mesh.material.opacity = 0.85;
    mesh.userData.state = "idle";
  }

  // 散开时重新分布照片位置
  explode(radius = 15) {
    this.photoMeshes.forEach((mesh) => {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      
      mesh.userData.explodedPos = new THREE.Vector3(
        Math.sin(angle2) * Math.cos(angle1) * r,
        Math.cos(angle2) * r,
        Math.sin(angle2) * Math.sin(angle1) * r
      );
    });
  }

  restore() {
    this.photoMeshes.forEach((mesh) => {
      mesh.userData.explodedPos = null;
    });
  }
}