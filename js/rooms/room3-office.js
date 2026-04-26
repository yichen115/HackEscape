/* global THREE */
// 房间 3: 主管办公室 (7F)
import { engine } from '../engine.js';
import { M } from '../materials.js';
import { aabb } from '../collision.js';
import { pickable } from '../interact.js';
import { makeFamilyPhotoTex, makePaintingTex, makeEmailHTML } from '../tex.js';
import { openViewer } from '../ui/viewer.js';
import { openKeypad } from '../ui/keypad.js';
import { SFX, startAmbient } from '../sound.js';

export default function build() {
  const group = new THREE.Group();
  const pickables = [];
  const walls = [];
  const cullableWalls = [];

  const ANS = {
    safeCode : '0407',
    floor8Code: '3371',
  };
  const F = {
    deskDrawerOpen:false, dustTaken:false, glassDusted:false,
    fingerprintTaken:false, laptopUnlocked:false, emailRead:false,
    photoSeen:false, paintingMoved:false, safeOpen:false, usbTaken:false, codeRead:false,
    leaving:false,
  };

  // ========= 房间外壳 =========
  const W = 11, D = 9, H = 5;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D),
    new THREE.MeshStandardMaterial({ color:0x3a1818, roughness:1 }));   // 地毯
  floor.position.y = -0.1; group.add(floor);
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D),
    new THREE.MeshStandardMaterial({ color:0xeee8d8, roughness:0.95 }));
  ceil.position.y = H; group.add(ceil);
  cullableWalls.push({ mesh: ceil, aabb: { min:{x:-W/2,y:H,z:-D/2}, max:{x:W/2,y:H,z:D/2} }, normal:'-y' });

  function wall(w, h, d, x, y, z, normal) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color:0x4a3826, roughness:0.85 }));
    m.position.set(x, y, z); group.add(m);
    walls.push(aabb(x - w/2, z - d/2, x + w/2, z + d/2, { mesh: m }));
    cullableWalls.push({
      mesh: m,
      aabb: { min:{x:x-w/2,y:y-h/2,z:z-d/2}, max:{x:x+w/2,y:y+h/2,z:z+d/2} },
      normal,
    });
    return m;
  }
  wall(W, H, 0.2, 0, H/2, -D/2, '+z');
  wall(W, H, 0.2, 0, H/2,  D/2, '-z');
  wall(0.2, H, D, -W/2, H/2, 0, '+x');
  // 右墙分两段，门洞精确匹配门宽 (z=[-1.5, 1.5])
  wall(0.2, H, 3.0, W/2, H/2, -3.0, '-x');  // 后段 z=[-4.5, -1.5]
  wall(0.2, H, 3.0, W/2, H/2,  3.0, '-x');  // 前段 z=[+1.5, +4.5]
  wall(0.2, 1.8, 3,  W/2, H - 0.9, 0, '-x');// 门楣，正好门宽

  // ========= 大木桌（朝向门口）=========
  const desk = new THREE.Group(); desk.position.set(-1.5, 0, -2.5); group.add(desk);
  const dTop = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 1.6), M.wood);
  dTop.position.y = 1.05; desk.add(dTop);
  const dFront = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.85, 0.1), M.wood);
  dFront.position.set(0, 0.5, 0.75); desk.add(dFront);
  for (const [x,z] of [[-1.4,0.7],[1.4,0.7]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), M.wood);
    leg.position.set(x, 0.5, z); desk.add(leg);
  }

  // 抽屉（桌下右侧，挂在椅子那一侧 -z；敞口盒结构，向 -z 拉出）
  const deskDrawer = new THREE.Group();
  deskDrawer.position.set(1.0, 0.7, -0.4);   // 局部 -z = 椅子方向
  desk.add(deskDrawer);
  const DR_W = 0.85, DR_H = 0.3, DR_D = 0.6, DR_T = 0.04;
  const drawerMat = new THREE.MeshStandardMaterial({ color:0x4a3826, roughness:0.7 });
  // 底板
  const drBottom = new THREE.Mesh(new THREE.BoxGeometry(DR_W, DR_T, DR_D), drawerMat);
  drBottom.position.y = -DR_H/2; deskDrawer.add(drBottom);
  // 后板（朝 +z，朝向桌子中心）
  const drBack = new THREE.Mesh(new THREE.BoxGeometry(DR_W, DR_H, DR_T), drawerMat);
  drBack.position.set(0, 0, +DR_D/2 - DR_T/2); deskDrawer.add(drBack);
  // 左右侧板
  const drLeftWall = new THREE.Mesh(new THREE.BoxGeometry(DR_T, DR_H, DR_D), drawerMat);
  drLeftWall.position.set(-DR_W/2 + DR_T/2, 0, 0); deskDrawer.add(drLeftWall);
  const drRightWall = new THREE.Mesh(new THREE.BoxGeometry(DR_T, DR_H, DR_D), drawerMat);
  drRightWall.position.set(DR_W/2 - DR_T/2, 0, 0); deskDrawer.add(drRightWall);
  // 前面板（朝 -z，从椅子那侧能看到的"门面"）
  const drFront = new THREE.Mesh(new THREE.BoxGeometry(DR_W, DR_H + 0.05, DR_T),
    new THREE.MeshStandardMaterial({ color:0x553f25, roughness:0.6 }));
  drFront.position.set(0, 0, -DR_D/2 + DR_T/2); deskDrawer.add(drFront);
  // 把手（在前面板外侧）
  const ddHandle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.05),
    new THREE.MeshStandardMaterial({ color:0xc8aa66, metalness:0.6 }));
  ddHandle.position.set(0, 0, -DR_D/2 - 0.025); deskDrawer.add(ddHandle);
  pickables.push(pickable({ id:'r3_desk_drawer', mesh:deskDrawer, label:'桌下抽屉', onClick: onClickDeskDrawer }));

  // 指纹粉末套装：作为抽屉子物体，跟着抽屉一起被拉出来
  const dustKit = new THREE.Group();
  const dkBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.10, 0.20),
    new THREE.MeshStandardMaterial({ color:0x111418 }));
  dkBox.position.y = 0.05; dustKit.add(dkBox);
  const dkLid = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, 0.20),
    new THREE.MeshStandardMaterial({ color:0xaa4040, emissive:0x331010, emissiveIntensity:0.6 }));
  dkLid.position.y = 0.115; dustKit.add(dkLid);
  // 摆放在抽屉前部（拉出后正好露在抽屉口）
  dustKit.position.set(0, -DR_H/2 + 0.04, -0.12);
  dustKit.visible = false;
  deskDrawer.add(dustKit);
  pickables.push(pickable({ id:'r3_dustkit', mesh:dustKit, label:'指纹粉末套装', onClick: () => {
    if (!F.deskDrawerOpen) return;
    if (F.dustTaken) { engine.showHint('已经在身上了。'); return; }
    SFX.pickup();
    F.dustTaken = true;
    dustKit.visible = false;
    engine.inventory.add('r3_dustkit', '指纹粉末套装');
    engine.showHint('指纹粉末套装到手 — 用在玻璃面上能取指纹。');
    advance();
  }}));

  // 桌上笔记本电脑
  const laptop = new THREE.Group();
  const lpBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.55), M.metal);
  lpBase.position.y = 1.10; laptop.add(lpBase);
  const lpScreen = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.5, 0.03), M.metal);
  lpScreen.position.set(0, 1.36, -0.26); lpScreen.rotation.x = -0.18; laptop.add(lpScreen);
  const lpScrFace = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42),
    new THREE.MeshBasicMaterial({ color:0x111418 }));
  lpScrFace.position.set(0, 1.36, -0.245); lpScrFace.rotation.x = -0.18; laptop.add(lpScrFace);
  laptop.userData.scrFace = lpScrFace;
  // 指纹传感器
  const fpsensor = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16),
    new THREE.MeshStandardMaterial({ color:0x9999cc, emissive:0x222266 }));
  fpsensor.rotation.x = -Math.PI/2; fpsensor.position.set(0.32, 1.13, -0.05); laptop.add(fpsensor);
  laptop.position.set(-1.3, 0, -2.6);
  laptop.rotation.y = Math.PI;          // 屏幕朝椅子方向（-z）—— Marcus 的视角
  group.add(laptop);
  pickables.push(pickable({ id:'r3_laptop', mesh:laptop, label:'笔记本电脑 (指纹锁)', onClick: onClickLaptop }));

  // 桌上家庭相框（小）
  const photo = new THREE.Group();
  const phFrame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.05), M.wood);
  photo.add(phFrame);
  const phPic = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34),
    new THREE.MeshBasicMaterial({ map: makeFamilyPhotoTex(), toneMapped:false }));
  phPic.position.z = 0.03; photo.add(phPic);
  photo.position.set(-2.2, 1.32, -2.7);
  photo.rotation.y = Math.PI - 0.3;     // 朝椅子方向，并保留原来的 17° 微侧
  group.add(photo);
  pickables.push(pickable({ id:'r3_photo', mesh:photo, label:'家庭相框', onClick: () => {
    F.photoSeen = true;
    openViewer(`
      <div class="photo">
        <div class="img family"></div>
        <div class="cap">Anniversary · April 7, 2008</div>
      </div>
      <p style="text-align:center; color:#a0ffb9; margin-top:10px;">(老婆 + 一个女儿。结婚 18 周年纪念 — 04/07/2008)</p>
    `);
    advance();
  }}));

  // ========= 皮椅（不挡）=========
  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.7), M.leather);
  seat.position.y = 0.55; chair.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.1), M.leather);
  back.position.set(0, 1.0, -0.3); chair.add(back);
  const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), M.metalDark);
  cBase.position.y = 0.25; chair.add(cBase);
  chair.position.set(-1.5, 0, -3.5); group.add(chair);

  // ========= 酒柜 (左墙) =========
  const wcab = new THREE.Group(); wcab.position.set(-W/2 + 0.6, 0, 1.0); group.add(wcab);
  const wbBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 1.6), M.wood);
  wbBody.position.y = 1.1; wcab.add(wbBody);
  const wbDoor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 1.4), M.wood);
  wbDoor.position.set(0.3, 1.0, 0); wcab.add(wbDoor);
  // 顶部摆酒杯
  const glass = new THREE.Group();
  const gBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.14, 12), M.glass);
  gBowl.position.y = 0.13; glass.add(gBowl);
  const gStem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8), M.glass);
  gStem.position.y = 0.05; glass.add(gStem);
  const gFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.005, 12), M.glass);
  gFoot.position.y = 0.005; glass.add(gFoot);
  glass.position.set(0.0, 2.2, 0.4); wcab.add(glass);
  pickables.push(pickable({ id:'r3_glass', mesh:glass, label:'酒杯', onClick: onClickGlass }));

  // 一瓶威士忌（装饰）
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.32, 12),
    new THREE.MeshStandardMaterial({ color:0x553a14, transparent:true, opacity:0.85 }));
  bottle.position.set(0.0, 2.36, 0.0); wcab.add(bottle);

  // ========= 墙上灯塔油画 (右墙后藏保险箱) =========
  const painting = new THREE.Group();
  const pBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 0.05), M.photoFrame);
  painting.add(pBack);
  const pPic = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.92),
    new THREE.MeshBasicMaterial({ map: makePaintingTex(), toneMapped:false }));
  pPic.position.z = 0.03; painting.add(pPic);
  // 挂在门右手边的前段实墙，靠近门 (z=3 中段)
  painting.position.set(W/2 - 0.1, 2.6, 3.0); painting.rotation.y = -Math.PI/2;
  group.add(painting);
  pickables.push(pickable({ id:'r3_painting', mesh:painting, label:'灯塔油画', onClick: onClickPainting }));

  // 保险箱（在油画后面）
  const safe = new THREE.Group();
  const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.9),
    new THREE.MeshStandardMaterial({ color:0x222428, metalness:0.7, roughness:0.4 }));
  safe.add(sBody);
  const sDial = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16),
    new THREE.MeshStandardMaterial({ color:0xc0c0c0, metalness:0.8 }));
  sDial.rotation.z = Math.PI/2; sDial.position.set(-0.06, 0, 0); safe.add(sDial);
  const sHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.05),
    new THREE.MeshStandardMaterial({ color:0xb0b0b0, metalness:0.8 }));
  sHandle.position.set(-0.06, -0.25, 0.2); safe.add(sHandle);
  safe.position.set(W/2 - 0.1, 2.6, 3.0); safe.rotation.y = -Math.PI/2;
  safe.visible = false; group.add(safe);
  pickables.push(pickable({ id:'r3_safe', mesh:safe, label:'墙内保险箱', onClick: onClickSafe }));

  // 保险箱内 USB + 便条（默认隐藏）
  const safeUsb = new THREE.Group();
  const suB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.22), M.usbCap);
  const suH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.13), M.usbMet);
  suH.position.z = 0.16; safeUsb.add(suB); safeUsb.add(suH);
  safeUsb.position.set(W/2 - 0.25, 2.55, 3.05); safeUsb.visible = false; group.add(safeUsb);
  pickables.push(pickable({ id:'r3_safe_usb', mesh:safeUsb, label:'OBELISK USB', onClick: () => {
    if (!F.safeOpen || F.usbTaken) return;
    SFX.pickup();
    F.usbTaken = true;
    safeUsb.visible = false;
    engine.inventory.add('r3_obelisk_usb', 'OBELISK USB (加密)');
    engine.showHint('OBELISK USB 到手。');
    advance();
  }}));

  const safeNote = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.005, 0.18),
    new THREE.MeshStandardMaterial({ color:0xfaf2c0 }));
  safeNote.position.set(W/2 - 0.25, 2.55, 3.2); safeNote.visible = false; group.add(safeNote);
  pickables.push(pickable({ id:'r3_safe_note', mesh:safeNote, label:'保险箱里的便条', onClick: () => {
    if (!F.safeOpen) return;
    SFX.paperRustle();
    F.codeRead = true;
    openViewer(`
      <div class="sticky">
        <div class="h">// note</div>
        OBELISK 提取到 8F · 机要室。<br>
        门禁码 (写完撕掉)：<br>
        <span style="font-size:36px; color:#aa1e1e; letter-spacing:6px;">3371</span><br>
        — M.
      </div>`);
    engine.showHint('8F 机要室门禁码：3371。');
    advance();
  }}));

  // ========= 出口门 (右墙) =========
  const door = new THREE.Group();
  const dPanel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 3),
    new THREE.MeshStandardMaterial({ color:0x4a3826, roughness:0.7 }));
  dPanel.position.set(0, 2, -1.5); door.add(dPanel);
  const dHandle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.25),
    new THREE.MeshStandardMaterial({ color:0xc8aa66, metalness:0.6 }));
  dHandle.position.set(-0.12, 2, -2.6); door.add(dHandle);
  door.position.set(W/2, 0, 1.5); group.add(door);
  pickables.push(pickable({ id:'r3_door', mesh:door, label:'上 8F · 顶层机要室', onClick: onClickExit }));
  const doorAabb = aabb(W/2 - 0.05, -1.5, W/2 + 0.05, 1.5, { mesh: door });
  walls.push(doorAabb);

  // 返回 6F 监控室 —— 楼梯下行入口（右墙后段）
  const backToR2 = new THREE.Group();
  const bdSign = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 1.2),
    new THREE.MeshStandardMaterial({ color:0x182810, emissive:0x1a3018, emissiveIntensity:0.6 }));
  backToR2.add(bdSign);
  const bdGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.5),
    new THREE.MeshBasicMaterial({ color:0x9effb7 }));
  bdGlow.position.x = -0.03; bdGlow.rotation.y = -Math.PI/2;
  backToR2.add(bdGlow);
  backToR2.position.set(W/2 - 0.15, 2.4, -2.5);
  group.add(backToR2);
  pickables.push(pickable({ id:'r3_back', mesh:backToR2, label:'下 6F · 监控室',
    onClick: () => engine.goto(1)
  }));

  // 门禁键盘 —— 作为门的子物体，跟门一起转动；嵌在门内侧（智能锁式）
  const keyPad3 = new THREE.Group();
  const kpBg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.08),
    new THREE.MeshStandardMaterial({ color:0x222831 }));
  keyPad3.add(kpBg);
  for (let r=0;r<4;r++) for (let c=0;c<3;c++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.02),
      new THREE.MeshStandardMaterial({ color:0x11161c }));
    b.position.set(-0.2 + c*0.2, 0.05 - r*0.14, 0.045); keyPad3.add(b);
  }
  // 装在门内侧把手附近（玩家面门时左手边、胸口高度）
  keyPad3.rotation.y = -Math.PI/2;
  keyPad3.position.set(-0.06, 1.5, -2.2);
  door.add(keyPad3);    // ← 子物体，跟着门动
  pickables.push(pickable({ id:'r3_doorpad', mesh:keyPad3, label:'门禁键盘', onClick: onClickExit }));

  // ========= 灯光 =========
  group.add(new THREE.AmbientLight(0xfff0d0, 0.55));
  const deskLight = new THREE.PointLight(0xffd28a, 1.4, 12, 1.6);
  deskLight.position.set(-1, 4, -2); group.add(deskLight);
  const ambient2 = new THREE.PointLight(0xffe0b0, 0.6, 14, 1.6);
  ambient2.position.set(2, 4, 2); group.add(ambient2);

  // ========= 装饰：书架 (后墙，给右墙让出返回门位置) =========
  const bookShelf = new THREE.Group();
  bookShelf.position.set(2.5, 0, -4.3);
  bookShelf.rotation.y = Math.PI / 2;
  group.add(bookShelf);
  const shelfBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 1.4), M.wood);
  shelfBox.position.y = 1.6; bookShelf.add(shelfBox);
  for (let row=0; row<3; row++) for (let i=0; i<7; i++) {
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x553a14 + (i*0x111111 % 0xffffff) }));
    book.position.set(0, 1.0 + row*0.7, -0.5 + i*0.18); bookShelf.add(book);
  }

  // ========= 交互逻辑 =========
  function onClickDeskDrawer() {
    if (F.deskDrawerOpen) {
      if (F.dustTaken) engine.showHint('抽屉空了。');
      else engine.showHint('抽屉里还有粉末套装。');
      return;
    }
    F.deskDrawerOpen = true;
    SFX.drawerSlide();
    dustKit.visible = true;
    // 抽屉整体向 -z 拉出 0.45（向椅子那一侧）
    const startZ = deskDrawer.position.z;
    const targetZ = startZ - 0.45;
    let t = 0;
    const iv = setInterval(() => {
      t += 0.06;
      deskDrawer.position.z = startZ + (targetZ - startZ) * Math.min(1, t);
      if (t >= 1) clearInterval(iv);
    }, 16);
    pickables.find(p => p.id === 'r3_desk_drawer').label = '抽屉 (已开)';
    engine.showHint('抽屉里：指纹粉末套装。');
    advance();
  }

  function onClickGlass() {
    if (F.fingerprintTaken) { engine.showHint('指纹已经取走了。'); return; }
    if (!engine.inventory.has('r3_dustkit')) {
      openViewer(`
        <div style="background:#101418; color:#cfd; font-family:'Share Tech Mono',monospace; padding:20px; width:380px; border:1px solid #2c3a4a;">
          <h3 style="color:#9fffbf; letter-spacing:3px; margin-bottom:10px;">// CRYSTAL TUMBLER</h3>
          <p style="line-height:1.7;">玻璃壁上有一枚清晰的指纹。<br>
          但你没有提取工具——空手去抓只会把痕迹抹掉。</p>
        </div>`);
      return;
    }
    F.fingerprintTaken = true;
    SFX.click();
    setTimeout(() => SFX.pickup(), 150);
    engine.inventory.remove('r3_dustkit');
    engine.inventory.add('r3_fingerprint', 'Marcus 指纹模');
    pickables.find(p => p.id === 'r3_glass').label = '酒杯 (已采证)';
    engine.showHint('用粉末套装压出了一枚透明指纹模。');
    advance();
  }

  function onClickLaptop() {
    if (!F.laptopUnlocked) {
      if (!engine.inventory.has('r3_fingerprint')) {
        engine.showHint('屏幕显示 "PRESS FINGER ON SENSOR"。');
        return;
      }
      F.laptopUnlocked = true;
      SFX.keypadOk();
      setTimeout(() => SFX.switchOn(), 200);
      engine.inventory.remove('r3_fingerprint');
      laptop.userData.scrFace.material = new THREE.MeshBasicMaterial({ color:0x0a1410 });
      engine.showHint('指纹通过。屏幕展开邮件。');
    }
    F.emailRead = true;
    openViewer(makeEmailHTML());
    engine.inventory.add('r3_email', 'Marcus 邮件 [证据]');
    advance();
  }

  function onClickPainting() {
    if (F.paintingMoved) {
      // 已经搬开 → 直接当成保险箱点
      onClickSafe();
      return;
    }
    F.paintingMoved = true;
    SFX.paintingSlide();
    // 推开油画动画 — 让它向前滑出 + 偏转
    const start = painting.position.clone();
    let t = 0;
    const iv = setInterval(() => {
      t += 0.06;
      painting.position.x = start.x - t * 0.4;
      painting.position.z = start.z - t * 0.6;
      painting.rotation.y = -Math.PI/2 - t * 0.6;
      if (t >= 1.0) { clearInterval(iv); }
    }, 30);
    safe.visible = true;
    pickables.find(p => p.id === 'r3_painting').label = '油画 (已推开)';
    engine.showHint('油画后藏着一个壁挂保险箱。');
    advance();
  }

  function onClickSafe() {
    if (!F.paintingMoved) return;
    if (F.safeOpen) {
      if (!F.usbTaken) engine.showHint('保险箱里还有 USB 和便条。');
      else if (!F.codeRead) engine.showHint('保险箱里还有便条没看。');
      else engine.showHint('保险箱空了。');
      return;
    }
    openKeypad({
      title:'保险箱密码', desc:'— 4 位数字 —', length:4, answer: ANS.safeCode,
      onSuccess: () => {
        F.safeOpen = true;
        SFX.safeOpen();
        safeUsb.visible = true;
        safeNote.visible = true;
        pickables.find(p => p.id === 'r3_safe').label = '保险箱 (已开)';
        engine.showHint('保险箱开了。USB 和便条。');
        advance();
      },
    });
  }

  function onClickExit() {
    if (F.leaving) {
      engine.goto(3);    // 已经解过，直接上 8F
      return;
    }
    openKeypad({
      title:'机要室门禁', desc:'— 4 位数字 —', length:4, answer: ANS.floor8Code,
      onSuccess: () => {
        F.leaving = true;
        SFX.doorUnlock();
        setTimeout(() => SFX.doorOpen(), 250);
        doorAabb.disabled = true;
        let t = 0;
        const target = Math.PI/2 - 0.3;
        const iv = setInterval(() => {
          t += 0.04;
          door.rotation.y = -Math.min(target, t);
          if (t >= target) {
            clearInterval(iv);
            engine.showHint('上 8 楼，机要室。倒计时已经开始了。');
            setTimeout(() => engine.next(), 500);
          }
        }, 30);
      },
    });
  }

  function advance() {
    if (!F.deskDrawerOpen)    return engine.setObjective('从桌下抽屉开始翻起。');
    if (!F.dustTaken)         return engine.setObjective('拿走指纹粉末套装。');
    if (!F.fingerprintTaken)  return engine.setObjective('用粉末套装在酒杯上提取指纹。');
    if (!F.laptopUnlocked)    return engine.setObjective('用指纹解锁笔记本电脑。');
    if (!F.emailRead)         return engine.setObjective('看邮件 — Marcus 在跟谁交易？');
    if (!F.photoSeen)         return engine.setObjective('注意桌上家庭相框 — 保险箱密码可能是个日子。');
    if (!F.paintingMoved)     return engine.setObjective('找到保险箱 — 墙上的油画后面。');
    if (!F.safeOpen)          return engine.setObjective('用相框上的日期开保险箱。');
    if (!F.usbTaken || !F.codeRead) return engine.setObjective('把保险箱里的 USB 和便条都收走。');
    if (!F.leaving)           return engine.setObjective('用便条上的 4 位码解锁机要室门。');
  }

  return {
    id: 'room3',
    title: '7F · 主管办公室',
    objective: '马克思的办公室空着——咖啡还热。线索就在这屋里。',
    banner: { floor:'7F · MANAGER', name:'主管办公室', desc:'M. CHEN — 几分钟前刚离开' },
    group, pickables, walls, cullableWalls,
    spawnPos: new THREE.Vector3(4.5, 1.65, 2.0),  // 门口
    spawnYaw: Math.PI / 2,                        // 朝向 -x（房间内部）
    spawnPitch: 0,
    init() { startAmbient('office'); },
    cleanup() {},
    onTick() {},
  };
}
