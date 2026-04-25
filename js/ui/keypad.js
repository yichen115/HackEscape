// 数字密码盘组件（4 位 / 3 位通用，支持自定义校验）
// 输入：屏幕按钮 + 物理键盘 (0-9 / Enter / Backspace / Esc)
import { openModal, closeModal } from './modal.js';
import { SFX } from '../sound.js';

let state = null;

// 物理键盘输入
document.addEventListener('keydown', (e) => {
  if (!state) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key >= '0' && e.key <= '9') { press(e.key); e.preventDefault(); }
  else if (e.key === 'Enter') { press('OK'); e.preventDefault(); }
  else if (e.key === 'Backspace' || e.key === 'Delete') {
    if (state.code.length > 0) {
      SFX.keypadDelete();
      state.code = state.code.slice(0, -1); renderDisp();
    }
    e.preventDefault();
  }
  else if (e.key === 'Escape') {
    state = null;       // ESC 关闭时同步清空状态（modal.js 负责关弹窗）
  }
});

export function openKeypad({ title, desc, length, answer, onSuccess, onAttempt }) {
  state = { code: '', length, answer, onSuccess, onAttempt };
  document.getElementById('keyTitle').textContent = title || '输入密码';
  document.getElementById('keyDesc').innerHTML = (desc || `— ${length} 位数字 —`) +
    `<br><span style="opacity:0.6; font-size:11px;">键盘 0-9 输入 · Enter 确认 · Backspace 删除 · ESC 退出</span>`;
  setFb(' ', '');
  renderDisp();
  const pad = document.getElementById('keyPad');
  pad.innerHTML = '';
  ['1','2','3','4','5','6','7','8','9','CLR','0','OK'].forEach(k => {
    const b = document.createElement('button');
    b.textContent = k;
    if (k === 'CLR' || k === 'OK') b.className = 'wide';
    b.onclick = () => press(k);
    pad.appendChild(b);
  });
  openModal('mKey');
}

function press(k) {
  if (!state) return;
  if (k === 'CLR') { SFX.keypadDelete(); state.code = ''; renderDisp(); return; }
  if (k === 'OK') {
    let ok;
    if (typeof state.answer === 'function') ok = state.answer(state.code);
    else ok = state.code === state.answer;
    if (ok) {
      SFX.keypadOk();
      setFb('✓ ACCESS GRANTED', 'ok');
      const cb = state.onSuccess; state = null;
      setTimeout(() => { cb && cb(); }, 500);
    } else {
      SFX.keypadErr();
      setFb('× 密码错误', 'err');
      state.onAttempt && state.onAttempt(state.code);
      state.code = '';
      renderDisp();
    }
    return;
  }
  if (state.code.length < state.length) {
    SFX.keypadPress();
    state.code += k; renderDisp();
  }
}

function renderDisp() {
  const d = document.getElementById('keyDisp');
  let s = '';
  for (let i=0; i<state.length; i++) {
    s += (i < state.code.length ? state.code[i] : '_') + ' ';
  }
  d.textContent = s.trim();
}
function setFb(text, cls) {
  const el = document.getElementById('keyFb');
  el.textContent = text;
  el.className = 'code-fb ' + (cls || '');
}

export function closeKeypad() { state = null; closeModal('mKey'); }
