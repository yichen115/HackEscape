/* global THREE */
// 房间 1: 服务器机房 (B3)
import { engine } from '../engine.js';
import { M, emissive } from '../materials.js';
import { aabb } from '../collision.js';
import { pickable } from '../interact.js';
import { makeMonitorTex, makePhotoTex, makeCalendarTex, makeWhiteboardTex } from '../tex.js';
import { openViewer } from '../ui/viewer.js';
import { openKeypad } from '../ui/keypad.js';
import { openLogin } from '../ui/login.js';
import { openTerminal } from '../ui/terminal.js';
import { SFX, startAmbient } from '../sound.js';

export default function build() {
  const group = new THREE.Group();
  const pickables = [];
  const walls = [];
  const cullableWalls = [];
  const updates = [];      // 该房间专属的每帧更新（onTick 调用）

  // 答案
  const ANS = {
    cabinetCode : '0312',
    loginPw     : 'rex2015',
    doorCode    : '417',
    redLeds     : [4, 1, 7],
  };

  // 状态
  const F = {
    lamp:false, coffeeMoved:false, stickyRead:false,
    cabOpened:false, usbTaken:false,
    usbInserted:false, loggedIn:false, clueRead:false,
    leaving:false,
  };

  // ========= 房间几何（与 v1 等价）=========
  const room = group; // 别名

  // 地板
  const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 12), M.floor);
  floor.position.y = -0.1; room.add(floor);
  for (let x=-7; x<=7; x+=2) for (let z=-5; z<=5; z+=2) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.02, 1.95),
      new THREE.MeshStandardMaterial({ color:0x181c22, roughness:0.7 }));
    t.position.set(x, 0.01, z); room.add(t);
  }

  // 天花板
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 12), M.ceil);
  ceil.position.y = 6; room.add(ceil);
  cullableWalls.push({ mesh: ceil, aabb: { min:{x:-8,y:6,z:-6}, max:{x:8,y:6,z:6} }, normal: '-y' });

  // 4 面墙 + 门洞
  function wall(w, h, d, x, y, z, normal) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.wall);
    m.position.set(x, y, z); room.add(m);
    // 墙体碰撞 AABB
    const a = aabb(x - w/2, z - d/2, x + w/2, z + d/2, { mesh: m });
    walls.push(a);
    cullableWalls.push({
      mesh: m,
      aabb: { min:{x:x-w/2,y:y-h/2,z:z-d/2}, max:{x:x+w/2,y:y+h/2,z:z+d/2} },
      normal,
    });
    return m;
  }
  wall(16, 6, 0.2, 0, 3, -6, '+z');   // 后墙
  wall(16, 6, 0.2, 0, 3,  6, '-z');   // 前墙
  wall(0.2, 6, 12, -8, 3, 0, '+x');   // 左墙
  wall(0.2, 6, 4.5, 8, 3, -3.75, '-x');
  wall(0.2, 6, 4.5, 8, 3,  3.75, '-x');
  wall(0.2, 2, 3,   8, 5,  0, '-x');  // 门楣

  // ========= 桌子 / 显示器 / 键盘 / 咖啡杯 / 便签 / PC / 台灯 =========
  const desk = new THREE.Group(); desk.position.set(-2.2, 0, -4.4); room.add(desk);
  const dTop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 1.8), M.desk);
  dTop.position.y = 1.05; desk.add(dTop);
  for (const [dx,dz] of [[-1.9,-0.75],[1.9,-0.75],[-1.9,0.75],[1.9,0.75]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.12), M.desk);
    leg.position.set(dx, 0.52, dz); desk.add(leg);
  }

  // PC 主机
  const pcTower = new THREE.Group();
  const pcBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 1.2), M.metal);
  pcBox.position.y = 0.55; pcTower.add(pcBox);
  const pcLed = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12),
    new THREE.MeshBasicMaterial({ color:0x333333 }));
  pcLed.position.set(0.26, 0.95, 0); pcLed.rotation.y = Math.PI/2; pcTower.add(pcLed);
  const pcUsb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.15), M.black);
  pcUsb.position.set(0.26, 0.75, 0); pcTower.add(pcUsb);
  pcTower.position.set(-3.5, 0, -4.4); room.add(pcTower);
  pickables.push(pickable({ id:'r1_pc', mesh:pcTower, label:'主机 (USB 接口)', onClick: onClickPC }));

  // 显示器
  const monitor = new THREE.Group();
  const mBack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.08), M.black);
  mBack.position.y = 1.95; monitor.add(mBack);
  const mScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0),
    new THREE.MeshBasicMaterial({ map: makeMonitorTex('locked'), toneMapped:false }));
  mScreen.position.set(0, 1.95, 0.045); monitor.add(mScreen);
  const mStand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), M.metal);
  mStand.position.y = 1.2; monitor.add(mStand);
  const mBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.5), M.metal);
  mBase.position.y = 0.92; monitor.add(mBase);
  monitor.position.set(-2.8, 0.17, -4.6); monitor.rotation.y = 0.15;
  room.add(monitor);
  pickables.push(pickable({ id:'r1_monitor', mesh:monitor, label:'显示器', onClick: onClickMonitor }));

  // 键盘
  const kb = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.5), M.black);
  kb.position.set(-2.5, 1.15, -4.1); room.add(kb);
  for (let i=0; i<5; i++) for (let j=0; j<14; j++) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.03, 0.065),
      new THREE.MeshStandardMaterial({ color:0x1a1d22 }));
    k.position.set(-2.5 - 0.45 + j*0.07, 1.20, -4.1 - 0.16 + i*0.08);
    room.add(k);
  }

  // 咖啡杯
  const cup = new THREE.Group();
  const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.28, 16), M.cup);
  cupBody.position.y = 0.14; cup.add(cupBody);
  const cupLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.03, 16), M.coffee);
  cupLiq.position.y = 0.27; cup.add(cupLiq);
  // 把手：torus 半圆在 XY 平面，绕 Z 旋转 -π/2 让 "C" 朝外贴在杯子侧面
  const cupHandle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 8, 16, Math.PI), M.cup);
  cupHandle.position.set(0.14, 0.14, 0);
  cupHandle.rotation.z = -Math.PI / 2;
  cup.add(cupHandle);
  cup.position.set(-1.5, 1.21, -4.3); room.add(cup);
  pickables.push(pickable({ id:'r1_cup', mesh:cup, label:'咖啡杯', onClick: onClickCup }));

  // 便签（藏在咖啡杯下，初始不可见）
  const sticky = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.01, 0.35), M.yellow);
  sticky.position.set(-1.5, 1.20, -4.3); sticky.visible = false; room.add(sticky);
  pickables.push(pickable({ id:'r1_sticky', mesh:sticky, label:'便签', onClick: onClickSticky }));

  // 台灯
  const lamp = new THREE.Group();
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 12), M.metal);
  lampBase.position.y = 0.04; lamp.add(lampBase);
  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8), M.metal);
  lampArm.position.y = 0.4; lamp.add(lampArm);
  const lampArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), M.metal);
  lampArm2.position.set(0.2, 0.78, 0); lampArm2.rotation.z = Math.PI/3; lamp.add(lampArm2);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.24, 12, 1, true),
    new THREE.MeshStandardMaterial({ color:0xaa8555, side:THREE.DoubleSide }));
  lampShade.position.set(0.42, 0.94, 0); lampShade.rotation.z = -Math.PI/2 + 0.3; lamp.add(lampShade);
  lamp.position.set(-3.2, 1.11, -4.8); room.add(lamp);
  pickables.push(pickable({ id:'r1_lamp', mesh:lamp, label:'台灯 (关闭)', onClick: onClickLamp }));

  // 灯光（属于 group，不属于 scene；group remove 时会一起卸载）
  const ceilLight = new THREE.PointLight(0x6aa0ff, 0.18, 30, 1.6);
  ceilLight.position.set(0, 5.5, 0); room.add(ceilLight);
  const deskLight = new THREE.PointLight(0xffd28a, 0, 14, 1.8);
  deskLight.position.set(-2.2, 3.2, -4.2); room.add(deskLight);
  const alarm = new THREE.PointLight(0xff2a2a, 1.2, 10, 2);
  alarm.position.set(6.9, 4.0, 0); room.add(alarm);
  const keyLight = new THREE.DirectionalLight(0x88b0ff, 0.4);
  keyLight.position.set(-6, 8, 6); room.add(keyLight);

  // ========= 档案柜 =========
  const cab = new THREE.Group(); cab.position.set(-7, 0, -3); room.add(cab);
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.4, 1.4), M.metal);
  cabBody.position.y = 1.7; cab.add(cabBody);
  const cabDrawer = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.06), M.metal);
  cabDrawer.position.set(0, 2.4, 0.72); cab.add(cabDrawer);
  const cabDrawer2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.06), M.metal);
  cabDrawer2.position.set(0, 1.0, 0.72); cab.add(cabDrawer2);
  const cabLock = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12),
    new THREE.MeshStandardMaterial({ color:0xffd050, metalness:0.8 }));
  cabLock.rotation.x = Math.PI/2; cabLock.position.set(0, 2.4, 0.78); cab.add(cabLock);
  pickables.push(pickable({ id:'r1_cabinet', mesh:cab, label:'档案柜 (上锁)', onClick: onClickCabinet }));

  // 档案柜内 USB（隐藏）
  const usb = new THREE.Group();
  const usbBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.3), M.usbCap);
  const usbHead = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.18), M.usbMet);
  usbHead.position.z = 0.22; usb.add(usbBody); usb.add(usbHead);
  usb.position.set(-7, 2.45, -2.3); usb.visible = false; room.add(usb);
  pickables.push(pickable({ id:'r1_usb', mesh:usb, label:'USB 闪存盘', onClick: onClickUsb }));

  // ========= 左墙的照片 / 日历 =========
  const photo = new THREE.Group();
  const pFrame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.06), M.photoFrame);
  photo.add(pFrame);
  const pPic = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.05),
    new THREE.MeshBasicMaterial({ map: makePhotoTex(), toneMapped:false }));
  pPic.position.z = 0.04; photo.add(pPic);
  photo.position.set(-7.9, 3.0, 0.5); photo.rotation.y = Math.PI/2;
  room.add(photo);
  pickables.push(pickable({ id:'r1_photo', mesh:photo, label:'照片 "Rex"', onClick: () => openViewer(`
    <div class="photo"><div class="img dog"></div><div class="cap">REX · 出生于 2015 春</div></div>
  `) }));

  const cal = new THREE.Group();
  const calBg = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 0.05), M.paper);
  cal.add(calBg);
  const calPic = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4),
    new THREE.MeshBasicMaterial({ map: makeCalendarTex(), toneMapped:false }));
  calPic.position.z = 0.03; cal.add(calPic);
  cal.position.set(-7.9, 3.0, 3.2); cal.rotation.y = Math.PI/2;
  room.add(cal);
  pickables.push(pickable({ id:'r1_cal', mesh:cal, label:'墙上日历', onClick: () => {
    let html = '<div class="calendar"><div class="mon">MARCH · 2026</div><div class="grid">';
    ['S','M','T','W','T','F','S'].forEach(d => html += `<div class="day head">${d}</div>`);
    for (let d=1; d<=31; d++) html += `<div class="day ${d===12?'mark':''}">${d}</div>`;
    html += '</div><p style="margin-top:12px; font-size:14px; color:#555;">*老板娘手写：3/12 Rex 生日 🎂</p></div>';
    openViewer(html);
  }}));

  // 白板（后墙左半）
  const wb = new THREE.Group();
  const wbBg = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.05),
    new THREE.MeshStandardMaterial({ color:0xf4f4f0 }));
  wb.add(wbBg);
  const wbPic = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.7),
    new THREE.MeshBasicMaterial({ map: makeWhiteboardTex(), toneMapped:false }));
  wbPic.position.z = 0.03; wb.add(wbPic);
  wb.position.set(-2.4, 3.2, -5.88); room.add(wb);
  pickables.push(pickable({ id:'r1_wb', mesh:wb, label:'白板', onClick: () => openViewer(`
    <div style="background:#f4f4f0; color:#111; padding:20px; width:520px;
      box-shadow:4px 6px 0 rgba(0,0,0,0.5); border:3px solid #1a78d6; font-family:'VT323',monospace;">
      <h3 style="color:#1a78d6; font-size:24px; margin-bottom:10px;">// NIGHT SHIFT TODO</h3>
      <ol style="line-height:1.8; font-size:18px; color:#222; padding-left:20px;">
        <li>替换坏掉的 RAID 面板 (#2 机柜)</li>
        <li>老板的狗生日 — 提醒买蛋糕</li>
        <li>ATM 机房门换新密码</li>
      </ol>
      <p style="color:#aa1e1e; font-weight:bold; margin-top:10px;">!! 不要再把口令写在便签上 !!</p>
      <p style="color:#2a7a3e; margin-top:6px;">P.S. Rex 很乖。</p>
    </div>
  `)}));

  // ========= 服务器机柜 × 3 =========
  const rackGroups = [];
  function buildRack(x, redCount, idx) {
    const g = new THREE.Group(); g.position.set(x, 0, -5.2);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.4, 1.4), M.rack);
    body.position.y = 2.2; g.add(body);
    const front = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.2, 0.05),
      new THREE.MeshStandardMaterial({ color:0x0a0d12 }));
    front.position.set(0, 2.2, 0.7); g.add(front);
    const slots = 12;
    const seed = [7,2,11,4,0,8,3,1,9,5,10,6];
    const redSet = new Set(seed.slice(0, redCount));
    for (let i=0;i<slots;i++){
      const y = 0.6 + i * 0.28;
      const isRed = redSet.has(i);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.22, 0.02),
        new THREE.MeshStandardMaterial({ color:0x15181d }));
      panel.position.set(0, y, 0.74); g.add(panel);
      const led = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12),
        new THREE.MeshBasicMaterial({ color: isRed ? 0xff3030 : 0x30ff70 }));
      led.position.set(-0.4, y, 0.76); g.add(led);
      for (let k=0;k<3;k++) {
        const v = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.01),
          new THREE.MeshStandardMaterial({ color:0x05070a }));
        v.position.set(0.15 + k*0.18, y, 0.76); g.add(v);
      }
      const barcode = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.005),
        new THREE.MeshStandardMaterial({ color:0xd0d0d0 }));
      barcode.position.set(-0.1, y-0.06, 0.76); g.add(barcode);
      if (isRed) {
        const pl = new THREE.PointLight(0xff3030, 0.18, 1.2, 2);
        pl.position.set(-0.4, y, 0.95); g.add(pl);
      }
      led.userData.blinker = { phase: Math.random()*6 };
    }
    room.add(g);
    pickables.push(pickable({ id:'r1_rack'+idx, mesh:g, label:`服务器机柜 #${idx+1}`,
      onClick: () => openViewer(renderRackDetail(idx, redCount))
    }));
    rackGroups.push(g);
    // 机柜不挡人（用户要求只有墙挡）
  }
  buildRack( 2.5, ANS.redLeds[0], 0);
  buildRack( 4.2, ANS.redLeds[1], 1);
  buildRack( 5.9, ANS.redLeds[2], 2);

  function renderRackDetail(idx, redCount) {
    const seed = [7,2,11,4,0,8,3,1,9,5,10,6];
    const redSet = new Set(seed.slice(0, redCount));
    let leds = '';
    for (let i=11; i>=0; i--) {
      const red = redSet.has(i);
      leds += `<div style="display:flex; align-items:center; border-bottom:1px solid #222; padding:6px 10px;">
        <div style="width:14px; height:14px; border-radius:50%;
          background:${red?'#ff3030':'#30ff70'};
          box-shadow:0 0 8px ${red?'#ff3030':'#30ff70'}; margin-right:14px;"></div>
        <div style="font-family:'Share Tech Mono',monospace; font-size:12px; color:#9fffbf;">
          SRV-${idx+1}-${String(i+1).padStart(2,'0')}
          <span style="color:#555; margin-left:10px;">
            ${red ? 'STATUS: <span style=\"color:#ff7777\">FAULT</span>' : 'STATUS: <span style=\"color:#7fff9b\">OK</span>'}
          </span></div></div>`;
    }
    return `<div style="background:#000; border:1px solid #2ea058; min-width:400px;">
      <div style="background:#0a1f12; padding:10px 14px; border-bottom:1px solid #1e5a33;
        color:#6effb4; letter-spacing:2px;">// SERVER RACK #${idx+1} — LED PANEL</div>
      <div>${leds}</div></div>`;
  }

  // ========= 门 + 键盘 =========
  const door = new THREE.Group();
  const dPanel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 3), M.door);
  dPanel.position.set(0, 2, -1.5); door.add(dPanel);
  const dHandle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.25),
    new THREE.MeshStandardMaterial({ color:0xb0b0b0, metalness:0.8, roughness:0.3 }));
  dHandle.position.set(-0.12, 2, -2.6); door.add(dHandle);
  const dAlarmBulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12),
    new THREE.MeshBasicMaterial({ color:0xff1a1a }));
  dAlarmBulb.position.set(-0.08, 3.6, -1.5); door.add(dAlarmBulb);
  door.position.set(8, 0, 1.5); room.add(door);
  pickables.push(pickable({ id:'r1_door', mesh:door, label:'出口门 (上锁)', onClick: onClickDoor }));
  // 门作为可解锁的 AABB
  const doorAabb = aabb(7.95, -1.5, 8.05, 1.5, { mesh: door });
  walls.push(doorAabb);

  // 门旁键盘
  const keyPanel = new THREE.Group();
  const kpBg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.08),
    new THREE.MeshStandardMaterial({ color:0x222831 }));
  keyPanel.add(kpBg);
  const kpScr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2),
    new THREE.MeshBasicMaterial({ color:0xff3030 }));
  kpScr.position.set(0, 0.22, 0.045); keyPanel.add(kpScr);
  for (let r=0;r<4;r++) for (let c=0;c<3;c++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.02),
      new THREE.MeshStandardMaterial({ color:0x11161c }));
    b.position.set(-0.2 + c*0.2, 0.05 - r*0.14, 0.045); keyPanel.add(b);
  }
  keyPanel.rotation.y = -Math.PI/2;
  keyPanel.position.set(7.95, 2.2, -2.5);
  room.add(keyPanel);
  pickables.push(pickable({ id:'r1_doorpad', mesh:keyPanel, label:'门禁键盘', onClick: onClickDoor }));

  // 杂物（不挡）
  for (const [x,z] of [[-6,4],[-5,4.6],[6,-4.5]]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
      new THREE.MeshStandardMaterial({ color:0x5a3d1c, roughness:0.9 }));
    box.position.set(x, 0.5, z); room.add(box);
  }

  // ========= 帧动画（警示灯脉动 + LED 闪烁 + 警报） =========
  let elapsed = 0;
  function onTick(dt) {
    elapsed += dt;
    alarm.intensity = F.leaving ? 0 : (0.9 + Math.sin(elapsed*6) * 0.4);
    rackGroups.forEach(g => g.traverse(c => {
      if (c.isMesh && c.userData.blinker) {
        const s = 1 + Math.sin(elapsed*3 + c.userData.blinker.phase) * 0.08;
        c.scale.set(s, s, 1);
      }
    }));
  }

  // ========= 交互 =========
  function onClickLamp() {
    if (F.lamp) { engine.showHint('台灯已经开着了。'); return; }
    F.lamp = true;
    SFX.switchOn();
    deskLight.intensity = 1.6;
    ceilLight.intensity = 0.95;
    pickables.find(p => p.id === 'r1_lamp').label = '台灯 (打开)';
    engine.showHint('台灯点亮了。屋里亮堂些了。');
    advance();
  }

  function onClickCup() {
    if (!F.coffeeMoved) {
      SFX.click();
      cup.position.x = -0.7;
      sticky.visible = true;
      F.coffeeMoved = true;
      pickables.find(p => p.id === 'r1_cup').label = '咖啡杯 (已移开)';
      engine.showHint('键盘角落下压着一张便签。');
      advance();
    } else engine.showHint('只是杯凉掉的咖啡。');
  }

  function onClickSticky() {
    if (!sticky.visible) return;
    SFX.paperRustle();
    F.stickyRead = true;
    openViewer(`
      <div class="sticky">
        <div class="h">// sticky note</div>
        IT 别再 Slack 找我换密码了。<br>
        admin 默认口令 = 我家那只的名字 + 它出生的那一年。<br>
        合规要轮换？让 Marcus 处理 — 他 IT 出身，懂这些。<br>
        <span style="color:#aa2a2a; font-size:18px;">—— L. 老板·9F</span>
      </div>`);
    advance();
  }

  function onClickCabinet() {
    if (F.cabOpened) {
      if (!F.usbTaken) {
        SFX.pickup();
        F.usbTaken = true;
        usb.visible = false;
        engine.inventory.add('r1_usb', 'USB 闪存盘 (机房)');
        engine.showHint('你抓起了 USB 闪存盘。');
        advance();
      } else engine.showHint('档案柜里已经空了。');
      return;
    }
    openKeypad({
      title: '档案柜密码', desc: '— 4 位数字 —', length: 4, answer: ANS.cabinetCode,
      onSuccess: () => {
        F.cabOpened = true;
        SFX.doorUnlock();
        SFX.drawerSlide();
        pickables.find(p => p.id === 'r1_cabinet').label = '档案柜 (已开)';
        cabDrawer.position.z = 1.1;
        usb.visible = true;
        engine.showHint('档案柜 "咔嗒" 一声开了。里面有个 USB。');
        advance();
      }
    });
  }
  function onClickUsb() { if (F.cabOpened && !F.usbTaken) onClickCabinet(); else engine.showHint('需要先打开档案柜。'); }

  function onClickPC() {
    if (!engine.inventory.has('r1_usb')) {
      engine.showHint('PC 没插入任何启动介质，风扇停着。');
      return;
    }
    if (!F.usbInserted) {
      F.usbInserted = true;
      SFX.usbInsert();
      pcLed.material = new THREE.MeshBasicMaterial({ color:0x30ff70 });
      setTimeout(() => SFX.switchOn(), 200);
      mScreen.material.map = makeMonitorTex('login');
      mScreen.material.needsUpdate = true;
      engine.inventory.remove('r1_usb');
      engine.showHint('USB 插入。显示器亮了，要求登录。');
      advance();
    } else engine.showHint('USB 已经插好了。');
  }

  function onClickMonitor() {
    if (!F.usbInserted) { engine.showHint('显示器是黑的。主机似乎没启动。'); return; }
    if (!F.loggedIn) {
      openLogin({
        title:'SECURE LOGIN', sub:'MERIDIAN CORP · terminal-07',
        verify: (pw) => pw.trim().toLowerCase() === ANS.loginPw,
        onSuccess: () => {
          F.loggedIn = true;
          mScreen.material.map = makeMonitorTex('desktop');
          mScreen.material.needsUpdate = true;
          openR1Terminal();
          engine.showHint('登录成功。终端已开启。');
          advance();
        },
      });
    } else openR1Terminal();
  }

  function openR1Terminal() {
    const FS = {
      'readme.txt': 'MERIDIAN 红队实验台 — 用完请退出 admin 账户。',
      'clue.txt'  : '[ENCRYPTED BY bossware v0.3 — 需要 decryptor.bin]',
      'decryptor.bin': '<binary>',
    };
    openTerminal({
      promptHead: 'root@meridian-07:~#',
      init: [
        'Meridian Linux 5.19.0-meri · tty0',
        'Last login from 10.44.2.9 at 01:32:07',
        '',
        '>>> 连接已被外网隔离。请手动定位门禁密码线索。',
        '>>> 提示：用 "help" 查看可用命令。',
        '',
      ],
      commands: {
        help: (_, t) => t.print('可用命令: ls, cat <file>, whoami, pwd, decrypt <file>, clear, exit'),
        ls:   (_, t) => t.print(Object.keys(FS).join('   ')),
        pwd:  (_, t) => t.print('/home/admin'),
        whoami: (_, t) => t.print('admin  (uid=1000, group=ops, trusted=FALSE)'),
        cat:  (a, t) => {
          const f = a[0];
          if (!f) return t.print('用法: cat <file>');
          if (FS[f] === undefined) return t.print('cat: ' + f + ': 没有那个文件');
          t.print(FS[f]);
          if (f === 'clue.txt' && !F.clueRead) t.print('>>> 试试: decrypt clue.txt');
        },
        decrypt: (a, t) => {
          if (a[0] !== 'clue.txt') return t.print('decrypt: 只识别 clue.txt');
          t.print('[decryptor.bin] loading payload ...');
          setTimeout(() => {
            t.print('[decryptor.bin] AES-256 · key = USB.identity');
            t.print('[decryptor.bin] ok.');
            t.print('--------------------------------');
            t.print('  门禁机械码只有内鬼知道。但他懒——');
            t.print('  他用机柜 #1 / #2 / #3 上当前点亮的');
            t.print('  "RED LED" 数量当三位门禁码。');
            t.print('  从左到右，依次读。');
            t.print('--------------------------------');
            F.clueRead = true;
            engine.showHint('线索解密：门禁码 = 3 个机柜的红灯数。');
            advance();
          }, 500);
        },
        clear: (_, t) => t.clear(),
        exit:  (_, t) => t.close(),
      },
    });
  }

  function onClickDoor() {
    if (F.leaving) {
      // 已经解过门 —— 直接上楼到 6F
      engine.goto(1);
      return;
    }
    if (!F.clueRead) engine.showHint('门上的键盘要 3 位数字。你还不知道密码。');
    openKeypad({
      title:'门禁密码', desc:'— 3 位数字 —', length:3, answer: ANS.doorCode,
      onSuccess: () => {
        F.leaving = true;
        SFX.doorUnlock();
        setTimeout(() => SFX.doorOpen(), 250);
        doorAabb.disabled = true;
        engine.inventory.add('r1_logs', '机房访问日志 [证据]');
        let t = 0;
        const target = Math.PI/2 - 0.3;
        const iv = setInterval(() => {
          t += 0.04;
          door.rotation.y = -Math.min(target, t);
          if (t >= target) {
            clearInterval(iv);
            engine.showHint('门开了。穿过走廊向上一层。');
            setTimeout(() => engine.next(), 600);
          }
        }, 30);
      }
    });
  }

  // ========= 目标推进 =========
  function advance() {
    if (!F.lamp)        return engine.setObjective('房间太暗。点亮桌上的台灯。');
    if (!F.coffeeMoved) return engine.setObjective('在桌面上找找有用的东西。');
    if (!F.stickyRead)  return engine.setObjective('查看便签。');
    if (!F.cabOpened)   return engine.setObjective('打开档案柜（4 位密码）。墙上可能有线索。');
    if (!F.usbTaken)    return engine.setObjective('从档案柜里拿出 USB 闪存盘。');
    if (!F.usbInserted) return engine.setObjective('把 USB 插入 PC 主机。');
    if (!F.loggedIn)    return engine.setObjective('登录显示器上的系统。');
    if (!F.clueRead)    return engine.setObjective('在终端里找到门禁线索 (试 `help`、`ls`、`decrypt`)。');
    if (!F.leaving)     return engine.setObjective('清点机柜红灯，输入门禁密码逃脱。');
    return engine.setObjective('门开了。穿过去。');
  }

  return {
    id: 'room1',
    title: 'B3 · 服务器机房',
    objective: '房间太暗。点亮桌上的台灯。',
    banner: { floor:'B3 · BASEMENT 03', name:'服务器机房', desc:'01:47 AM · MERIDIAN 数据中心' },
    group, pickables, walls, cullableWalls,
    spawnPos: new THREE.Vector3(5.6, 1.65, 4.5),
    spawnYaw: 0.78,            // 朝向房间中心 (desk / 机柜 / 后墙)
    spawnPitch: -0.05,
    init() { startAmbient('server'); },
    cleanup() {},
    onTick,
  };
}
