/* global THREE */
// 引擎核心：scene/camera/renderer/loop + 跨房间 inventory + 全局 flags + 房间注册/切换
import { showRoomBanner, fadeIn, fadeOut } from './ui/hud.js';
import { resumeAudio, stopAllAmbient, toggleMute } from './sound.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);
scene.fog = new THREE.Fog(0x05070a, 14, 60);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
document.getElementById('scene').appendChild(renderer.domElement);

// 共享环境光（每个房间默认采用，可被房间 init 覆盖强度）
const ambient = new THREE.AmbientLight(0x222a32, 0.55);
scene.add(ambient);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// === 跨房间状态 ===
const ITEM_LABEL = {};   // id -> 中文标签
const inventory = {
  list: [],
  has(id) { return this.list.includes(id); },
  add(id, label) {
    if (this.list.includes(id)) return;
    this.list.push(id);
    if (label) ITEM_LABEL[id] = label;
    renderInventory();
  },
  remove(id) {
    this.list = this.list.filter(x => x !== id);
    renderInventory();
  },
  all() { return this.list.slice(); },
};
function renderInventory() {
  const el = document.getElementById('inv-list');
  if (!inventory.list.length) { el.innerHTML = '<div class="inv-empty">(空)</div>'; return; }
  el.innerHTML = inventory.list.map(id =>
    `<div class="inv-item">· ${ITEM_LABEL[id] || id}</div>`).join('');
}

const flags = {
  data: {},
  get(k) { return this.data[k]; },
  set(k, v) { this.data[k] = v; },
  toggle(k) { this.data[k] = !this.data[k]; return this.data[k]; },
};

// === 目标 / 房间标签 ===
function setObjective(text) { document.getElementById('obj-text').textContent = text; }
function setRoomTag(text) { document.getElementById('room-tag-text').textContent = text; }

// === 房间注册与切换 ===
const rooms = []; // 数组里存 builder fn
const built = {}; // idx -> 已构建的 room 对象（用于回访保留状态）
let current = null;
let currentIdx = -1;

function registerRoom(builder) { rooms.push(builder); }

let switching = false;
async function goto(idx, { skipFade=false } = {}) {
  if (switching) return;
  if (idx < 0 || idx >= rooms.length) return;
  if (idx === currentIdx) return;     // 已经在这房间里
  switching = true;
  player.paused = true;
  if (document.pointerLockElement) document.exitPointerLock();

  if (!skipFade) await fadeIn();

  // 卸载当前 —— 注意 cleanup 不应清掉跨房间状态（如倒计时）
  if (current) {
    if (current.cleanup) current.cleanup();
    scene.remove(current.group);
    current = null;
  }
  stopAllAmbient();

  // 构建（首次）或复用（回访）
  let newRoom = built[idx];
  if (!newRoom) {
    newRoom = rooms[idx](engine);
    built[idx] = newRoom;
  }
  if (newRoom.init) newRoom.init();
  scene.add(newRoom.group);
  current = newRoom;
  currentIdx = idx;

  // 玩家落地
  engine.player.pos.copy(newRoom.spawnPos);
  engine.player.yaw   = newRoom.spawnYaw   ?? 0;
  engine.player.pitch = newRoom.spawnPitch ?? 0;
  engine.player.vy = 0;             // 重置垂直状态，避免上一房间的跳跃残留
  engine.player.grounded = true;

  // 标签 / 目标
  setRoomTag(newRoom.title || '—');
  if (newRoom.objective) setObjective(newRoom.objective);

  // 横幅
  if (newRoom.banner) {
    showRoomBanner(newRoom.banner.floor || '', newRoom.banner.name || newRoom.title, newRoom.banner.desc || '');
  }

  if (!skipFade) await fadeOut();   // 黑遮罩淡出
  player.paused = false;            // 进入新房间后恢复
  switching = false;
}

function next() { if (currentIdx + 1 < rooms.length) goto(currentIdx + 1); }

// === 玩家状态（FPS 控制器读写） ===
const player = {
  pos: new THREE.Vector3(0, 1.65, 0),
  yaw: 0, pitch: 0,
  height: 1.65, radius: 0.35,
  paused: false,    // 模态打开时为 true
  vy: 0,            // 垂直速度（跳跃 / 重力）
  grounded: true,   // 是否在某个表面（地板或家具顶）
};

// === 主循环 ===
const clock = new THREE.Clock();
const updaters = []; // 每帧调用，传入 dt
function addUpdate(fn) { updaters.push(fn); }

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);

  for (const fn of updaters) fn(dt);

  // 同步相机
  camera.position.copy(player.pos);
  // FPS 视角：先 yaw 后 pitch
  camera.rotation.set(0, 0, 0);
  camera.rotateY(player.yaw);
  camera.rotateX(player.pitch);

  // 房间 onTick
  if (current && current.onTick) current.onTick(dt);

  // 墙体动态遮挡（如有 cullable 标记）
  if (current && current.walls) {
    if (current.cullableWalls) cullWalls(current.cullableWalls);
  }

  renderer.render(scene, camera);
}

function cullWalls(list) {
  const c = camera.position;
  for (const w of list) {
    if (!w.aabb || !w.mesh) continue;
    // 相机在 AABB 哪一侧 → 隐藏挡视线那一面
    const a = w.aabb;
    let visible = true;
    if (w.normal === '+z') visible = c.z > a.min.z;
    else if (w.normal === '-z') visible = c.z < a.max.z;
    else if (w.normal === '+x') visible = c.x > a.min.x;
    else if (w.normal === '-x') visible = c.x < a.max.x;
    else if (w.normal === '+y') visible = c.y > a.min.y;
    else if (w.normal === '-y') visible = c.y < a.max.y;
    w.mesh.visible = visible;
  }
}

// === 公共一句话提示 ===
let hintTimer = null;
function showHint(text, dur=2600) {
  const el = document.getElementById('hint');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => el.classList.remove('show'), dur);
}

export const engine = {
  THREE,
  scene, camera, renderer,
  player,
  inventory, flags,
  rooms,
  get current() { return current; },
  registerRoom, goto, next,
  addUpdate,
  setObjective, setRoomTag,
  showHint,
  start() {
    tick();
    document.getElementById('btn-start').addEventListener('click', () => {
      resumeAudio();    // 第一次用户手势 → 启用 Web Audio
      document.getElementById('intro').classList.remove('show');
      goto(0, { skipFade: true });
    });
    document.getElementById('btn-again').addEventListener('click', () => location.reload());
    document.getElementById('btn-retry').addEventListener('click', () => location.reload());

    // 静音开关
    const muteBtn = document.getElementById('mute-toggle');
    if (muteBtn) muteBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); });
  },
};
