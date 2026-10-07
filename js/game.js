import { CONFIG } from './config.js';
import { Player } from './player.js';
import { EnemyManager } from './enemy.js';

/**
 * 遊戲主控制器與狀態管理 (Game Coordinator)
 * 負責主循環、生命週期狀態 (開始、進行中、結束)、計分與事件協調
 */
export class Game {
  /**
   * @param {string|HTMLElement} containerSelector 容器選擇器或節點
   */
  constructor(containerSelector = '#game') {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;

    if (!this.container) {
      throw new Error(`找不到指定的遊戲舞台容器節點: ${containerSelector}`);
    }

    // 遊戲狀態資料
    this.score = 0;
    this.lives = CONFIG.INITIAL_LIVES;
    this.timeLeft = CONFIG.INITIAL_TIME;
    this.running = false;
    this.autoSlice = true;

    // 時間統計
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.secondTimer = 0;
    this.animationId = null;

    // DOM 元素快取
    this.initDOM();

    // 初始化玩家與敵人管理器
    this.player = new Player(this.container);
    this.enemyManager = new EnemyManager(this.container, {
      onAutoCut: (id, item) => {
        if (this.running && this.autoSlice) {
          this.cutItem(id, item);
        }
      }
    });

    // 綁定所有事件
    this.bindEvents();
  }

  /**
   * 初始化與裝配遊戲 DOM 節點（若 HTML 內未預先存在則自動生成）
   */
  initDOM() {
    // 檢查並補足背景雲朵
    if (!this.container.querySelector('.cloud')) {
      const c1 = document.createElement('div');
      c1.className = 'cloud c1';
      const c2 = document.createElement('div');
      c2.className = 'cloud c2';
      this.container.appendChild(c1);
      this.container.appendChild(c2);
    }

    // 檢查並補足 HUD 面板
    let hud = this.container.querySelector('.hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.className = 'hud';
      hud.innerHTML = `
        <span>🍉 分數 <b id="score">0</b></span>
        <span>❤️ <b id="lives">♥♥♥</b></span>
        <span>⏱️ <b id="time">30</b>s</span>
        <button id="billionBtn">💰 +1億</button>
        <button id="autoBtn">🤖 自動切割：開</button>
        <button id="restart">重新開始</button>
      `;
      this.container.appendChild(hud);
    }

    // 檢查並補足開始/結束畫面遮罩
    let overlay = this.container.querySelector('#overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'overlay';
      overlay.innerHTML = `
        <div class="card">
          <h1>🍉 水果切切樂</h1>
          <p>用滑鼠拖曳或點擊切水果！遊戲開始後會自動完美切割，不會漏掉水果。<br>
          💰 可按「+1億」快速增加分數；🤖 自動切割預設開啟。<br>
          <span style="font-size: 13px; color: #888;">(提示：按下空白鍵 Space 即可直接開始)</span></p>
          <div id="finalScore">準備好了嗎？</div>
          <button id="startBtn">開始遊戲</button>
        </div>
      `;
      this.container.appendChild(overlay);
    }

    // 快取控制面板重要元素
    this.hudEl = hud;
    this.overlayEl = overlay;
    this.scoreEl = this.container.querySelector('#score');
    this.livesEl = this.container.querySelector('#lives');
    this.timeEl = this.container.querySelector('#time');
    this.billionBtn = this.container.querySelector('#billionBtn');
    this.autoBtn = this.container.querySelector('#autoBtn');
    this.restartBtn = this.container.querySelector('#restart');
    this.finalScoreEl = this.container.querySelector('#finalScore');
    this.startBtn = this.container.querySelector('#startBtn');
  }

  /**
   * 綁定使用者交互事件
   */
  bindEvents() {
    // 玩家刀光輸入事件
    this.player.init({
      onSlice: (x1, y1, x2, y2) => {
        if (!this.running) return;
        this.enemyManager.checkCollision(x1, y1, x2, y2, (id, item) => {
          this.cutItem(id, item);
        });
      },
      onSpace: (e) => {
        if (this.overlayEl.style.display !== 'none') {
          e.preventDefault();
          this.reset();
        }
      }
    });

    // UI 按鈕交互
    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => this.reset());
    }
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => this.reset());
    }
    if (this.billionBtn) {
      this.billionBtn.addEventListener('click', () => this.addBillionScore());
    }
    if (this.autoBtn) {
      this.autoBtn.addEventListener('click', () => this.toggleAutoSlice());
    }
  }

  /**
   * 重啟遊戲，初始化所有遊戲狀態
   */
  reset() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // 清空現有實體與重置玩家狀態
    this.enemyManager.clear();
    this.player.reset();

    // 重設數據
    this.score = 0;
    this.lives = CONFIG.INITIAL_LIVES;
    this.timeLeft = CONFIG.INITIAL_TIME;
    this.autoSlice = true;
    this.enemyManager.setAutoSlice(true);

    // 更新 UI 介面
    this.updateHUD();
    this.overlayEl.style.display = 'none';

    // 啟動主計時與渲染循環
    this.running = true;
    this.lastTime = performance.now();
    this.spawnTimer = 0;
    this.secondTimer = 0;

    this.animationId = requestAnimationFrame(this.loop.bind(this));
  }

  /**
   * 結束遊戲
   * @param {string} reason 結束原因說明文字
   */
  endGame(reason = '時間到！') {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.finalScoreEl) {
      this.finalScoreEl.textContent = `${reason}  最終分數：${this.score.toLocaleString()}`;
    }
    if (this.startBtn) {
      this.startBtn.textContent = '再玩一次';
    }
    this.overlayEl.style.display = 'grid';
  }

  /**
   * 玩家失去生命值判定
   */
  loseLife() {
    if (!this.running) return;
    this.lives--;
    this.livesEl.textContent = '♥'.repeat(Math.max(0, this.lives)) + '♡'.repeat(Math.max(0, CONFIG.INITIAL_LIVES - this.lives));
    if (this.lives <= 0) {
      this.endGame('生命用完了！');
    }
  }

  /**
   * 切割目標(水果)或障礙物(炸彈)之邏輯
   * @param {number} id
   * @param {import('./enemy.js').EnemyItem} item
   */
  cutItem(id, item) {
    if (!item || item.sliced) return;
    item.sliced = true;

    if (item.bomb) {
      this.createPop(item.x, item.y, '💥');
      this.loseLife();
    } else {
      this.score++;
      if (this.scoreEl) {
        this.scoreEl.textContent = this.score.toLocaleString();
      }
      this.createPop(item.x, item.y, '✂️');
      this.createScorePop(item.x, item.y, '+1');
    }

    this.enemyManager.removeItem(id);
  }

  /**
   * 點擊「+1億」彩蛋按鈕加分
   */
  addBillionScore() {
    if (!this.running) return;
    this.score += CONFIG.BILLION_AMOUNT;
    if (this.scoreEl) {
      this.scoreEl.textContent = this.score.toLocaleString();
    }
    this.createScorePop(this.container.clientWidth / 2 - 20, 90, '+1');
    this.createBillionPop('+100,000,000！');
  }

  /**
   * 切換自動切割開關
   */
  toggleAutoSlice() {
    this.autoSlice = !this.autoSlice;
    this.enemyManager.setAutoSlice(this.autoSlice);

    if (this.autoBtn) {
      this.autoBtn.textContent = this.autoSlice ? '🤖 自動切割：開' : '🤖 自動切割：關';
      this.autoBtn.classList.toggle('off', !this.autoSlice);
    }
  }

  /**
   * 刷新 HUD 面板顯示
   */
  updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score.toLocaleString();
    if (this.livesEl) this.livesEl.textContent = '♥'.repeat(this.lives) + '♡'.repeat(CONFIG.INITIAL_LIVES - this.lives);
    if (this.timeEl) this.timeEl.textContent = this.timeLeft;
    if (this.autoBtn) {
      this.autoBtn.textContent = this.autoSlice ? '🤖 自動切割：開' : '🤖 自動切割：關';
      this.autoBtn.classList.remove('off');
    }
  }

  /**
   * 產生切割爆裂粒子特效
   */
  createPop(x, y, text) {
    const p = document.createElement('div');
    p.className = 'slice';
    p.textContent = text;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    this.container.appendChild(p);
    setTimeout(() => p.remove(), CONFIG.TIMERS.POP_DURATION);
  }

  /**
   * 產生常規得分飄字特效
   */
  createScorePop(x, y, text) {
    const p = document.createElement('div');
    p.className = 'scorePop';
    p.textContent = text;
    p.style.left = `${x + 20}px`;
    p.style.top = `${y + 10}px`;
    this.container.appendChild(p);
    setTimeout(() => p.remove(), CONFIG.TIMERS.SCORE_FLOAT_DURATION);
  }

  /**
   * 產生+1億彩蛋橫幅特效
   */
  createBillionPop(text) {
    const pop = document.createElement('div');
    pop.className = 'scorePop';
    pop.textContent = text;
    pop.style.left = '50%';
    pop.style.top = '105px';
    pop.style.transform = 'translateX(-50%)';
    pop.style.fontSize = '32px';
    pop.style.color = '#fff';
    pop.style.position = 'absolute';
    this.container.appendChild(pop);
    setTimeout(() => pop.remove(), CONFIG.TIMERS.SCORE_FLOAT_DURATION);
  }

  /**
   * 遊戲核心驅動迴圈 (Game Main Loop)
   * @param {number} now 當前高精度時間戳記
   */
  loop(now) {
    if (!this.running) return;

    const dt = Math.min(0.033, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.spawnTimer += dt;
    this.secondTimer += dt;

    // 動態難度生成間隔
    const spawnThreshold = Math.max(
      CONFIG.SPAWN.MIN_INTERVAL,
      CONFIG.SPAWN.BASE_INTERVAL - (CONFIG.INITIAL_TIME - this.timeLeft) * CONFIG.SPAWN.DECAY_RATE
    );

    // 定期生成實體
    if (this.spawnTimer > spawnThreshold) {
      this.spawnTimer = 0;
      this.enemyManager.spawn();

      // 連鎖突發生成
      if (Math.random() < CONFIG.SPAWN.COMBO_CHANCE) {
        setTimeout(() => {
          if (this.running) {
            this.enemyManager.spawn();
          }
        }, CONFIG.SPAWN.COMBO_DELAY_MS);
      }
    }

    // 每秒倒數計時更新
    if (this.secondTimer >= 1) {
      const secs = Math.floor(this.secondTimer);
      this.secondTimer -= secs;
      this.timeLeft -= secs;
      if (this.timeEl) {
        this.timeEl.textContent = Math.max(0, this.timeLeft);
      }

      if (this.timeLeft <= 0) {
        this.endGame('時間到！');
        return;
      }
    }

    // 更新障礙物與水果實體位置及物理判定
    this.enemyManager.update(dt, (item) => {
      if (!item.bomb) {
        this.loseLife();
      }
    });

    if (this.running) {
      this.animationId = requestAnimationFrame(this.loop.bind(this));
    }
  }
}
