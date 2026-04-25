// 通用模态控制
// 流程参考 echoes-of-yesterday：
//   1. 打开弹窗时主动 exitPointerLock —— 让 ESC 等浏览器交互自然工作
//   2. 关闭弹窗时跑 ~300ms 淡出动画
//   3. 动画结束后无声 requestPointerLock —— "自动吸回"游戏视角
import { pauseControls, resumeControls, releasePointer } from '../controls.js';

const open = new Set();

// 系统弹窗（开场/通关/失败）需要鼠标点按钮，关闭时不要自动锁回
const SYSTEM_MODALS = new Set(['intro', 'win', 'lose']);

const FADE_OUT_MS = 280;

export function openModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('closing');
  el.classList.add('show');
  open.add(id);
  pauseControls();
  // 所有弹窗都释放鼠标 —— 让 ESC 自然关闭，不被浏览器吞按键
  releasePointer();
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (!el.classList.contains('show')) return;
  el.classList.add('closing');
  // 动画跑完再彻底移除 + 视情况锁回视角
  setTimeout(() => {
    el.classList.remove('show');
    el.classList.remove('closing');
    open.delete(id);
    if (open.size === 0) {
      resumeControls();
      // 非系统弹窗：自动锁回 —— 这一步是"丝滑"的灵魂
      if (!SYSTEM_MODALS.has(id)) requestRelock();
    }
  }, FADE_OUT_MS);
}

// 在 ESC keydown / 关闭按钮的"用户激活窗口"内调用 requestPointerLock
function requestRelock() {
  const canvas = document.querySelector('#scene canvas');
  if (!canvas) return;
  try { canvas.requestPointerLock(); } catch (_) {}
}

export function isAnyModalOpen() {
  return open.size > 0
      || document.getElementById('intro').classList.contains('show')
      || document.getElementById('win').classList.contains('show')
      || document.getElementById('lose').classList.contains('show');
}

// 顶层关闭按钮：data-close="modalId"
document.addEventListener('click', (e) => {
  const id = e.target?.dataset?.close;
  if (id) closeModal(id);
});

// ESC 关闭最上层游戏内弹窗
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const ids = ['mTerm','mLogin','mKey','mView'];
  for (const id of ids) {
    if (open.has(id)) { closeModal(id); break; }
  }
});

// 全局点击重新锁鼠（仅当游戏中且无弹窗）—— 双保险
document.addEventListener('click', (e) => {
  // 不要在按钮上触发重锁（系统弹窗按钮才能正常工作）
  if (e.target.tagName === 'BUTTON') return;
  if (e.target.tagName === 'INPUT') return;
  if (open.size > 0) return;
  if (document.getElementById('intro').classList.contains('show')) return;
  if (document.getElementById('win').classList.contains('show')) return;
  if (document.getElementById('lose').classList.contains('show')) return;
  requestRelock();
});
