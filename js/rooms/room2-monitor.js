/* global THREE */
// 房间 2: 监控室 (6F)
import { engine } from '../engine.js';
import { M } from '../materials.js';
import { aabb, aabbFromMesh } from '../collision.js';
import { pickable } from '../interact.js';
import { makeCCTVTex, makeConsoleTex, makeMonitorWBTex } from '../tex.js';
import { openViewer } from '../ui/viewer.js';
import { openKeypad } from '../ui/keypad.js';
import { openTerminal } from '../ui/terminal.js';
import { SFX, startAmbient } from '../sound.js';

export default function build() {
  const group = new THREE.Group();
  const pickables = [];
  const walls = [];
  const cullableWalls = [];

  const ANS = {
    drawerCode: '4283',
    floor7Pw  : 'M0427',
  };

  const F = {
    coatChecked:false, drawerOpen:false, cardTaken:false, flashTaken:false,
    flashOn:false, consoleOn:false, wbRead:false, tapeFound:false, tapePlayed:false,
    floor7Unlocked:false, leaving:false,
  };

  // ========= 房间外壳（10×6×8 略小，紧凑感）=========
  const W = 10, D = 8, H = 5;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D),
    new THREE.MeshStandardMaterial({ color:0x121417, roughness:0.85 }));
  floor.position.y = -0.1; group.add(floor);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), M.ceil);
  ceil.position.y = H; group.add(ceil);
  cullableWalls.push({ mesh: ceil, aabb: { min:{x:-W/2,y:H,z:-D/2}, max:{x:W/2,y:H,z:D/2} }, normal:'-y' });

  function wall(w, h, d, x, y, z, normal) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.wall);
    m.position.set(x, y, z); group.add(m);
    walls.push(aabb(x - w/2, z - d/2, x + w/2, z + d/2, { mesh: m }));
    cullableWalls.push({
      mesh: m,
      aabb: { min:{x:x-w/2,y:y-h/2,z:z-d/2}, max:{x:x+w/2,y:y+h/2,z:z+d/2} },
      normal,
    });
    return m;
  }
  // 后墙 (摄像头墙) z=-D/2
  wall(W, H, 0.2, 0, H/2, -D/2, '+z');
  // 前墙
  wall(W, H, 0.2, 0, H/2,  D/2, '-z');
  // 左墙
  wall(0.2, H, D, -W/2, H/2, 0, '+x');
  // 右墙：分两段，留出走廊门
  wall(0.2, H, 2.5, W/2, H/2, -2.75, '-x');
  wall(0.2, H, 2.5, W/2, H/2,  2.75, '-x');
  wall(0.2, 1.8, 3,  W/2, H - 0.9, 0, '-x');  // 门楣

  // ========= 摄像头墙（4×3 网格 CCTV 显示器）=========
  const camNames = ['CAM-01','CAM-02','CAM-03','CAM-04','CAM-05','CAM-06','CAM-07','CAM-08','CAM-09','CAM-10','CAM-11','CAM-12'];
  for (let r=0; r<3; r++) for (let c=0; c<4; c++) {
    const idx = r*4 + c;
    const x = -3 + c * 2;
    const y = 3.6 - r * 1.0;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.95, 0.06), M.black);
    back.position.set(x, y, -D/2 + 0.05); group.add(back);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.85),
      new THREE.MeshBasicMaterial({ map: makeCCTVTex(camNames[idx]), toneMapped:false }));
    scr.position.set(x, y, -D/2 + 0.09); group.add(scr);
  }

  // ========= 主控台（在房间中央，朝摄像头墙）=========
  const console1 = new THREE.Group();
  console1.position.set(0, 0, 0);
  group.add(console1);
  // 桌体（梯形）
  const ckTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.4), M.metalDark);
  ckTop.position.y = 1.0; console1.add(ckTop);
  const ckSide = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.0, 0.6), M.metalDark);
  ckSide.position.set(0, 0.5, 0.4); console1.add(ckSide);
  // 主屏（朝向摄像头墙）
  const consoleScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2),
    new THREE.MeshBasicMaterial({ map: makeConsoleTex('locked'), toneMapped:false }));
  consoleScreen.position.set(0, 1.85, -0.35);
  consoleScreen.rotation.x = -0.15;
  console1.add(consoleScreen);
  const consoleScreenBack = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.3, 0.08), M.black);
  consoleScreenBack.position.set(0, 1.85, -0.42);
  consoleScreenBack.rotation.x = -0.15;
  console1.add(consoleScreenBack);
  // 卡槽 (key card slot)
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.02),
    new THREE.MeshStandardMaterial({ color:0xffaa30, emissive:0x442200 }));
  slot.position.set(0, 1.06, 0.55); console1.add(slot);
  // VCR 卡槽（更大，磁带）
  const vcr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.04),
    new THREE.MeshStandardMaterial({ color:0x111418 }));
  vcr.position.set(-1.0, 1.06, 0.55); console1.add(vcr);
  pickables.push(pickable({ id:'r2_console', mesh:console1, label:'监控主控台', onClick: onClickConsole }));

  // 抽屉 (在主控台下方左侧) —— 建模为一个"敞开的盒子"，物品作为子物体
  // 抽屉尺寸: 宽 1.0 · 高 0.35 · 纵深 0.7
  const drawer = new THREE.Group();
  drawer.position.set(1.4, 0.55, 0.4);   // group 原点 = 抽屉中心高度
  group.add(drawer);
  const DR_W = 1.0, DR_H = 0.35, DR_D = 0.7, DR_T = 0.04; // 板厚
  // 底板
  const drBottom = new THREE.Mesh(new THREE.BoxGeometry(DR_W, DR_T, DR_D), M.metalDark);
  drBottom.position.y = -DR_H/2; drawer.add(drBottom);
  // 后板（朝 -z，朝向主控台）
  const drBack = new THREE.Mesh(new THREE.BoxGeometry(DR_W, DR_H, DR_T), M.metalDark);
  drBack.position.set(0, 0, -DR_D/2 + DR_T/2); drawer.add(drBack);
  // 左右侧板
  const drLeft = new THREE.Mesh(new THREE.BoxGeometry(DR_T, DR_H, DR_D), M.metalDark);
  drLeft.position.set(-DR_W/2 + DR_T/2, 0, 0); drawer.add(drLeft);
  const drRight = new THREE.Mesh(new THREE.BoxGeometry(DR_T, DR_H, DR_D), M.metalDark);
  drRight.position.set(DR_W/2 - DR_T/2, 0, 0); drawer.add(drRight);
  // 前面板（朝 +z，玩家看到的"门面"）
  const drFront = new THREE.Mesh(new THREE.BoxGeometry(DR_W, DR_H + 0.1, DR_T),
    new THREE.MeshStandardMaterial({ color:0x3a4250, metalness:0.5, roughness:0.5 }));
  drFront.position.set(0, 0, DR_D/2 - DR_T/2); drawer.add(drFront);
  // 把手
  const drHandle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.06),
    new THREE.MeshStandardMaterial({ color:0xc0c0c0, metalness:0.7 }));
  drHandle.position.set(0, 0, DR_D/2); drawer.add(drHandle);
  // 锁 (黄色)
  const drLock = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12),
    new THREE.MeshStandardMaterial({ color:0xffd050, metalness:0.7 }));
  drLock.rotation.x = Math.PI/2;
  drLock.position.set(0, 0.1, DR_D/2 + 0.01); drawer.add(drLock);
  pickables.push(pickable({ id:'r2_drawer', mesh:drawer, label:'抽屉 (上锁)', onClick: onClickDrawer }));

  // 抽屉里的物品 —— 作为 drawer 子物体，跟随抽屉一起被拉出
  // 门禁卡 (放大一些，更易看清)
  const keyCard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, 0.5),
    new THREE.MeshStandardMaterial({ color:0x33cc77, emissive:0x004422, emissiveIntensity:0.6 }));
  keyCard.position.set(-0.2, -DR_H/2 + 0.02, 0);   // 抽屉底部偏左
  keyCard.visible = false;
  drawer.add(keyCard);
  pickables.push(pickable({ id:'r2_keycard', mesh:keyCard, label:'门禁卡', onClick: () => {
    if (!F.drawerOpen) return;
    if (F.cardTaken) { engine.showHint('门禁卡已经在你身上。'); return; }
    SFX.pickup();
    F.cardTaken = true;
    keyCard.visible = false;
    engine.inventory.add('r2_keycard', '监控室门禁卡');
    engine.showHint('拿到门禁卡。');
    advance();
  }}));

  // 手电筒 (放大，横放)
  const flashlight = new THREE.Group();
  const flBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.42, 16), M.metal);
  flBody.rotation.z = Math.PI/2; flashlight.add(flBody);
  const flHead = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.1, 16), M.metalDark);
  flHead.rotation.z = Math.PI/2; flHead.position.x = 0.25; flashlight.add(flHead);
  flashlight.position.set(0.22, -DR_H/2 + 0.07, 0);    // 抽屉底部偏右
  flashlight.visible = false;
  drawer.add(flashlight);
  pickables.push(pickable({ id:'r2_flashlight', mesh:flashlight, label:'手电筒', onClick: () => {
    if (!F.drawerOpen) return;
    if (F.flashTaken) { engine.showHint('手电筒已经在你身上。'); return; }
    SFX.pickup();
    F.flashTaken = true;
    flashlight.visible = false;
    engine.inventory.add('r2_flashlight', '手电筒');
    // 取到手电筒，磁带架不再"暗"
    const shelfPick = pickables.find(p => p.id === 'r2_shelf');
    if (shelfPick) shelfPick.label = '磁带架';
    engine.showHint('拿到手电筒。再回磁带架就能看清标签了。');
    advance();
  }}));

  // ========= 衣帽架 + 外套 =========
  const rack = new THREE.Group(); rack.position.set(-W/2 + 1.0, 0, D/2 - 1.2); group.add(rack);
  const rackPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.0, 8), M.metalDark);
  rackPole.position.y = 1.0; rack.add(rackPole);
  const rackBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.05, 12), M.metalDark);
  rackBase.position.y = 0.025; rack.add(rackBase);
  const rackArms = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), M.metalDark);
  rackArms.position.y = 2.0; rack.add(rackArms);
  // 外套 (袖子和主体之间留出明显缝隙，并向外撇 ~20°)
  const coat = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color:0x222a36, roughness:0.9 });
  // 主体：肩 + 上身 (做窄一点，宽度 0.5)
  const coatTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.2), coatMat);
  coatTop.position.y = 1.78; coat.add(coatTop);
  const coatBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.95, 0.16), coatMat);
  coatBody.position.y = 1.18; coat.add(coatBody);

  // 袖子：以肩部 pivot 旋转，gap = 0.10，外撇 = 22°
  const sleeveGeo = new THREE.BoxGeometry(0.15, 0.95, 0.15);
  function makeSleeve(side) {
    const arm = new THREE.Group();
    const sleeve = new THREE.Mesh(sleeveGeo, coatMat);
    sleeve.position.y = -0.475;
    arm.add(sleeve);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.17),
      new THREE.MeshStandardMaterial({ color:0x1a2128, roughness:0.85 }));
    cuff.position.y = -0.95;
    arm.add(cuff);
    const sign = side === 'L' ? -1 : 1;
    arm.position.set(sign * 0.40, 1.62, 0);    // 0.25 主体半宽 + 0.075 袖子半宽 + 0.075 缝隙 = 0.40
    arm.rotation.z = sign * 0.38;              // 外撇 ~22°
    return arm;
  }
  coat.add(makeSleeve('L'));
  coat.add(makeSleeve('R'));
  rack.add(coat);
  pickables.push(pickable({ id:'r2_coat', mesh:coat, label:'外套 (翻口袋)', onClick: () => {
    if (F.coatChecked) { engine.showHint('外套口袋已经空了。'); return; }
    SFX.paperRustle();
    F.coatChecked = true;
    engine.inventory.add('r2_ticket', '干洗票 (#4283)');
    openViewer(`
      <div class="ticket">
        <div class="shop">LUCKY WASH 干洗</div>
        <div class="row"><span>客户</span><span>L. FOREMAN</span></div>
        <div class="row"><span>取件凭证</span><span>3 月 12 日</span></div>
        <div class="num">4283</div>
        <div class="row" style="font-size:13px; color:#666;"><span>请保留此票</span><span>遗失不补</span></div>
      </div>
    `);
    engine.showHint('一张干洗票，单号 4283。');
    advance();
  }}));

  // ========= 白板（侧墙）=========
  const wb = new THREE.Group();
  const wbBg = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 0.05),
    new THREE.MeshStandardMaterial({ color:0xf4f4f0 }));
  wb.add(wbBg);
  const wbPic = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.4),
    new THREE.MeshBasicMaterial({ map: makeMonitorWBTex(), toneMapped:false }));
  wbPic.position.z = 0.03; wb.add(wbPic);
  // 挂在左墙中段（避开衣帽架和磁带架，也不挡门）
  // 左墙内壁在 x=-W/2+0.1=-4.9；白板背板厚 0.05、贴片再前 0.03，所以放到 -4.86 让正面朝房间内
  wb.position.set(-W/2 + 0.14, 2.5, 0.4); wb.rotation.y = Math.PI/2;
  group.add(wb);
  pickables.push(pickable({ id:'r2_wb', mesh:wb, label:'白板 (备份流程)', onClick: () => {
    F.wbRead = true;
    openViewer(`
      <div style="background:#f4f4f0; color:#111; padding:20px; width:560px;
        box-shadow:4px 6px 0 rgba(0,0,0,0.5); border:3px solid #aa1e1e; font-family:'VT323',monospace;">
        <h3 style="color:#aa1e1e; font-size:24px; margin-bottom:10px;">// BACKUP PROCEDURES</h3>
        <ul style="line-height:1.8; font-size:18px; color:#222;">
          <li>磁带备份每晚 02:00 自动归档（覆盖一周前同序磁带）</li>
          <li>命名：PT-####（顺序递增）</li>
          <li>昨日：PT-0427 · 今晚：PT-0428（待归档）</li>
          <li>归档后磁带库自动锁定 6 小时 — 期间 <b>无法再读取被覆盖内容</b></li>
        </ul>
        <p style="color:#1a78d6; margin-top:10px;">磁带丢了？仔细看磁带架，正常情况它是按顺序排的。</p>
        <p style="color:#aa1e1e; margin-top:10px;">备注 (3/8)：连续两周看见 7F 的 M.C 半夜上来翻磁带，已上报 9F——
        <b>无回复</b>。下不为例的话出事我不背锅。</p>
        <p style="color:#666; font-size:14px; margin-top:10px;">— L. Foreman, 夜班 Sec Op</p>
      </div>`);
    advance();
  }}));

  // ========= 磁带架（暗处，需手电）=========
  const shelf = new THREE.Group();
  shelf.position.set(-W/2 + 0.7, 0, -D/2 + 1.5); group.add(shelf);
  const shelfBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 1.6), M.metalDark);
  shelfBox.position.y = 1.2; shelf.add(shelfBox);
  // 8 盘磁带 PT-0420 ~ PT-0427 + 1 盘 MISC（错位插在 PT-0421 后）
  const tapeOrder = ['PT-0420','PT-0421','MISC','PT-0422','PT-0423','PT-0424','PT-0425','PT-0426','PT-0427'];
  const tapeRow1 = tapeOrder.slice(0, 5);
  const tapeRow2 = tapeOrder.slice(5);
  function buildTape(label, x, y) {
    const t = new THREE.Group();
    const c = label === 'MISC' ? 0x2a2a2a : 0x444a55;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.4),
      new THREE.MeshStandardMaterial({ color:c, roughness:0.8 }));
    t.add(body);
    // 打个标签贴片
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05),
      new THREE.MeshStandardMaterial({ color: label === 'MISC' ? 0xaa3030 : 0xfff8a0 }));
    tag.position.set(0, 0, 0.21); t.add(tag);
    t.position.set(x, y, 0); t.userData.label = label;
    return t;
  }
  // 上层
  let row1 = new THREE.Group();
  tapeRow1.forEach((lbl, i) => row1.add(buildTape(lbl, 0.05, 1.7, 0).translateZ(-0.3 + i*0.18)));
  // 下层
  let row2 = new THREE.Group();
  tapeRow2.forEach((lbl, i) => row2.add(buildTape(lbl, 0.05, 1.0, 0).translateZ(-0.3 + i*0.18)));
  // 简化用上面方式时位置不对，重写：
  shelf.remove(row1); shelf.remove(row2);
  for (let i=0; i<tapeRow1.length; i++) {
    const t = buildTape(tapeRow1[i], 0.0, 1.7);
    t.position.set(0.0, 1.7, -0.6 + i*0.18); shelf.add(t);
  }
  for (let i=0; i<tapeRow2.length; i++) {
    const t = buildTape(tapeRow2[i], 0.0, 1.0);
    t.position.set(0.0, 1.0, -0.6 + i*0.18); shelf.add(t);
  }
  // 整个架子作为单一交互目标
  pickables.push(pickable({ id:'r2_shelf', mesh:shelf, label:'磁带架 (光线很暗)', onClick: onClickShelf }));

  // ========= 灯光：默认昏暗，磁带架更暗 =========
  const ambient = new THREE.AmbientLight(0x556677, 0.45);
  group.add(ambient);
  const ceilLight = new THREE.PointLight(0xb0d8ff, 0.85, 18, 1.5);
  ceilLight.position.set(0, H - 0.4, 0); group.add(ceilLight);
  // 摄像头墙的反光（柔光）
  const wallLight = new THREE.PointLight(0x6688aa, 0.5, 10, 2);
  wallLight.position.set(0, 2.5, -D/2 + 0.5); group.add(wallLight);

  // 磁带架附近的"暗角"用一盏负光实现（其实就是不开灯 + 阴影让它显暗）
  // 我们直接让玩家附近的"动态手电"靠近磁带架时给它额外照明：
  const flashLight = new THREE.SpotLight(0xfff0cc, 0.0, 10, Math.PI/5, 0.4, 1);
  flashLight.position.set(0, 0, 0); flashLight.target.position.set(0,0,0);
  group.add(flashLight); group.add(flashLight.target);

  // ========= 出口门 (右墙) =========
  const door = new THREE.Group();
  const dPanel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 3), M.door);
  dPanel.position.set(0, 2, -1.5); door.add(dPanel);
  const dHandle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.25),
    new THREE.MeshStandardMaterial({ color:0xb0b0b0, metalness:0.8 }));
  dHandle.position.set(-0.12, 2, -2.6); door.add(dHandle);
  door.position.set(W/2, 0, 1.5); group.add(door);
  pickables.push(pickable({ id:'r2_door', mesh:door, label:'上 7F · 主管办公室', onClick: onClickExit }));
  const doorAabb = aabb(W/2 - 0.05, -1.5, W/2 + 0.05, 1.5, { mesh: door });
  walls.push(doorAabb);

  // 返回 B3 服务器机房 —— 楼梯下行入口（右墙后段）
  const backToR1 = new THREE.Group();
  const bdSign2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 1.2),
    new THREE.MeshStandardMaterial({ color:0x182810, emissive:0x1a3018, emissiveIntensity:0.6 }));
  backToR1.add(bdSign2);
  const bdGlow2 = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.5),
    new THREE.MeshBasicMaterial({ color:0x9effb7 }));
  bdGlow2.position.x = -0.03; bdGlow2.rotation.y = -Math.PI/2;
  backToR1.add(bdGlow2);
  backToR1.position.set(W/2 - 0.15, 2.4, -3);
  group.add(backToR1);
  pickables.push(pickable({ id:'r2_back', mesh:backToR1, label:'下 B3 · 服务器机房',
    onClick: () => engine.goto(0)
  }));

  // === 家具碰撞（能挡能站）===
  group.updateMatrixWorld(true);
  walls.push(aabbFromMesh(console1, 0.02));    // 主控台 (顶 ~1.1m，可跳上)
  walls.push(aabbFromMesh(drawer, 0.02));      // 抽屉
  walls.push(aabbFromMesh(rack, 0.02));        // 衣帽架（细，半挡）
  walls.push(aabbFromMesh(shelf, 0.02));       // 磁带架（高，跳不上）
  walls.push(aabbFromMesh(wb, 0.02));          // 白板

  // ========= 交互 =========
  function onClickDrawer() {
    if (F.drawerOpen) {
      if (!F.cardTaken || !F.flashTaken) engine.showHint('抽屉里还有东西。');
      else engine.showHint('抽屉空了。');
      return;
    }
    openKeypad({
      title:'抽屉密码', desc:'— 4 位数字 —', length:4, answer: ANS.drawerCode,
      onSuccess: () => {
        F.drawerOpen = true;
        SFX.doorUnlock();
        SFX.drawerSlide();
        keyCard.visible = true;
        flashlight.visible = true;
        pickables.find(p => p.id === 'r2_drawer').label = '抽屉 (已开)';
        engine.showHint('抽屉打开了：门禁卡 + 手电筒。');
        advance();
        // 抽屉整体向前 (+z) 滑出 0.55，把内容露到玩家视线里
        const startZ = drawer.position.z;
        const targetZ = startZ + 0.55;
        let t = 0;
        const iv = setInterval(() => {
          t += 0.06;
          drawer.position.z = startZ + (targetZ - startZ) * Math.min(1, t);
          if (t >= 1) clearInterval(iv);
        }, 16);
      },
    });
  }

  function onClickConsole() {
    if (!F.consoleOn) {
      if (!engine.inventory.has('r2_keycard')) {
        engine.showHint('需要门禁卡才能启动主控台。');
        return;
      }
      F.consoleOn = true;
      SFX.cardSwipe();
      setTimeout(() => SFX.switchOn(), 280);
      engine.inventory.remove('r2_keycard');
      consoleScreen.material.map = makeConsoleTex('online');
      consoleScreen.material.needsUpdate = true;
      engine.showHint('门禁卡刷过了。监控系统启动。');
      advance();
      return;
    }
    if (!F.tapePlayed) {
      // 检查 VCR 槽里是否有磁带 → 用库存检查
      if (!engine.inventory.has('r2_tape_misc')) {
        // 没磁带就只能进终端
        openMonitorTerminal();
        return;
      }
      // 自动播放视频
      SFX.videoStart();
      engine.inventory.remove('r2_tape_misc');
      F.tapePlayed = true;
      engine.inventory.add('r2_video', '监控录像 [证据]');
      openViewer(`
        <div class="vcr">
          <div class="scr">
            <div class="ts">▶ 01:38:02 · CAM-07 / SERVER-AISLE</div><br>
            一个戴黑框眼镜的中年男人 — 工牌反光显示：<b>M. CHEN · M-0427</b><br>
            ······他走到 7 号机柜前，从口袋掏出一张工卡，<br>
            把后排电源刀闸朝下一推。屋里灯一暗，机柜风扇全停。<br><br>
            他扭头朝楼上电梯走去。01:42 监控被这个 ROOT 账户删除。<br>
            <div class="info">EVIDENCE TAGGED · saved to console</div>
          </div>
        </div>`);
      engine.showHint('内鬼是 Marcus Chen，员工号 M-0427。');
      advance();
      return;
    }
    // 已经看过视频，直接打开终端
    openMonitorTerminal();
  }

  function openMonitorTerminal() {
    openTerminal({
      promptHead: 'sec-op@meridian-cctv:~#',
      init: [
        'Meridian Security Console v3.2',
        'WARNING · 01:42 录像被 ROOT 账户 删除',
        '可用命令: help, status, unlock <floor7>, audit, clear, exit',
      ],
      commands: {
        help: (_, t) => {
          t.print('help, status, audit, clear, exit');
          t.print('unlock floor7 <主管员工号>      (格式: 字母-4位数字, 如 J-1234)');
        },
        status: (_, t) => {
          t.print('CONSOLE: ONLINE');
          t.print('FLOOR 7 LOCK: ' + (F.floor7Unlocked ? 'OPEN' : 'LOCKED'));
          t.print('DELETED REC: 01:00 — 01:42 (by ROOT)');
        },
        audit: (_, t) => {
          if (!F.tapePlayed) { t.print('audit: 没有可分析的录像。'); return; }
          t.print('从 MISC 磁带提取关键帧 ...');
          t.print('  · 01:38:02  M. CHEN (M-0427) · CAM-07 servers aisle');
          t.print('  · 01:41:55  M. CHEN logged into ROOT shell');
          t.print('  · 01:42:08  REC log delete command issued');
          t.print('结论：内鬼为 7F 主管 Marcus Chen。');
        },
        unlock: (a, t) => {
          if (a[0] !== 'floor7') return t.print('用法: unlock floor7 <主管员工号>  (格式: 字母-4位数字, 如 J-1234)');
          if (!F.tapePlayed) return t.print('unlock: 没有内鬼证据，拒绝越权。');
          // 输入容错：去掉横杠/空格后再比较 (M-0427 / M0427 / m-0427 都能用)
          const id = (a[1] || '').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
          if (!id) {
            t.print('生物锁解锁需要主管员工号。');
            t.print('用法: unlock floor7 <主管员工号>  (格式: 字母-4位数字, 如 J-1234)');
            return;
          }
          if (id === ANS.floor7Pw) {
            t.print('[ACCESS GRANTED] 7 楼楼梯门已解锁。');
            F.floor7Unlocked = true;
            doorAabb.disabled = true;
            pickables.find(p => p.id === 'r2_door').label = '通往 7F (已解锁)';
            engine.showHint('7F 楼梯门解锁。穿过去。');
            advance();
          } else {
            t.print('员工号错误。');
          }
        },
        clear: (_, t) => t.clear(),
        exit:  (_, t) => t.close(),
      },
    });
  }

  function onClickShelf() {
    if (!engine.inventory.has('r2_flashlight')) {
      engine.showHint('磁带架太暗了，看不清标签。');
      return;
    }
    // 打开手电筒（视觉上 + 找磁带）
    if (!F.flashOn) {
      F.flashOn = true;
      flashLight.intensity = 1.6;
      flashLight.position.copy(shelf.position).add(new THREE.Vector3(1.5, 1.4, 0));
      flashLight.target.position.copy(shelf.position).add(new THREE.Vector3(0, 1.3, 0));
    }
    if (F.tapeFound) { engine.showHint('磁带已经拿走了。'); return; }
    SFX.pickup();
    F.tapeFound = true;
    engine.inventory.add('r2_tape_misc', '错位的 MISC 磁带');
    engine.showHint('在 PT-0421 后面摸到一盘错位的"MISC"磁带。');
    advance();
  }

  function onClickExit() {
    if (!F.floor7Unlocked) {
      engine.showHint('门是电子锁——需要从主控台解锁 7 楼。');
      return;
    }
    if (F.leaving) {
      engine.goto(2);    // 已经解锁过，直接上楼
      return;
    }
    F.leaving = true;
    SFX.doorUnlock();
    setTimeout(() => SFX.doorOpen(), 250);
    let t = 0;
    const target = Math.PI/2 - 0.3;
    const iv = setInterval(() => {
      t += 0.04;
      door.rotation.y = -Math.min(target, t);
      if (t >= target) {
        clearInterval(iv);
        engine.showHint('上楼到 7F 主管办公室。');
        setTimeout(() => engine.next(), 500);
      }
    }, 30);
  }

  function advance() {
    if (!F.coatChecked)    return engine.setObjective('整个屋子里找线索 — 衣帽架的外套？');
    if (!F.drawerOpen)     return engine.setObjective('用干洗票上的号码打开抽屉。');
    if (!F.cardTaken || !F.flashTaken) return engine.setObjective('从抽屉里把门禁卡和手电筒都拿走。');
    if (!F.consoleOn)      return engine.setObjective('刷门禁卡启动主控台。');
    if (!F.wbRead)         return engine.setObjective('白板写了今晚的备份磁带流程。');
    if (!F.tapeFound)      return engine.setObjective('用手电筒搜磁带架，找出错位的磁带。');
    if (!F.tapePlayed)     return engine.setObjective('把那盘 MISC 磁带塞进主控台 VCR。');
    if (!F.floor7Unlocked) return engine.setObjective('回主控台终端 — 用 unlock + 内鬼员工号。');
    if (!F.leaving)        return engine.setObjective('上楼，到 7F 主管办公室。');
  }

  return {
    id: 'room2',
    title: '6F · 监控室',
    objective: '今晚 01:00–02:00 录像被删除。在这房间里把它捞回来。',
    banner: { floor:'6F · OPS / SECURITY', name:'监控室', desc:'录像于 01:42 被 ROOT 账户手动删除' },
    group, pickables, walls, cullableWalls,
    spawnPos: new THREE.Vector3(3.5, 1.65, 2.0),  // 从右侧门进来
    spawnYaw: Math.PI / 2,                        // 朝向 -x（房间内部）
    spawnPitch: 0,
    init() { startAmbient('monitor'); },
    cleanup() {},
    onTick() {},
  };
}
