import { Game } from './game.js';

/**
 * 遊戲啟動入口模組 (Main Entry Point)
 * 確保 DOM 載入後實例化遊戲主控制器
 */
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game('#game');
  // 掛載至全域以利除錯與測試
  window.__GAME__ = game;
});
