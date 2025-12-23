// 照片交互控制器 - 处理照片的点击和放大
import * as THREE from "three";

export class PhotoInteraction {
  constructor(camera, photoManager) {
    this.camera = camera;
    this.photoManager = photoManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedPhoto = null;
    this.isExploded = false;
  }

  update(gestureState) {
    if (!gestureState) return;

    // 只在爆炸状态下检测照片选择
    if (!this.isExploded) return;

    // 检测捏合手势（点击照片）
    if (gestureState.numHands === 1) {
      const hand = gestureState.hands[0];
      
      if (hand.isPinching) {
        // 将手势位置转换为屏幕坐标（简化处理，使用屏幕中心）
        this.mouse.x = 0;
        this.mouse.y = 0;
        
        // 更新射线
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // 检测与照片的相交
        const intersects = this.raycaster.intersectObjects(this.photoManager.photoMeshes, true);
        
        if (intersects.length > 0) {
          const photo = intersects[0].object;
          this.selectPhoto(photo);
        }
      }
    }
  }

  selectPhoto(photoMesh) {
    if (this.selectedPhoto === photoMesh) {
      // 如果已经选中，则放大显示
      this.showPhotoModal(photoMesh);
    } else {
      // 取消之前选中的照片
      if (this.selectedPhoto) {
        this.photoManager.resetState(this.selectedPhoto);
      }
      
      // 选中新照片
      this.selectedPhoto = photoMesh;
      this.photoManager.setHover(photoMesh);
    }
  }

  showPhotoModal(photoMesh) {
    // 获取照片纹理
    const texture = photoMesh.material.map;
    if (!texture || !texture.image) return;

    // 创建临时canvas来获取图片数据
    const canvas = document.createElement('canvas');
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(texture.image, 0, 0);
    
    // 显示模态框
    const modal = document.getElementById('photo-modal');
    const modalImage = document.getElementById('modal-image');
    modalImage.src = canvas.toDataURL();
    modal.style.display = 'flex';
    
    // 点击关闭
    const closeBtn = document.querySelector('.close-modal');
    const closeModal = () => {
      modal.style.display = 'none';
    };
    
    closeBtn.onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };
  }

  setExploded(exploded) {
    this.isExploded = exploded;
  }

  // 使用鼠标点击（作为备用方案）
  handleMouseClick(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.photoManager.photoMeshes, true);
    
    if (intersects.length > 0) {
      const photo = intersects[0].object;
      this.selectPhoto(photo);
    }
  }
}

