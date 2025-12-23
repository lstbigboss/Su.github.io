// 爆炸控制器 - 控制粒子散开和文字组成
import * as THREE from "three";

export class ExplodeController {
  constructor(treeGroup, defaultText = "MERRY XMAS") {
    this.treeGroup = treeGroup;
    this.defaultText = defaultText;
    this.customText = defaultText;
    this.isExploded = false;
    this.isTextMode = false;
    this.targetPositions = new Map(); // 存储每个粒子的目标位置
    this.originalPositions = new Map(); // 存储原始位置
    this.animationProgress = 0;
    this.animationSpeed = 0.02;
    this.explodeRadius = 15;
  }

  // 设置自定义文字
  setText(text) {
    this.customText = text.toUpperCase().substring(0, 20); // 限制长度
  }

  // 切换爆炸状态
  explode() {
    if (this.isExploded) return;
    
    this.isExploded = true;
    this.isTextMode = false;
    this.animationProgress = 0;
    
    // 为每个粒子生成随机散开位置
    this.treeGroup.children.forEach((points) => {
      const positions = points.geometry.attributes.position;
      const originalPositions = new Float32Array(positions.array);
      this.originalPositions.set(points, originalPositions);
      
      const newPositions = new Float32Array(positions.array);
      const count = positions.count;
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        
        // 计算随机方向
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.explodeRadius;
        
        newPositions[i3] = originalPositions[i3] + Math.sin(angle2) * Math.cos(angle1) * radius;
        newPositions[i3 + 1] = originalPositions[i3 + 1] + Math.cos(angle2) * radius;
        newPositions[i3 + 2] = originalPositions[i3 + 2] + Math.sin(angle2) * Math.sin(angle1) * radius;
      }
      
      this.targetPositions.set(points, newPositions);
    });
  }

  // 恢复树形
  restore() {
    if (!this.isExploded && !this.isTextMode) return;
    
    this.isExploded = false;
    this.isTextMode = false;
    this.animationProgress = 0;
    
    // 恢复原始位置
    this.treeGroup.children.forEach((points) => {
      const original = this.originalPositions.get(points);
      if (original) {
        this.targetPositions.set(points, original);
      }
    });
  }

  // 切换文字模式（比心手势）
  toggle(mode = "TEXT") {
    if (mode === "TEXT") {
      if (this.isTextMode) {
        // 如果已经在文字模式，恢复树形
        this.restore();
      } else {
        // 切换到文字模式
        this.isTextMode = true;
        this.isExploded = false;
        this.animationProgress = 0;
        this._arrangeAsText(this.customText);
      }
    }
  }

  // 将粒子排列成文字
  _arrangeAsText(text) {
    // 计算文字布局
    const charWidth = 2;
    const charHeight = 3;
    const charSpacing = 0.5;
    
    // 估算需要的粒子数
    const totalParticles = this._countParticles();
    const particlesPerChar = Math.floor(totalParticles / text.length);
    
    this.treeGroup.children.forEach((points) => {
      const positions = points.geometry.attributes.position;
      const originalPositions = this.originalPositions.get(points) || new Float32Array(positions.array);
      this.originalPositions.set(points, originalPositions);
      
      const newPositions = new Float32Array(positions.array);
      const count = positions.count;
      
      // 为每个字符分配粒子
      let particleIndex = 0;
      const startX = -(text.length * (charWidth + charSpacing)) / 2;
      
      for (let charIdx = 0; charIdx < text.length; charIdx++) {
        const char = text[charIdx];
        const charX = startX + charIdx * (charWidth + charSpacing);
        
        // 获取字符的点阵数据（简化版，使用预定义字体）
        const charPoints = this._getCharPoints(char, charWidth, charHeight);
        
        // 分配粒子到这个字符
        for (let i = 0; i < charPoints.length && particleIndex < count; i++) {
          const point = charPoints[i];
          const i3 = particleIndex * 3;
          
          // 从原始位置平滑过渡到文字位置
          newPositions[i3] = originalPositions[i3] + (point.x + charX - originalPositions[i3]) * 1.5;
          newPositions[i3 + 1] = originalPositions[i3 + 1] + (point.y - originalPositions[i3 + 1]) * 1.5;
          newPositions[i3 + 2] = originalPositions[i3 + 2] + (point.z - originalPositions[i3 + 2]) * 1.5;
          
          particleIndex++;
        }
      }
      
      // 剩余的粒子随机分布
      for (let i = particleIndex; i < count; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = 8 + Math.random() * 5;
        newPositions[i3] = Math.cos(angle) * radius;
        newPositions[i3 + 1] = (Math.random() - 0.5) * 10;
        newPositions[i3 + 2] = Math.sin(angle) * radius;
      }
      
      this.targetPositions.set(points, newPositions);
    });
  }

  // 获取字符的点阵（简化版ASCII艺术）
  _getCharPoints(char, width, height) {
    const points = [];
    const gridWidth = 5;
    const gridHeight = 7;
    const pixelSize = Math.min(width / gridWidth, height / gridHeight);
    
    // 简化的5x7点阵字体（只包含常用字符）
    const fontData = this._getFontData();
    const pattern = fontData[char] || fontData['?'];
    
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (pattern[y] && pattern[y][x] === '1') {
          points.push({
            x: (x - gridWidth / 2) * pixelSize,
            y: (gridHeight / 2 - y) * pixelSize,
            z: 0
          });
        }
      }
    }
    
    return points;
  }

  // 简化的点阵字体数据
  _getFontData() {
    return {
      'M': [
        '11011',
        '11111',
        '11011',
        '10001',
        '10001',
        '10001',
        '10001'
      ],
      'E': [
        '11111',
        '10000',
        '10000',
        '11110',
        '10000',
        '10000',
        '11111'
      ],
      'R': [
        '11110',
        '10001',
        '10001',
        '11110',
        '10100',
        '10010',
        '10001'
      ],
      'Y': [
        '10001',
        '10001',
        '01010',
        '00100',
        '00100',
        '00100',
        '00100'
      ],
      ' ': [
        '00000',
        '00000',
        '00000',
        '00000',
        '00000',
        '00000',
        '00000'
      ],
      'X': [
        '10001',
        '01010',
        '00100',
        '00100',
        '00100',
        '01010',
        '10001'
      ],
      'A': [
        '00100',
        '01010',
        '10001',
        '11111',
        '10001',
        '10001',
        '10001'
      ],
      'S': [
        '01110',
        '10001',
        '10000',
        '01110',
        '00001',
        '10001',
        '01110'
      ],
      '?': [
        '01110',
        '10001',
        '00001',
        '00110',
        '00100',
        '00000',
        '00100'
      ],
      'I': [
        '11111',
        '00100',
        '00100',
        '00100',
        '00100',
        '00100',
        '11111'
      ],
      'L': [
        '10000',
        '10000',
        '10000',
        '10000',
        '10000',
        '10000',
        '11111'
      ],
      'O': [
        '01110',
        '10001',
        '10001',
        '10001',
        '10001',
        '10001',
        '01110'
      ],
      'V': [
        '10001',
        '10001',
        '10001',
        '10001',
        '10001',
        '01010',
        '00100'
      ],
      'U': [
        '10001',
        '10001',
        '10001',
        '10001',
        '10001',
        '10001',
        '01110'
      ],
      'N': [
        '10001',
        '11001',
        '10101',
        '10011',
        '10001',
        '10001',
        '10001'
      ],
      'T': [
        '11111',
        '00100',
        '00100',
        '00100',
        '00100',
        '00100',
        '00100'
      ],
      'H': [
        '10001',
        '10001',
        '10001',
        '11111',
        '10001',
        '10001',
        '10001'
      ],
      'P': [
        '11110',
        '10001',
        '10001',
        '11110',
        '10000',
        '10000',
        '10000'
      ],
      'C': [
        '01110',
        '10001',
        '10000',
        '10000',
        '10000',
        '10001',
        '01110'
      ],
      'D': [
        '11110',
        '10001',
        '10001',
        '10001',
        '10001',
        '10001',
        '11110'
      ],
      'F': [
        '11111',
        '10000',
        '10000',
        '11110',
        '10000',
        '10000',
        '10000'
      ],
      'G': [
        '01110',
        '10001',
        '10000',
        '10011',
        '10001',
        '10001',
        '01110'
      ],
      'J': [
        '00111',
        '00010',
        '00010',
        '00010',
        '00010',
        '10010',
        '01100'
      ],
      'K': [
        '10001',
        '10010',
        '10100',
        '11000',
        '10100',
        '10010',
        '10001'
      ],
      'Q': [
        '01110',
        '10001',
        '10001',
        '10001',
        '10101',
        '10011',
        '01111'
      ],
      'W': [
        '10001',
        '10001',
        '10001',
        '10001',
        '10101',
        '11011',
        '10001'
      ],
      'Z': [
        '11111',
        '00001',
        '00010',
        '00100',
        '01000',
        '10000',
        '11111'
      ]
    };
  }

  // 计算总粒子数
  _countParticles() {
    let count = 0;
    this.treeGroup.children.forEach((points) => {
      count += points.geometry.attributes.position.count;
    });
    return count;
  }

  // 更新动画
  updateFloating(time) {
    if (!this.isExploded && !this.isTextMode) return;
    
    this.animationProgress = Math.min(1, this.animationProgress + this.animationSpeed);
    
    // 平滑插值到目标位置
    this.treeGroup.children.forEach((points) => {
      const positions = points.geometry.attributes.position;
      const original = this.originalPositions.get(points);
      const target = this.targetPositions.get(points);
      
      if (original && target) {
        for (let i = 0; i < positions.array.length; i++) {
          positions.array[i] = original[i] + (target[i] - original[i]) * this.animationProgress;
        }
        positions.needsUpdate = true;
      }
    });
  }
}

