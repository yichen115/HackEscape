/* global THREE */
// 仅用于美术审阅；不运行游戏循环、房间 init、解谜计时器。
import { engine } from './engine.js';
import { reviewViews } from './review-views.js';
import buildRoom1 from './rooms/room1-server.js';
import buildRoom2 from './rooms/room2-monitor.js';
import buildRoom3 from './rooms/room3-office.js';
import buildRoom4 from './rooms/room4-secure.js';
const builders=[buildRoom1,buildRoom2,buildRoom3,buildRoom4],built=[];
const names=['服务器机房','监控室','主管办公室','顶层机要室'];
const descriptions=['冷色金属 / 维修工作台 / 应急照明','监控矩阵 / 操作控制台 / 冷色工业空间','深色木饰面 / 皮质座椅 / 深夜城市窗景','精密工作站 / 环形平台 / 蓝色安全边界'];
let index=0,room,drag=null,yaw=0,pitch=0,lastMotion='';
const keys=new Set(),clock=new THREE.Clock();
const viewSelect=document.getElementById('preview-view');
function selectView(id) {
  const view=reviewViews[index].find(v=>v.id===id)||reviewViews[index][0];
  engine.camera.position.set(...view.position);
  const direction=new THREE.Vector3(...view.target).sub(engine.camera.position).normalize();
  yaw=Math.atan2(-direction.x,-direction.z);pitch=Math.asin(direction.y);
  engine.camera.fov=70;engine.camera.updateProjectionMatrix();
  viewSelect.value=view.id;keys.clear();
  document.getElementById('preview-interact').hidden=![0,1,2].includes(index)||!id.startsWith('drawer');
  render();
}
engine.player.paused=true;
function selectRoom(i) {
  if(room)engine.scene.remove(room.group);
  index=i;room=built[i]||(built[i]=builders[i](engine));engine.scene.add(room.group);
  engine.camera.position.copy(room.spawnPos);yaw=[.78,.62,.8,.9][i];pitch=room.spawnPitch||0;
  engine.renderer.shadowMap.needsUpdate=true;
  document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('active',Number(b.dataset.room)===i));
  document.getElementById('preview-title').textContent=names[i];
  document.getElementById('preview-caption').textContent=descriptions[i];
  document.getElementById('preview-light').hidden=i!==0;
  document.getElementById('hint').classList.remove('show');
  viewSelect.replaceChildren(...reviewViews[i].map(v=>{const option=document.createElement('option');option.value=v.id;option.textContent=v.name;return option;}));
  selectView('wide');
  updateLightLabel();
}
document.getElementById('preview-interact').addEventListener('click',()=>{
  const drawer=room.pickables.find(p=>p.id===['r1_cabinet','r2_drawer','r3_desk_drawer'][index]);
  drawer?.onClick();engine.renderer.shadowMap.needsUpdate=true;
});
viewSelect.addEventListener('change',()=>selectView(viewSelect.value));
window.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;keys.add(e.code);});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>keys.clear());
function updateLightLabel(){document.getElementById('preview-light').textContent=room?.group.userData.visualPowerLight?.intensity ? '台灯已打开' : '预览：打开台灯';}
document.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',()=>selectRoom(Number(b.dataset.room))));
document.getElementById('preview-light').addEventListener('click',()=>{
  // 调用游戏现有开灯回调；不能跳过任何开灯逻辑。只影响当前独立预览实例。
  room.pickables.find(p=>p.id==='r1_lamp').onClick();updateLightLabel();engine.renderer.shadowMap.needsUpdate=true;
});
const canvas=engine.renderer.domElement;
// 独立预览使用拖动相机，原弹窗关闭时不在这里重新锁定鼠标。
canvas.requestPointerLock=()=>{};
canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
  if(!drag)return;yaw-=(e.clientX-drag[0])*.003;pitch-=(e.clientY-drag[1])*.003;
  pitch=Math.max(-1.1,Math.min(1.1,pitch));drag=[e.clientX,e.clientY];
});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();engine.camera.fov=Math.max(40,Math.min(85,engine.camera.fov+e.deltaY*.03));engine.camera.updateProjectionMatrix();},{passive:false});
function render() {
  const dt=Math.min(clock.getDelta(),.05),speed=(keys.has('ShiftLeft')?5:2.5)*dt;
  const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
  const right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  engine.camera.position.x+=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed;
  engine.camera.position.z+=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed;
  engine.camera.position.y+=(Number(keys.has('KeyE'))-Number(keys.has('KeyQ')))*speed;
  const motion=room.pickables.filter(p=>p.id.includes('drawer')).map(p=>p.mesh.position.z).join('/');
  if(motion!==lastMotion){engine.renderer.shadowMap.needsUpdate=true;lastMotion=motion;}
  engine.camera.rotation.set(pitch,yaw,0,'YXZ');
  const power=room.group.userData.visualPowerLight;
  engine.renderer.toneMappingExposure=power && power.intensity===0 ? .45 : 1;
  engine.renderer.render(engine.scene,engine.camera);
}
selectRoom(0);
engine.renderer.setAnimationLoop(render);
