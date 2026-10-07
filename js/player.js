import { CONFIG } from './config.js';

/**
 * 玩家控制與狀態管理類別 (Player Controller)
 * 負責維護滑鼠/觸控拖曳切割狀態、刀刃光效生成及線段碰撞幾何計算
 */
export class Player {
  /**
   * @param {HTMLElement} container 遊戲容器
   */
  constructor(container) {
    this.container = container;
    this.isSlicing = false;
    this.lastPointer = null;
    this.enabled = false;

    // 事件回調
    this.onSliceCallback = null;
    this.onSpaceCallback = null;

    // 綁定事件處理器上下文
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * 初始化事件監聽
   * @param {Object} callbacks
   * @param {Function} callbacks.onSlice 切割劃過時的回調 (x1, y1, x2, y2)
   * @param {Function} callbacks.onSpace 按下空白鍵時的回調
   */
  init({ onSlice, onSpace } = {}) {
    this.onSliceCallback = onSlice;
    this.onSpaceCallback = onSpace;

    this.container.addEventListener('pointerdown', this.handlePointerDown);
    this.container.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 設定玩家操控啟用狀態
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.isSlicing = false;
      this.lastPointer = null;
    }
  }

  /**
   * 取得相對於遊戲容器的指針座標
   * @param {PointerEvent} e 
   * @returns {{x: number, y: number}}
   */
  getPointerPos(e) {
    const rect = this.container.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  handlePointerDown(e) {
    if (!this.enabled || (e.target && (e.target.closest('button') || e.target.closest('.card')))) {
      return;
    }
    this.isSlicing = true;
    this.lastPointer = this.getPointerPos(e);
    e.preventDefault();
  }

  handlePointerMove(e) {
    if (!this.enabled || !this.isSlicing) return;
    const current = this.getPointerPos(e);

    if (this.lastPointer) {
      // 繪製刀光效果
      this.createSlash(this.lastPointer.x, this.lastPointer.y, current.x, current.y);

      // 觸發切割判定回調
      if (this.onSliceCallback) {
        this.onSliceCallback(this.lastPointer.x, this.lastPointer.y, current.x, current.y);
      }
    }

    this.lastPointer = current;
    e.preventDefault();
  }

  handlePointerUp() {
    this.isSlicing = false;
    this.lastPointer = null;
  }

  handleKeyDown(e) {
    if (e.code === 'Space') {
      if (this.onSpaceCallback) {
        this.onSpaceCallback(e);
      }
    }
  }

  /**
   * 生成刀光軌跡視覺元素
   * @param {number} x1 起點 X
   * @param {number} y1 起點 Y
   * @param {number} x2 終點 X
   * @param {number} y2 終點 Y
   */
  createSlash(x1, y1, x2, y2) {
    const slash = document.createElement('div');
    slash.className = 'slash';
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);

    slash.style.left = `${x1}px`;
    slash.style.top = `${y1}px`;
    slash.style.width = `${Math.max(20, len)}px`;
    slash.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;

    this.container.appendChild(slash);
    setTimeout(() => {
      slash.remove();
    }, CONFIG.TIMERS.SLASH_DURATION);
  }

  /**
   * 計算點到線段之垂直/最短距離
   * @param {number} px 目標點 X
   * @param {number} py 目標點 Y
   * @param {number} x1 線段起點 X
   * @param {number} y1 線段起點 Y
   * @param {number} x2 線段終點 X
   * @param {number} y2 線段終點 Y
   * @returns {number} 距離 (px)
   */
  static distanceToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  /**
   * 檢測目標點是否與刀刃線段發生接觸判定
   * @param {number} px 目標點 X
   * @param {number} py 目標點 Y
   * @param {number} x1 線段起點 X
   * @param {number} y1 線段起點 Y
   * @param {number} x2 線段終點 X
   * @param {number} y2 線段終點 Y
   * @param {number} hitRadius 命中判定半徑
   * @returns {boolean}
   */
  static checkHit(px, py, x1, y1, x2, y2, hitRadius = CONFIG.SLICE_HIT_RADIUS) {
    return Player.distanceToSegment(px, py, x1, y1, x2, y2) < hitRadius;
  }

  /**
   * 重設玩家操作狀態
   */
  reset() {
    this.isSlicing = false;
    this.lastPointer = null;
  }

  /**
   * 移除所有監聽事件
   */
  destroy() {
    this.container.removeEventListener('pointerdown', this.handlePointerDown);
    this.container.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}
