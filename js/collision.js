/* global THREE */
// 玩家圆柱 vs AABB 列表的滑墙碰撞 + 立体碰撞 + 站立面查询
// AABB 形如 { min:{x,y,z}, max:{x,y,z}, disabled?, mesh? }
// 墙体使用 aabb()（y 隐含 -1 ~ 100，等同全高）
// 家具使用 aabb3() 或 aabbFromMesh()（带真实 y 范围 → 玩家能跳上去）

import { engine } from './engine.js';

const FEET_OFFSET = 1.65;     // 玩家眼离脚的高度
const HEAD_OFFSET = 0.10;     // 玩家眼上方的小余量
const STEP_HEIGHT = 0.4;      // 自动跨步：相对脚高 ≤ 0.4m 的障碍物不挡水平 (台阶/低坡)

// 2D 范围墙：y 自动覆盖全高
export function aabb(x1, z1, x2, z2, extra={}) {
  return {
    min: { x: Math.min(x1,x2), y: -1, z: Math.min(z1,z2) },
    max: { x: Math.max(x1,x2), y: 100, z: Math.max(z1,z2) },
    ...extra,
  };
}

// 3D 范围家具：能挡能站
export function aabb3(x1, y1, z1, x2, y2, z2, extra={}) {
  return {
    min: { x: Math.min(x1,x2), y: Math.min(y1,y2), z: Math.min(z1,z2) },
    max: { x: Math.max(x1,x2), y: Math.max(y1,y2), z: Math.max(z1,z2) },
    ...extra,
  };
}

// 从 mesh 自动算 AABB（递归 group 子物体）
export function aabbFromMesh(mesh, padding=0) {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  return {
    min: { x: box.min.x - padding, y: box.min.y, z: box.min.z - padding },
    max: { x: box.max.x + padding, y: box.max.y, z: box.max.z + padding },
    mesh,
  };
}

// 水平移动：分轴推进 + 垂直过滤（不挡脚下/头上的盒子）
export function tryMove(pos, dx, dz) {
  const r = engine.player.radius;
  const walls = (engine.current && engine.current.walls) || [];
  const feetY = pos.y - FEET_OFFSET;
  const headY = pos.y + HEAD_OFFSET;

  let nx = pos.x + dx;
  if (!intersectsAny(nx, pos.z, r, feetY, headY, walls)) pos.x = nx;
  let nz = pos.z + dz;
  if (!intersectsAny(pos.x, nz, r, feetY, headY, walls)) pos.z = nz;
}

function intersectsAny(x, z, r, feetY, headY, list) {
  for (const w of list) {
    if (!w || w.disabled) continue;
    // 垂直过滤：AABB 完全在脚下（玩家站它上面）或完全在头上（吊顶）
    if (w.max.y <= feetY + 0.02) continue;
    if (w.min.y >= headY) continue;
    // 自动跨步：障碍物比脚高 ≤ STEP_HEIGHT 的，不挡水平 (走上去 + groundYAt 抬高)
    // 但只对从地面起的家具有效（min.y 接近脚 → 真"台阶"），墙体 min.y=-1 不豁免
    if (w.min.y < feetY + 0.02 && w.max.y - feetY <= STEP_HEIGHT) continue;
    const a = w.min, b = w.max;
    const cx = Math.max(a.x, Math.min(x, b.x));
    const cz = Math.max(a.z, Math.min(z, b.z));
    const ddx = x - cx, ddz = z - cz;
    if (ddx*ddx + ddz*ddz < r*r) return true;
  }
  return false;
}

// 查询 (x,z) 处可站立的最高表面（家具顶或地板）
export function groundYAt(x, z) {
  const r = engine.player.radius * 0.5;     // 边缘检测半径略小
  const walls = (engine.current && engine.current.walls) || [];
  let topY = 0;     // 默认地板 y=0
  for (const w of walls) {
    if (!w || w.disabled) continue;
    if (w.max.y > 50) continue;             // 跳过墙体（无限高，站不上去）
    // XZ 是否在 AABB 投影内（含玩家半径）
    const inside = (x + r > w.min.x && x - r < w.max.x &&
                    z + r > w.min.z && z - r < w.max.z);
    if (!inside) continue;
    if (w.max.y > topY) topY = w.max.y;
  }
  return topY;
}
