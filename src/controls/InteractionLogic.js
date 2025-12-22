// 交互逻辑控制器 - 处理手势控制（旋转、缩放、移动、炸开）
import * as THREE from "three";

export class InteractionLogic {
  constructor(targetObject) {
    this.target = targetObject;
    this.lastState = null;
    this.lerpFactor = 0.1;
    this.rotationSensitivity = 3.0;
    this.zoomSensitivity = 2.0;
    this.translationSensitivity = 5.0;
    this.explodeController = null;
    this.isMoving = false;
  }

  apply(gestureState) {
    if (!gestureState || !this.target) return;

    // 1. 单手操作：旋转或平移
    if (gestureState.numHands === 1) {
      const currentHand = gestureState.hands[0];

      if (this.lastState && this.lastState.numHands === 1) {
        const lastHand = this.lastState.hands[0];
        const deltaX = currentHand.center.x - lastHand.center.x;
        const deltaY = currentHand.center.y - lastHand.center.y;

        // 根据手势类型决定操作
        if (currentHand.isPinching) {
          // 捏合手势：平移
          this.target.position.x += deltaX * this.translationSensitivity;
          this.target.position.y -= deltaY * this.translationSensitivity; // Y轴反向
          this.isMoving = true;
        } else {
          // 普通手势：旋转
          this.target.rotation.y += deltaX * this.rotationSensitivity;
          this.isMoving = false;
        }
      }
    }

    // 2. 双手缩放或炸开
    if (gestureState.numHands === 2) {
      if (this.lastState && this.lastState.numHands === 2) {
        const distDiff = gestureState.distance - this.lastState.distance;

        // 检测是否要触发爆炸（双手快速分开）
        if (distDiff > 0.15 && this.explodeController) {
          if (
            !this.explodeController.isExploded &&
            !this.explodeController.isTextMode
          ) {
            this.explodeController.explode();
          } else if (this.explodeController.isExploded) {
            // 如果已炸开，快速合拢可以恢复
            this.explodeController.restore();
          }
        } else if (Math.abs(distDiff) < 0.1) {
          // 正常缩放
          const ratio = gestureState.distance / this.lastState.distance;
          const newScale = this.target.scale.x * ratio;
          const s = THREE.MathUtils.clamp(newScale, 0.3, 3.0);
          this.target.scale.set(s, s, s);
        }
      }
    }

    // 保存当前状态
    this.lastState = JSON.parse(JSON.stringify(gestureState));
  }

  // 重置位置和缩放
  reset() {
    if (this.target) {
      this.target.position.set(0, 0, 0);
      this.target.scale.set(1, 1, 1);
      this.target.rotation.set(0, 0, 0);
    }
  }
}
