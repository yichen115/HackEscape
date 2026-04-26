/* global THREE */
// FPS 第一人称控制器：Pointer Lock + WASD + 鼠标视角
import { engine } from './engine.js';
import { tryMove, groundYAt } from './collision.js';
import { isAnyModalOpen } from './ui/modal.js';

const SPEED = 3.5;
const SPEED_RUN = 6.0;
const PITCH_LIMIT = Math.PI / 2 - 0.05;
const GRAVITY = 22;          // 米 / 秒²
const JUMP_SPEED = 8.0;      // 起跳速度 → 跳跃高度 ~1.45 米 (够跳上桌面)
const EYE_HEIGHT = 1.65;     // 玩家眼离脚的距离

const keys = new Set();
let pointerLocked = false;

const canvas = engine.renderer.domElement;

// === Pointer Lock ===
canvas.addEventListener('click', () => {
  if (engine.player.paused) return;     // 模态打开时不锁
  if (isAnyModalOpen()) return;
  if (!pointerLocked) canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = (document.pointerLockElement === canvas);
});

document.addEventListener('mousemove', (e) => {
  if (!pointerLocked) return;
  if (engine.player.paused) return;        // 弹窗暂停时锁住视角，但鼠标仍保持隐藏
  const sens = 0.0022;
  engine.player.yaw   -= e.movementX * sens;
  engine.player.pitch -= e.movementY * sens;
  engine.player.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, engine.player.pitch));
});

// === 键盘 ===
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return;       // ESC 由模态关闭/退出锁单独处理
  // 不要拦截输入框
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  // 跳跃 (空格) —— 必须在地面 + 没暂停 + 没开弹窗
  if (e.code === 'Space') {
    e.preventDefault();   // 防止 Space 滚动页面
    if (engine.player.grounded && !engine.player.paused && !isAnyModalOpen()) {
      engine.player.vy = JUMP_SPEED;
      engine.player.grounded = false;
    }
    return;
  }
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
});

// 失焦时清空，避免持续移动
window.addEventListener('blur', () => keys.clear());

// === 每帧更新 ===
engine.addUpdate((dt) => {
  if (engine.player.paused) return;
  if (isAnyModalOpen()) return;
  if (!engine.current) return;

  // --- 垂直：重力 + 跳跃 + 落地 + 走出边缘 ---
  const groundTop = groundYAt(engine.player.pos.x, engine.player.pos.z);
  const groundY = groundTop + EYE_HEIGHT;

  if (engine.player.grounded) {
    if (engine.player.pos.y > groundY + 0.05) {
      // 走出当前站立面（从桌上踏空）
      engine.player.grounded = false;
      engine.player.vy = 0;
    } else {
      // 贴地（避免数值漂移）
      engine.player.pos.y = groundY;
    }
  }
  if (!engine.player.grounded) {
    engine.player.vy -= GRAVITY * dt;
    engine.player.pos.y += engine.player.vy * dt;
    if (engine.player.pos.y <= groundY) {
      engine.player.pos.y = groundY;
      engine.player.vy = 0;
      engine.player.grounded = true;
    }
  }

  // --- 水平：WASD ---
  let fwd = 0, str = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp'))    fwd += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown'))  fwd -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft'))  str -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) str += 1;
  if (fwd === 0 && str === 0) return;

  const len = Math.hypot(fwd, str); fwd /= len; str /= len;
  const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight')) ? SPEED_RUN : SPEED;
  const step = speed * dt;

  const yaw = engine.player.yaw;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx =  Math.cos(yaw), rz = -Math.sin(yaw);

  const dx = (fx * fwd + rx * str) * step;
  const dz = (fz * fwd + rz * str) * step;

  tryMove(engine.player.pos, dx, dz);
});

// 暂停 FPS（不释放 pointer lock —— 鼠标继续隐藏，玩家用键盘看弹窗内容）
export function pauseControls() {
  engine.player.paused = true;
  keys.clear();
}
export function resumeControls() {
  engine.player.paused = false;
}

// 系统级弹窗（开场/通关/失败）需要鼠标点按钮，主动释放
export function releasePointer() {
  if (document.pointerLockElement) document.exitPointerLock();
}
