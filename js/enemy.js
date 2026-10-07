import { CONFIG } from './config.js';
import { Player } from './player.js';

/**
 * 障礙物(炸彈)與目標(水果)實體類別 (Enemy / Target Entity)
 */
export class EnemyItem {
  constructor({ id, x, y, vx, vy, rot, vr, bomb, content, size, container }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.rot = rot;
    this.vr = vr;
    this.bomb = bomb;
    this.content = content;
    this.size = size;
    this.sliced = false;
    this.container = container;

    // 建立 DOM 元素
    this.el = document.createElement('div');
    this.el.className = 'item' + (this.bomb ? ' bomb' : '');
    this.el.textContent = this.content;
    this.el.style.width = `${this.size}px`;
    this.el.style.height = `${this.size}px`;

    this.container.appendChild(this.el);
    this.render();
  }

  /**
   * 物理位移與旋轉狀態更新
   * @param {number} dt 幀時長 (秒)
   */
  update(dt) {
    this.vy += CONFIG.GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.vr * dt;
  }

  /**
   * 將座標與旋轉同步至 DOM
   */
  render() {
    this.el.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${this.rot}deg)`;
  }

  /**
   * 取得實體幾何中心點
   * @returns {{x: number, y: number}}
   */
  getCenter() {
    return {
      x: this.x + CONFIG.ITEM_CENTER_OFFSET,
      y: this.y + CONFIG.ITEM_CENTER_OFFSET
    };
  }

  /**
   * 銷毀元素
   */
  destroy() {
    if (this.el && this.el.parentNode) {
      this.el.remove();
    }
  }
}

/**
 * 障礙物與水果實體管理器 (Enemy / Obstacle Manager)
 * 負責實體生命週期管理、動態拋射、邊界碰撞與自動切割排程
 */
export class EnemyManager {
  /**
   * @param {HTMLElement} container 遊戲容器
   * @param {Object} options
   * @param {Function} options.onAutoCut 自動切割時的回調
   */
  constructor(container, { onAutoCut } = {}) {
    this.container = container;
    this.onAutoCut = onAutoCut;
    this.items = new Map();
    this.nextId = 1;
    this.autoSlice = true;
  }

  setAutoSlice(enabled) {
    this.autoSlice = enabled;
  }

  isAutoSliceEnabled() {
    return this.autoSlice;
  }

  /**
   * 生成單一障礙物或水果實體
   * @returns {EnemyItem}
   */
  spawn() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    const isBomb = Math.random() < CONFIG.BOMB_CHANCE;
    const content = isBomb
      ? CONFIG.BOMB_EMOJI
      : CONFIG.FRUITS[Math.floor(Math.random() * CONFIG.FRUITS.length)];
    const size = isBomb
      ? CONFIG.SIZES.BOMB
      : CONFIG.SIZES.FRUIT_BASE + Math.random() * CONFIG.SIZES.FRUIT_SPREAD;

    const x = CONFIG.SPAWN.SPAWN_X_MIN + Math.random() * Math.max(30, w - CONFIG.SPAWN.SPAWN_X_MAX_MARGIN);
    const y = h + CONFIG.SPAWN.SPAWN_Y_OFFSET;
    const vx = (Math.random() - 0.5) * CONFIG.VELOCITY.VX_SPREAD;
    const vy = -(CONFIG.VELOCITY.VY_BASE + Math.random() * CONFIG.VELOCITY.VY_SPREAD);
    const rot = Math.random() * 360;
    const vr = (Math.random() - 0.5) * CONFIG.VELOCITY.VR_SPREAD;

    const id = this.nextId++;
    const item = new EnemyItem({
      id,
      x,
      y,
      vx,
      vy,
      rot,
      vr,
      bomb: isBomb,
      content,
      size,
      container: this.container
    });

    this.items.set(id, item);

    // 自動切割邏輯（僅對水果有效，避開炸彈）
    if (this.autoSlice && !isBomb) {
      setTimeout(() => {
        const target = this.items.get(id);
        if (target && !target.sliced) {
          if (this.onAutoCut) {
            this.onAutoCut(id, target);
          }
        }
      }, CONFIG.TIMERS.AUTO_SLICE_DELAY);
    }

    return item;
  }

  /**
   * 更新所有實體物理狀態與邊界判定
   * @param {number} dt 幀時間間隔
   * @param {Function} onDropBottom 實體掉落至螢幕底部的回調
   */
  update(dt, onDropBottom) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    for (const [id, item] of [...this.items]) {
      item.update(dt);
      item.render();

      // 側邊邊界反彈
      if (item.x < CONFIG.WALL_LEFT_BOUND || item.x > w + CONFIG.WALL_RIGHT_MARGIN) {
        item.vx *= CONFIG.WALL_BOUNCE;
      }

      // 掉落超出螢幕底部
      if (item.y > h + CONFIG.BOTTOM_DESPAWN_OFFSET) {
        if (!item.bomb && !item.sliced && onDropBottom) {
          onDropBottom(item);
        }
        item.destroy();
        this.items.delete(id);
      }
    }
  }

  /**
   * 檢測所有實體與刀光線段之碰撞
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {Function} onHit 命中時回調 (id, item)
   */
  checkCollision(x1, y1, x2, y2, onHit) {
    for (const [id, item] of [...this.items]) {
      if (item.sliced) continue;
      const center = item.getCenter();
      if (Player.checkHit(center.x, center.y, x1, y1, x2, y2)) {
        if (onHit) onHit(id, item);
      }
    }
  }

  /**
   * 移除特定實體
   * @param {number} id
   */
  removeItem(id) {
    const item = this.items.get(id);
    if (item) {
      item.destroy();
      this.items.delete(id);
    }
  }

  /**
   * 取得特定實體
   * @param {number} id
   * @returns {EnemyItem|undefined}
   */
  getItem(id) {
    return this.items.get(id);
  }

  /**
   * 清除所有現存實體
   */
  clear() {
    for (const item of this.items.values()) {
      item.destroy();
    }
    this.items.clear();
  }
}
