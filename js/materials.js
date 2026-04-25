/* global THREE */
// 共享材质库 — 所有房间复用，避免重复创建
export const M = {
  floor : new THREE.MeshStandardMaterial({ color:0x14181e, roughness:0.85 }),
  wall  : new THREE.MeshStandardMaterial({ color:0x1c2028, roughness:0.9 }),
  ceil  : new THREE.MeshStandardMaterial({ color:0x0d0f13, roughness:1 }),
  desk  : new THREE.MeshStandardMaterial({ color:0x2a1f14, roughness:0.8 }),
  wood  : new THREE.MeshStandardMaterial({ color:0x4a2f18, roughness:0.7 }),
  metal : new THREE.MeshStandardMaterial({ color:0x3a3f46, roughness:0.45, metalness:0.7 }),
  metalDark: new THREE.MeshStandardMaterial({ color:0x1a1e24, roughness:0.7, metalness:0.4 }),
  black : new THREE.MeshStandardMaterial({ color:0x0a0c10, roughness:0.6 }),
  rack  : new THREE.MeshStandardMaterial({ color:0x1a1e24, roughness:0.7, metalness:0.4 }),
  door  : new THREE.MeshStandardMaterial({ color:0x2a2d34, roughness:0.7, metalness:0.5 }),
  warn  : new THREE.MeshStandardMaterial({ color:0x551010, emissive:0x441010 }),
  paper : new THREE.MeshStandardMaterial({ color:0xf3ecc6 }),
  yellow: new THREE.MeshStandardMaterial({ color:0xf5e97c, emissive:0x1a1800 }),
  cup   : new THREE.MeshStandardMaterial({ color:0xe8e8ea, roughness:0.35 }),
  coffee: new THREE.MeshStandardMaterial({ color:0x2a1608, roughness:0.5 }),
  glass : new THREE.MeshStandardMaterial({ color:0xaaeeff, transparent:true, opacity:0.35, roughness:0.1, metalness:0.1 }),
  leather: new THREE.MeshStandardMaterial({ color:0x2a1a14, roughness:0.6 }),
  carpet : new THREE.MeshStandardMaterial({ color:0x3a1818, roughness:1 }),
  marble : new THREE.MeshStandardMaterial({ color:0x9aa, roughness:0.3, metalness:0.1 }),
  red    : new THREE.MeshStandardMaterial({ color:0xaa2222, roughness:0.5, emissive:0x220000 }),
  blue   : new THREE.MeshStandardMaterial({ color:0x224488, roughness:0.5 }),
  usbMet : new THREE.MeshStandardMaterial({ color:0xb0b6bd, roughness:0.3, metalness:0.9 }),
  usbCap : new THREE.MeshStandardMaterial({ color:0x1a78d6, roughness:0.4 }),
  photoFrame: new THREE.MeshStandardMaterial({ color:0x3a2a1a }),
};

// 工厂：可发光屏幕材质（用于显示器/海报/倒计时屏）
export function emissive(color, opts={}) {
  return new THREE.MeshBasicMaterial({ color, toneMapped:false, ...opts });
}
