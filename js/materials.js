/* global THREE */
import { textured } from './surfaces.js';

// 共享材质库 — 所有房间复用，避免重复创建
export const M = {
  floor : new THREE.MeshStandardMaterial({ color:0x14181e, roughness:0.85 }),
  wall  : new THREE.MeshStandardMaterial({ color:0x1c2028, roughness:0.9 }),
  ceil  : new THREE.MeshStandardMaterial({ color:0x0d0f13, roughness:1 }),
  desk  : textured(0x715441, 'wood', { roughness:.58, envMapIntensity:.18 }),
  wood  : textured(0x705038, 'wood', { roughness:.48, envMapIntensity:.2 }),
  metal : textured(0x6c7780, 'metal', { roughness:.4, metalness:.65, envMapIntensity:.22 }),
  metalDark: textured(0x313b45, 'metal', { roughness:.62, metalness:.45, envMapIntensity:.12 }),
  black : new THREE.MeshStandardMaterial({ color:0x0a0c10, roughness:0.68, envMapIntensity:.12 }),
  rack  : textured(0x313b45, 'metal', { roughness:.62, metalness:.45, envMapIntensity:.12 }),
  door  : textured(0x4c555e, 'metal', { roughness:.48, metalness:.5, envMapIntensity:.18 }),
  warn  : new THREE.MeshStandardMaterial({ color:0x551010, emissive:0x441010 }),
  paper : textured(0xf3ecc6,'paper',{roughness:1,envMapIntensity:0}),
  yellow: new THREE.MeshStandardMaterial({ color:0xf5e97c, emissive:0x1a1800 }),
  cup   : new THREE.MeshStandardMaterial({ color:0xe8e8ea, roughness:0.35 }),
  coffee: new THREE.MeshStandardMaterial({ color:0x2a1608, roughness:0.5 }),
  glass : new THREE.MeshStandardMaterial({ color:0xaaeeff, transparent:true, opacity:0.3, roughness:0.08, metalness:0.15, envMapIntensity:.55 }),
  leather: textured(0x242d31, 'carpet', { roughness:.85, envMapIntensity:.08 }),
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
