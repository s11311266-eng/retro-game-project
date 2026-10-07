/**
 * 遊戲全域設定與參數模組 (Game Configuration)
 * 定義遊戲基礎設定、實體尺寸、速度、物理參數與時間常數
 */
export const CONFIG = {
  // 水果與障礙物清單
  FRUITS: ['🍎', '🍊', '🍉', '🍌', '🍓', '🍍', '🥝', '🍑', '🍇'],
  BOMB_EMOJI: '💣',
  BOMB_CHANCE: 0.12, // 炸彈生成機率 (12%)

  // 初始規則數值
  INITIAL_LIVES: 3,           // 初始生命數
  INITIAL_TIME: 30,           // 遊戲總秒數 (秒)
  BILLION_AMOUNT: 100000000,  // 💰 +1億彩蛋增加分數

  // 物理常數
  GRAVITY: 1100,              // 重力加速度 (px/s²)
  WALL_BOUNCE: -0.7,          // 左右邊界反彈係數
  WALL_LEFT_BOUND: -90,       // 觸發左反彈之 x 閾值
  WALL_RIGHT_MARGIN: 40,      // 觸發右反彈之螢幕外側寬度
  BOTTOM_DESPAWN_OFFSET: 80,  // 掉落超出螢幕底部判定距離

  // 生成頻率與連鎖設定
  SPAWN: {
    BASE_INTERVAL: 0.72,      // 基礎生成間隔 (秒)
    MIN_INTERVAL: 0.30,       // 最小生成間隔 (秒)
    DECAY_RATE: 0.008,        // 隨剩餘時間遞減之加速係數
    COMBO_CHANCE: 0.25,       // 連鎖生成機率 (25%)
    COMBO_DELAY_MS: 120,      // 連鎖生成延遲 (毫秒)
    SPAWN_X_MIN: 30,          // 生成 x 軸最小邊界
    SPAWN_X_MAX_MARGIN: 90,   // 生成 x 軸最大外邊距
    SPAWN_Y_OFFSET: 20,       // 生成初始 y 軸螢幕下方偏移
  },

  // 速度與旋轉角速度
  VELOCITY: {
    VX_SPREAD: 260,           // 水平速度分佈範圍 [-130, 130]
    VY_BASE: 650,             // 垂直向上初速度基準
    VY_SPREAD: 280,           // 垂直向上速度變量 [650 ~ 930]
    VR_SPREAD: 300,           // 旋轉角速度範圍
  },

  // 實體尺寸與碰撞半徑
  SIZES: {
    BOMB: 52,                 // 炸彈尺寸 (px)
    FRUIT_BASE: 60,           // 水果基礎尺寸 (px)
    FRUIT_SPREAD: 10,         // 水果隨機尺寸浮動
  },
  SLICE_HIT_RADIUS: 42,       // 切割線段檢測半徑 (px)
  ITEM_CENTER_OFFSET: 36,     // 物件中心偏移量 (px)

  // 動畫與特效生命週期 (毫秒)
  TIMERS: {
    AUTO_SLICE_DELAY: 45,     // 自動切割延遲 (毫秒)
    SLASH_DURATION: 100,      // 刀光軌跡保留時長 (毫秒)
    POP_DURATION: 500,        // 切割爆裂特效時長 (毫秒)
    SCORE_FLOAT_DURATION: 700 // 得分飄字特效時長 (毫秒)
  }
};

// 別名匯出以保持相容性
export const GAME_CONFIG = CONFIG;
