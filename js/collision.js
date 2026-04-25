/* global THREE */
// 玩家圆柱 vs AABB 列表的滑墙碰撞。
// AABB 形如 { min: {x,z}, max: {x,z} }（y 不参与，因为玩家不会上下浮动）
// walls 数组实时取自 current.walls；门解锁时把门 AABB 从该数组里 splice 掉即可。

import { engine } from './engine.js';

const TMP = new THREE.Vector3();

export function tryMove(pos, dx, dz) {
  const r = engine.player.radius;
  const walls = (engine.current && engine.current.walls) || [];

  // 分轴推进：先 X
  let nx = pos.x + dx;
  if (!intersectsAny(nx, pos.z, r, walls)) pos.x = nx;
  // 再 Z
  let nz = pos.z + dz;
  if (!intersectsAny(pos.x, nz, r, walls)) pos.z = nz;
}

function intersectsAny(x, z, r, walls) {
  for (const w of walls) {
    if (!w || w.disabled) continue;
    const a = w.min, b = w.max;
    // 圆 vs AABB（最近点法）
    const cx = Math.max(a.x, Math.min(x, b.x));
    const cz = Math.max(a.z, Math.min(z, b.z));
    const ddx = x - cx, ddz = z - cz;
    if (ddx*ddx + ddz*ddz < r*r) return true;
  }
  return false;
}

// 工具：从一个 BoxGeometry mesh 创建 AABB（用世界坐标）
export function aabbFromMesh(mesh, padding=0) {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  return {
    min: { x: box.min.x - padding, z: box.min.z - padding },
    max: { x: box.max.x + padding, z: box.max.z + padding },
    mesh,
  };
}

// 工具：直接从世界坐标矩形构建（更便宜）
export function aabb(x1, z1, x2, z2, extra={}) {
  return {
    min: { x: Math.min(x1, x2), z: Math.min(z1, z2) },
    max: { x: Math.max(x1, x2), z: Math.max(z1, z2) },
    ...extra,
  };
}
