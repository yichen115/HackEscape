/* global THREE */
// 中心准星 raycast + 标签 + E/左键交互
import { engine } from './engine.js';
import { isAnyModalOpen } from './ui/modal.js';

const raycaster = new THREE.Raycaster();
raycaster.far = 4.5;     // 只能交互近物
const dirCache = new THREE.Vector3();

const crossEl = document.getElementById('crosshair');
const labelEl = document.getElementById('reticle-label');

let aimedPickable = null;

function findPickable() {
  if (!engine.current || !engine.current.pickables) return null;
  // 准星 = 屏幕中心 → 直接用相机正前方
  raycaster.setFromCamera({ x:0, y:0 }, engine.camera);
  const meshes = [];
  for (const p of engine.current.pickables) {
    if (p.disabled) continue;
    p.mesh.traverse(c => { if (c.isMesh && c.visible) meshes.push(c); });
  }
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return null;
  let obj = hits[0].object;
  while (obj && !obj.userData.pickId) obj = obj.parent;
  if (!obj) return null;
  return engine.current.pickables.find(p => p.id === obj.userData.pickId) || null;
}

function updateReticle() {
  if (engine.player.paused || isAnyModalOpen()) {
    crossEl.classList.remove('aim');
    labelEl.classList.remove('show');
    aimedPickable = null;
    return;
  }
  const p = findPickable();
  if (p) {
    aimedPickable = p;
    crossEl.classList.add('aim');
    labelEl.innerHTML = `<span class="key">E</span> ${p.label || '查看'}`;
    labelEl.classList.add('show');
  } else {
    aimedPickable = null;
    crossEl.classList.remove('aim');
    labelEl.classList.remove('show');
  }
}

engine.addUpdate(() => updateReticle());

// 触发交互
function tryInteract() {
  if (!aimedPickable) return;
  if (engine.player.paused || isAnyModalOpen()) return;
  if (aimedPickable.onClick) aimedPickable.onClick();
}

// 仅 E 键交互（鼠标始终保持视角控制）
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    tryInteract();
  }
});

// 给房间用的 pickable 注册器（可选辅助）
export function pickable({ id, mesh, label, onClick }) {
  mesh.userData.pickId = id;
  mesh.traverse(c => { if (c !== mesh && c.isMesh) c.userData.pickId = id; });
  return { id, mesh, label, onClick };
}
