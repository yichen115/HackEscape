// 倒计时条（房 4 用）
const el = document.getElementById('countdown');
const time = document.getElementById('cd-time');
const fill = document.getElementById('cd-fill');

let total = 0, remain = 0, interval = null, frozen = false, onZero = null;

function fmt(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function tick() {
  if (frozen) return;
  remain -= 1;
  if (remain <= 0) {
    remain = 0;
    update();
    stop();
    if (onZero) onZero();
    return;
  }
  update();
}

function update() {
  time.textContent = fmt(remain);
  const pct = Math.max(0, remain / total);
  fill.style.width = (pct * 100).toFixed(1) + '%';
  if (remain <= 30) el.classList.add('warn'); else el.classList.remove('warn');
}

export function startCountdown(seconds, zeroHandler) {
  total = remain = seconds;
  frozen = false;
  onZero = zeroHandler;
  el.classList.remove('hidden');
  update();
  if (interval) clearInterval(interval);
  interval = setInterval(tick, 1000);
}

export function freezeCountdown() {
  frozen = true;
  if (interval) { clearInterval(interval); interval = null; }
  el.classList.remove('warn');
  // 给屏幕加冻结视觉提示
  time.style.color = '#6effb4';
  time.style.textShadow = '0 0 12px rgba(110,255,180,0.5)';
}

export function hideCountdown() {
  el.classList.add('hidden');
  if (interval) { clearInterval(interval); interval = null; }
  time.style.color = '';
  time.style.textShadow = '';
  frozen = false;
}

export function getRemain() { return remain; }
