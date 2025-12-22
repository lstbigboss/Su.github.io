// 树构建器 - 创建包含多种圣诞元素的粒子树
import * as THREE from "three";

export class TreeBuilder {
  constructor(scene) {
    this.scene = scene;
    this.treeGroup = new THREE.Group();
    this.particles = []; // 存储所有粒子位置，用于后续散开动画
  }

  // 辅助函数：生成圆锥螺旋上的点
  _calculatePosition(i, count, height, maxRadius, type) {
    const yRatio = i / count;
    const radius = maxRadius * (1 - yRatio) + Math.random() * 0.5;
    const angle = i * 2.5 + Math.random();
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = yRatio * height - height / 2;
    const scale = type === "star" ? 1.1 : 1.0;
    return new THREE.Vector3(x * scale, y, z * scale);
  }

  // 创建礼物盒粒子
  _createGiftPosition(basePos) {
    // 礼物盒稍大一些，位置稍微偏移
    return basePos.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      )
    );
  }

  // 创建铃铛粒子
  _createBellPosition(basePos) {
    return basePos.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      )
    );
  }

  createTree(config = {}) {
    const { height = 20, radius = 6, count = 20000 } = config;

    // 定义更多类型的粒子
    const layers = {
      leaf: {
        positions: [],
        colors: [],
        sizes: [],
        size: 0.15,
        baseColor: new THREE.Color(0x2d5a27),
      },
      gold: {
        positions: [],
        colors: [],
        sizes: [],
        size: 0.4,
        baseColor: new THREE.Color(0xffd700),
      },
      red: {
        positions: [],
        colors: [],
        sizes: [],
        size: 0.5,
        baseColor: new THREE.Color(0xc41e3a),
      },
      star: {
        positions: [],
        colors: [],
        sizes: [],
        size: 0.6,
        baseColor: new THREE.Color(0xffffff),
      },
      gift: {
        positions: [],
        colors: [],
        sizes: [],
        size: 0.7,
        baseColor: new THREE.Color(0xff6347), // 番茄红礼物盒
      },
      bell: {
        positions: [],
        colors: [],
        sizes: [],
        size: 0.5,
        baseColor: new THREE.Color(0xffd700), // 金色铃铛
      },
      snowflake: {
        positions: [],
        colors: [],
        sizes: [],
        size: 0.3,
        baseColor: new THREE.Color(0xe6f3ff), // 淡蓝色雪花
      },
    };

    // 生成粒子并分类
    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let type = "leaf";

      // 概率分布
      if (rand > 0.97) type = "star";
      else if (rand > 0.93) type = "red";
      else if (rand > 0.88) type = "gift";
      else if (rand > 0.85) type = "bell";
      else if (rand > 0.82) type = "gold";
      else if (rand > 0.79) type = "snowflake";

      const basePos = this._calculatePosition(i, count, height, radius, type);
      let pos = basePos.clone();

      // 特殊处理某些类型的位置
      if (type === "gift") {
        pos = this._createGiftPosition(basePos);
      } else if (type === "bell") {
        pos = this._createBellPosition(basePos);
      }

      layers[type].positions.push(pos.x, pos.y, pos.z);

      // 颜色变化
      const baseColor = layers[type].baseColor.clone();
      if (type === "gift") {
        // 礼物盒有不同颜色（红、绿、蓝、紫）
        const giftColors = [
          new THREE.Color(0xff6347),
          new THREE.Color(0x32cd32),
          new THREE.Color(0x4169e1),
          new THREE.Color(0x9370db),
        ];
        baseColor.copy(giftColors[Math.floor(Math.random() * giftColors.length)]);
      }
      
      const variantColor = baseColor.clone().multiplyScalar(0.8 + Math.random() * 0.4);
      layers[type].colors.push(variantColor.r, variantColor.g, variantColor.b);
      
      // 存储大小
      layers[type].sizes.push(layers[type].size * (0.8 + Math.random() * 0.4));
    }

    // 构建Geometry并组装
    for (const [type, data] of Object.entries(layers)) {
      if (data.positions.length === 0) continue;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(data.positions, 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(data.colors, 3)
      );
      geometry.setAttribute(
        "size",
        new THREE.Float32BufferAttribute(data.sizes, 1)
      );

      // 材质区分
      let material;

      if (type === "leaf" || type === "red" || type === "gift") {
        // 实心物体感
        material = new THREE.PointsMaterial({
          size: data.size,
          vertexColors: true,
          map: this._createDiscTexture(),
          alphaTest: 0.5,
          transparent: false,
          sizeAttenuation: true,
        });
      } else {
        // 发光装饰感 (Gold, Star, Bell, Snowflake)
        material = new THREE.PointsMaterial({
          size: data.size,
          vertexColors: true,
          map: this._createGlowTexture(),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          opacity: 0.8,
          sizeAttenuation: true,
        });
      }

      geometry.userData = { type: type, originalSize: data.size };

      const points = new THREE.Points(geometry, material);
      points.name = `tree_${type}`;
      
      // 存储原始位置以便散开动画
      points.userData.originalPositions = new Float32Array(data.positions);
      
      this.treeGroup.add(points);
    }

    this.scene.add(this.treeGroup);
    return this.treeGroup;
  }

  // 辅助：程序化生成圆形纹理
  _createDiscTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  // 辅助：程序化生成发光纹理
  _createGlowTexture() {
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
  }

  // 获取所有粒子位置（用于散开动画）
  getAllParticlePositions() {
    const positions = [];
    this.treeGroup.children.forEach((points) => {
      const posArray = points.geometry.attributes.position.array;
      for (let i = 0; i < posArray.length; i += 3) {
        positions.push(new THREE.Vector3(posArray[i], posArray[i + 1], posArray[i + 2]));
      }
    });
    return positions;
  }

  // 每一帧调用的动画更新函数
  update(time) {
    this.treeGroup.children.forEach((points) => {
      const type = points.geometry.userData.type;
      
      // 闪烁动画
      if (type === "gold" || type === "star" || type === "bell") {
        const baseSize = points.geometry.userData.originalSize;
        const freq = type === "star" ? 3 : type === "bell" ? 2 : 1;
        const scale = 1 + Math.sin(time * freq) * 0.3;
        points.material.size = baseSize * scale;
      }

      // 雪花旋转
      if (type === "snowflake") {
        const baseSize = points.geometry.userData.originalSize;
        const scale = 1 + Math.sin(time * 2) * 0.2;
        points.material.size = baseSize * scale;
      }
    });

    // 整体缓慢旋转（可选）
    // this.treeGroup.rotation.y = time * 0.1;
  }
}