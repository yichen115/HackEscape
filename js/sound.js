// 程序化音效（Web Audio API 合成，零外部资源）
// 浏览器自动播放策略：第一次有用户手势之后才能产声 → 在 BOOT 时调用 resumeAudio()

let ctx = null;
let masterMuted = true;          // 默认静音 —— 用户主动开启
const MASTER = 0.5;

// 页面一加载就同步 UI（无需等到 ensureCtx）
try {
  const stored = localStorage.getItem('hackEscape.muted');
  if (stored !== null) masterMuted = (stored === '1');
} catch {}
window.addEventListener('DOMContentLoaded', updateMuteUI);

function ensureCtx() {
  if (ctx) return ctx;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  ctx = new C();
  updateMuteUI();
  return ctx;
}

export function resumeAudio() {
  ensureCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function isMuted() { return masterMuted; }
export function setMuted(m) {
  masterMuted = !!m;
  try { localStorage.setItem('hackEscape.muted', masterMuted ? '1' : '0'); } catch {}
  updateMuteUI();
  if (masterMuted) stopAllAmbient();
}
export function toggleMute() { setMuted(!masterMuted); }

function updateMuteUI() {
  const el = document.getElementById('mute-toggle');
  if (el) el.textContent = masterMuted ? '🔇' : '🔊';
}

// M 键切换静音
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyM') return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  toggleMute();
});

// === 基础合成器 ===

function tone({ freq=440, dur=0.1, type='sine', vol=0.2, attack=0.004, freqEnd=null, delay=0 }) {
  if (masterMuted || !ctx) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol * MASTER, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise({ dur=0.05, vol=0.2, filterType='bandpass', filterFreq=2000, q=1, delay=0 }) {
  if (masterMuted || !ctx) return;
  const t0 = ctx.currentTime + delay;
  const samples = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i=0; i<samples; i++) d[i] = Math.random()*2-1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = filterType; filt.frequency.value = filterFreq; filt.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * MASTER, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(ctx.destination);
  src.start(t0); src.stop(t0 + dur);
}

// === SFX 库 ===
export const SFX = {
  keypadPress() { tone({ freq:760, dur:0.04, type:'square', vol:0.14 }); },
  keypadDelete(){ tone({ freq:380, dur:0.06, type:'square', vol:0.14 }); },
  keypadOk() {
    tone({ freq:660, dur:0.09, type:'square', vol:0.18 });
    tone({ freq:990, dur:0.13, type:'square', vol:0.18, delay:0.08 });
  },
  keypadErr() {
    tone({ freq:220, dur:0.16, type:'sawtooth', vol:0.18 });
    tone({ freq:170, dur:0.18, type:'sawtooth', vol:0.18, delay:0.10 });
  },
  termType()    { tone({ freq:1700 + Math.random()*500, dur:0.012, type:'square', vol:0.05 }); },
  termEnter()   { tone({ freq:540, dur:0.05, type:'square', vol:0.10 }); },
  pickup() {
    tone({ freq:600, dur:0.06, type:'sine', vol:0.18 });
    tone({ freq:1000, dur:0.08, type:'sine', vol:0.18, delay:0.06 });
  },
  click()       { tone({ freq:1200, dur:0.022, type:'square', vol:0.10 }); },
  switchOn()    {
    noise({ dur:0.04, filterFreq:1200, q:4, vol:0.25 });
    tone({ freq:90, dur:0.5, type:'sawtooth', vol:0.10, freqEnd:1500, delay:0.04 });
  },
  doorUnlock() {
    noise({ dur:0.07, filterFreq:1400, q:5, vol:0.3 });
    tone({ freq:520, dur:0.18, type:'triangle', vol:0.16, delay:0.08 });
  },
  doorOpen()    { noise({ dur:0.45, filterFreq:300, q:0.8, vol:0.18 }); },
  drawerSlide() { noise({ dur:0.5,  filterFreq:600, q:1,  vol:0.18 }); },
  paintingSlide(){ noise({ dur:0.7, filterFreq:400, q:0.8, vol:0.16 }); },
  paperRustle() { noise({ dur:0.18, filterType:'highpass', filterFreq:2500, q:0.5, vol:0.13 }); },
  safeOpen() {
    noise({ dur:0.1, filterFreq:1200, q:4, vol:0.25 });
    tone({ freq:520, dur:0.18, type:'sine',     vol:0.16, delay:0.06 });
    tone({ freq:780, dur:0.22, type:'triangle', vol:0.16, delay:0.18 });
  },
  usbInsert() {
    noise({ dur:0.05, filterFreq:3000, q:3, vol:0.18 });
    tone({ freq:900, dur:0.1, type:'sine', vol:0.14, delay:0.05 });
  },
  cardSwipe() {
    noise({ dur:0.25, filterFreq:2000, q:0.5, vol:0.15 });
    tone({ freq:1200, dur:0.06, type:'square', vol:0.12, delay:0.25 });
  },
  videoStart() {
    tone({ freq:200, dur:0.4, type:'sawtooth', vol:0.12, freqEnd:60 });
    noise({ dur:0.4, filterType:'lowpass', filterFreq:8000, q:0.5, vol:0.06, delay:0.05 });
  },
  countdownTick(remain) {
    if (remain <= 10)      tone({ freq:1320, dur:0.07, type:'square', vol:0.22 });
    else if (remain <= 30) tone({ freq:1100, dur:0.06, type:'square', vol:0.18 });
    else                   tone({ freq:880,  dur:0.04, type:'square', vol:0.12 });
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq:f, dur:0.20, type:'triangle', vol:0.20, delay:i*0.10 }));
    tone({ freq:1568, dur:0.5, type:'triangle', vol:0.22, delay:0.45 });
  },
  lose() {
    [523, 466, 415, 349].forEach((f, i) =>
      tone({ freq:f, dur:0.28, type:'sawtooth', vol:0.20, delay:i*0.16 }));
    tone({ freq:120, dur:1.0, type:'sawtooth', vol:0.18, delay:0.7 });
  },
  hint()        { tone({ freq:1320, dur:0.05, type:'sine', vol:0.10 }); },
};

// === 环境音（每个房间不同氛围）===
let ambientNodes = [];

function ambientPush(node) { ambientNodes.push(node); }

export function startAmbient(type) {
  stopAllAmbient();
  if (masterMuted || !ctx) return;
  const dest = ctx.destination;

  if (type === 'server') {
    // 机房氛围本来就该吵 —— 但用 sine 替换 saw，把"刺耳"换成"沉闷"
    // 60Hz 主嗡嗡（电网频率）
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 60;
    g.gain.value = 0.035 * MASTER;
    o.connect(g).connect(dest); o.start(); ambientPush(o); ambientPush(g);
    // 风扇白噪（带通保留中频）
    const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.010 * MASTER;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0; i<d.length; i++) d[i] = Math.random()*2-1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 1500; filt.Q.value = 0.6;
    src.connect(filt).connect(noiseGain).connect(dest); src.start(); ambientPush(src); ambientPush(noiseGain);
    // 警报脉冲
    const alarmInterval = setInterval(() => {
      if (masterMuted) return;
      tone({ freq:880, dur:0.18, type:'sine', vol:0.06 });
    }, 1500);
    ambientNodes.push({ stop: () => clearInterval(alarmInterval) });
  }

  if (type === 'monitor') {
    // CRT 高频啸叫 + 低频嗡
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 15600;
    g.gain.value = 0.0035 * MASTER;
    o.connect(g).connect(dest); o.start(); ambientPush(o); ambientPush(g);
    const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
    o2.type = 'sawtooth'; o2.frequency.value = 50;
    g2.gain.value = 0.02 * MASTER;
    o2.connect(g2).connect(dest); o2.start(); ambientPush(o2); ambientPush(g2);
  }

  if (type === 'office') {
    // 办公室极轻的空调白噪
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0; i<d.length; i++) d[i] = Math.random()*2-1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 600; filt.Q.value = 0.3;
    const g = ctx.createGain(); g.gain.value = 0.018 * MASTER;
    src.connect(filt).connect(g).connect(dest); src.start();
    ambientPush(src); ambientPush(g);
  }

  if (type === 'secure') {
    // 紧张的低频脉动
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 80;
    g.gain.value = 0.02 * MASTER;
    // 脉动
    const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.7; lfoGain.gain.value = 0.025 * MASTER;
    lfo.connect(lfoGain).connect(g.gain);
    o.connect(g).connect(dest); o.start(); lfo.start();
    ambientPush(o); ambientPush(g); ambientPush(lfo); ambientPush(lfoGain);
  }
}

export function stopAllAmbient() {
  ambientNodes.forEach(n => { try { if (n.stop) n.stop(); } catch {} });
  ambientNodes = [];
}
