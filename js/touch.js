/* global THREE */
// 触屏控件：左下虚拟摇杆 + 右下跳跃按钮 + 屏幕中部 drag 视角 / tap 交互
// 桌面端不激活；只当浏览器支持 touch 时把 body 加 .touch-mode

import { engine } from './engine.js';
import { isAnyModalOpen } from './ui/modal.js';

const PITCH_LIMIT = Math.PI / 2 - 0.05;
const JUMP_SPEED  = 8.0;
const LOOK_SENS   = 0.005;
const JOY_RADIUS  = 60;            // 摇杆拇指最大移动距离 (像素)
const TAP_MOVE_TH = 12;            // 视为点击的最大像素位移
const TAP_TIME_TH = 280;           // 视为点击的最大持续 ms

// 给 controls.js 消费的"伪摇杆"输出
export const joystick = { dx: 0, dy: 0, active: false };

const isTouchDevice =
  ('ontouchstart' in window) ||
  (navigator.maxTouchPoints > 0);

if (isTouchDevice) bootTouch();

// 给 controls.js 用：手机端不要请求 pointer lock
export function isTouch() { return isTouchDevice; }

function bootTouch() {
  document.body.classList.add('touch-mode');

  const joyEl   = document.getElementById('joystick');
  const thumbEl = document.getElementById('joystick-thumb');
  const jumpBtn = document.getElementById('jump-btn');

  // 摇杆指头跟踪
  let joyTouchId = null;
  let joyBaseX = 0, joyBaseY = 0;       // 摇杆视觉中心 (动态：以触下点为中心)

  // 视角指头跟踪
  let lookTouchId = null;
  let lookLastX = 0, lookLastY = 0;
  let lookStartX = 0, lookStartY = 0, lookStartTime = 0;
  let lookMoved = false;

  // 跳跃按钮
  let jumpTouchId = null;

  function rect(el) { return el.getBoundingClientRect(); }

  function inEl(x, y, el) {
    const r = rect(el);
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  // === 摇杆：以"触下点"为中心，动态摇杆，更舒服 ===
  function startJoystick(t) {
    joyTouchId = t.identifier;
    joyBaseX = t.clientX;
    joyBaseY = t.clientY;
    joystick.active = true;
    // 把视觉重新定位到触下点
    joyEl.style.left = (joyBaseX - 65) + 'px';
    joyEl.style.bottom = 'auto';
    joyEl.style.top = (joyBaseY - 65) + 'px';
    joyEl.classList.add('show');
    updateJoystick(t.clientX, t.clientY);
  }

  function updateJoystick(cx, cy) {
    let dx = cx - joyBaseX;
    let dy = cy - joyBaseY;
    const len = Math.hypot(dx, dy);
    if (len > JOY_RADIUS) { dx = dx * JOY_RADIUS / len; dy = dy * JOY_RADIUS / len; }
    joystick.dx = dx / JOY_RADIUS;
    joystick.dy = dy / JOY_RADIUS;
    thumbEl.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function endJoystick() {
    joyTouchId = null;
    joystick.active = false;
    joystick.dx = 0; joystick.dy = 0;
    thumbEl.style.transform = 'translate(0,0)';
    joyEl.classList.remove('show');
  }

  // === 视角 / 点击交互 ===
  function startLook(t) {
    lookTouchId = t.identifier;
    lookStartX = lookLastX = t.clientX;
    lookStartY = lookLastY = t.clientY;
    lookStartTime = Date.now();
    lookMoved = false;
  }

  function updateLook(t) {
    if (engine.player.paused || isAnyModalOpen()) return;
    const dx = t.clientX - lookLastX;
    const dy = t.clientY - lookLastY;
    if (Math.hypot(t.clientX - lookStartX, t.clientY - lookStartY) > TAP_MOVE_TH) lookMoved = true;
    engine.player.yaw   -= dx * LOOK_SENS;
    engine.player.pitch -= dy * LOOK_SENS;
    engine.player.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, engine.player.pitch));
    lookLastX = t.clientX;
    lookLastY = t.clientY;
  }

  function endLook(t) {
    const dt = Date.now() - lookStartTime;
    if (!lookMoved && dt < TAP_TIME_TH) {
      tapAt(t.clientX, t.clientY);
    }
    lookTouchId = null;
    lookMoved = false;
  }

  // === Tap → raycast → pickable
  // 先按 tap 位置射线；没命中再用屏幕中心兜底
  // → "对准物体后随便点" 也能触发
  const _ray = new THREE.Raycaster();
  _ray.far = 6;
  function pickAt(clientX, clientY) {
    if (!engine.current || !engine.current.pickables) return null;
    const ndc = {
      x: (clientX / window.innerWidth) * 2 - 1,
      y: -(clientY / window.innerHeight) * 2 + 1,
    };
    _ray.setFromCamera(ndc, engine.camera);
    const meshes = [];
    for (const p of engine.current.pickables) {
      if (p.disabled) continue;
      p.mesh.traverse(c => { if (c.isMesh && c.visible) meshes.push(c); });
    }
    const hits = _ray.intersectObjects(meshes, false);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && !obj.userData.pickId) obj = obj.parent;
    if (!obj) return null;
    return engine.current.pickables.find(x => x.id === obj.userData.pickId) || null;
  }
  function tapAt(clientX, clientY) {
    if (engine.player.paused || isAnyModalOpen()) return;
    let hit = pickAt(clientX, clientY);
    if (!hit) hit = pickAt(window.innerWidth / 2, window.innerHeight / 2);  // 屏幕中心兜底
    if (hit && hit.onClick) hit.onClick();
  }

  // === 跳跃 ===
  function tryJump() {
    if (engine.player.grounded && !engine.player.paused && !isAnyModalOpen()) {
      engine.player.vy = JUMP_SPEED;
      engine.player.grounded = false;
    }
  }

  // === 触屏分发：识别每个 touch 的"角色" ===
  // 屏幕被分两半（左半 = 摇杆区，右半 = 视角区）；跳跃按钮单独命中
  function onTouchStart(e) {
    const target = e.target;
    // 让系统按钮（如静音）和弹窗内元素走浏览器原生 click —— 只有 JUMP 走自定义
    if (target.tagName === 'BUTTON' && target.id !== 'jump-btn') return;
    if (target.closest('.modal') || target.closest('input')) return;

    for (const t of e.changedTouches) {
      // 跳跃按钮
      if (inEl(t.clientX, t.clientY, jumpBtn)) {
        if (jumpTouchId === null) {
          jumpTouchId = t.identifier;
          jumpBtn.classList.add('pressed');
          tryJump();
        }
        continue;
      }
      // 左半屏 (摇杆区)
      if (t.clientX < window.innerWidth / 2) {
        if (joyTouchId === null) startJoystick(t);
        continue;
      }
      // 右半屏 (视角 / tap)
      if (lookTouchId === null) startLook(t);
    }
    e.preventDefault();
  }

  function onTouchMove(e) {
    const target = e.target;
    if (target.tagName === 'BUTTON' && target.id !== 'jump-btn') return;
    if (target.closest('.modal') || target.closest('input')) return;
    for (const t of e.changedTouches) {
      if (t.identifier === joyTouchId) updateJoystick(t.clientX, t.clientY);
      else if (t.identifier === lookTouchId) updateLook(t);
    }
    e.preventDefault();
  }

  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === joyTouchId) endJoystick();
      else if (t.identifier === lookTouchId) endLook(t);
      else if (t.identifier === jumpTouchId) {
        jumpTouchId = null;
        jumpBtn.classList.remove('pressed');
      }
    }
  }

  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove',  onTouchMove,  { passive: false });
  document.addEventListener('touchend',   onTouchEnd,   { passive: false });
  document.addEventListener('touchcancel',onTouchEnd,   { passive: false });
}
