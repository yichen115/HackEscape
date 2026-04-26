/* global THREE */
// 房间 4: 顶层机要室 (8F) — 高潮 · 倒计时
import { engine } from '../engine.js';
import { M } from '../materials.js';
import { aabb } from '../collision.js';
import { pickable } from '../interact.js';
import { makePosterTex } from '../tex.js';
import { openViewer } from '../ui/viewer.js';
import { openTerminal } from '../ui/terminal.js';
import { openModal } from '../ui/modal.js';
import { startCountdown, freezeCountdown, hideCountdown } from '../ui/countdown.js';
import { SFX, startAmbient, stopAllAmbient } from '../sound.js';

export default function build() {
  const group = new THREE.Group();
  const pickables = [];
  const walls = [];
  const cullableWalls = [];

  const F = {
    usbInserted:false, posterRead:false,
    transferKilled:false, auditDone:false, evidenceSubmitted:false,
    timeOut:false,
  };

  // ========= 玻璃机要室外壳 (蓝光) =========
  const W = 12, D = 9, H = 5.5;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D),
    new THREE.MeshStandardMaterial({ color:0x0e1218, roughness:0.5, metalness:0.3 }));
  floor.position.y = -0.1; group.add(floor);
  // 地面亮线
  for (let i=-2; i<=2; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(W*0.9, 0.01, 0.04),
      new THREE.MeshBasicMaterial({ color:0x4488ff }));
    line.position.set(0, 0.01, i*1.6); group.add(line);
  }
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), M.ceil);
  ceil.position.y = H; group.add(ceil);
  cullableWalls.push({ mesh: ceil, aabb: { min:{x:-W/2,y:H,z:-D/2}, max:{x:W/2,y:H,z:D/2} }, normal:'-y' });

  function wall(w, h, d, x, y, z, normal, color=0x1c2030) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness:0.4, metalness:0.4 }));
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
  wall(0.2, H, 2.5, W/2, H/2, -3.25, '-x');
  wall(0.2, H, 2.5, W/2, H/2,  3.25, '-x');
  wall(0.2, 1.8, 4,  W/2, H - 0.9, 0, '-x');

  // ========= 中央升起的工作站平台 =========
  const podium = new THREE.Group(); podium.position.set(0, 0, 0); group.add(podium);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.3, 24), M.metalDark);
  ring.position.y = 0.15; podium.add(ring);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.06, 24),
    new THREE.MeshStandardMaterial({ color:0x223344, roughness:0.6, metalness:0.3 }));
  top.position.y = 0.32; podium.add(top);

  // 中央终端
  const ws = new THREE.Group();
  const wsBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.7), M.metalDark);
  wsBody.position.y = 0.85; ws.add(wsBody);
  const wsScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8),
    new THREE.MeshBasicMaterial({ color:0x000000 }));
  // z=0.45 (主机前面 0.35 + 浮空 0.1)，rotation -0.15 让后仰幅度变小
  // 这样屏幕上半部不会因为后仰而插进主机箱体里
  wsScreen.position.set(0, 1.0, 0.45); wsScreen.rotation.x = -0.15; ws.add(wsScreen);
  const wsScrFace = wsScreen;
  // 屏幕动态状态：先放 placeholder
  setWSScreen(wsScrFace, 'INSERT MEDIA');
  const wsUsb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.16),
    new THREE.MeshStandardMaterial({ color:0x111418 }));
  wsUsb.position.set(0.5, 0.35, 0.36); ws.add(wsUsb);
  ws.position.set(0, 0.32, 0); podium.add(ws);
  pickables.push(pickable({ id:'r4_ws', mesh:ws, label:'中央工作站', onClick: onClickWS }));

  // ========= 巨型倒计时屏（墙上）=========
  const cdScreen = new THREE.Group();
  const cdBack = new THREE.Mesh(new THREE.BoxGeometry(5, 1.6, 0.1),
    new THREE.MeshStandardMaterial({ color:0x000 }));
  cdScreen.add(cdBack);
  const cdFace = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.4),
    new THREE.MeshBasicMaterial({ color:0x110000 }));
  cdFace.position.z = 0.06; cdScreen.add(cdFace);
  cdScreen.position.set(0, 4.2, -D/2 + 0.2); group.add(cdScreen);
  // 倒计时数字（用 canvas 动态贴图）
  const cdCanvas = document.createElement('canvas'); cdCanvas.width = 1024; cdCanvas.height = 256;
  const cdTex = new THREE.CanvasTexture(cdCanvas); cdTex.magFilter = THREE.NearestFilter;
  cdFace.material = new THREE.MeshBasicMaterial({ map: cdTex, toneMapped:false });

  function drawCountdownTex(remain, frozen=false) {
    const ctx = cdCanvas.getContext('2d');
    ctx.fillStyle = frozen ? '#001020' : '#180000';
    ctx.fillRect(0,0,cdCanvas.width,cdCanvas.height);
    ctx.fillStyle = frozen ? '#6effb4' : '#ff3030';
    ctx.font = 'bold 50px monospace';
    ctx.fillText(frozen ? '!! TRANSFER ABORTED !!' : '!! DATA EXFILTRATION IN PROGRESS !!', 80, 70);
    ctx.font = 'bold 160px monospace';
    const m = Math.floor(remain/60), s = Math.floor(remain%60);
    const t = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    ctx.fillText(t, 350, 220);
    cdTex.needsUpdate = true;
  }
  drawCountdownTex(120);

  // ========= 墙上海报 (前墙，与倒计时屏正对) =========
  // 几何朝向：背板厚度沿 z；旋转 180° 让正面朝向房间 (-z)
  const poster = new THREE.Group();
  const pBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.05), M.metalDark);
  poster.add(pBack);
  const pPic = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5),
    new THREE.MeshBasicMaterial({ map: makePosterTex(), toneMapped:false }));
  pPic.position.z = 0.03; poster.add(pPic);
  // 前墙内壁在 z = D/2 - 0.1 = 4.4。背板厚 0.05/2=0.025，背面贴墙。
  poster.position.set(2.5, 2.6, D/2 - 0.13);
  poster.rotation.y = Math.PI;     // 正面朝 -z（进入房间方向）
  group.add(poster);
  pickables.push(pickable({ id:'r4_poster', mesh:poster, label:'紧急流程海报', onClick: () => {
    F.posterRead = true;
    openViewer(`
      <div class="poster">
        <h3>!! EMERGENCY ABORT !!</h3>
<pre>On suspicious data exfiltration:

  1) $ status                # 查找进程 PID
  2) $ sudo kill -9 &lt;PID&gt;    # SIGKILL，强制结束
  ↳ admin override token =
     originating sysadmin employee ID

禁止以普通用户尝试 kill：
  目标进程默认 owner=ROOT，
  必须 sudo 才能下发 SIGKILL。

Failure to abort before T-0 will
be charged to your access token.

— Meridian Compliance · doc 8F-A12</pre>
      </div>`);
    advance();
  }}));

  // ========= 回 7F 传送门（在右墙门口位置，备援用）=========
  const backDoor = new THREE.Group();
  const bdSign = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 1.2),
    new THREE.MeshStandardMaterial({ color:0x0a2818, emissive:0x0a3020, emissiveIntensity:0.6 }));
  backDoor.add(bdSign);
  // "EXIT" 灯条
  const bdGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.5),
    new THREE.MeshBasicMaterial({ color:0x6effb4 }));
  bdGlow.position.x = -0.03; bdGlow.rotation.y = -Math.PI/2;
  backDoor.add(bdGlow);
  // 玩家面门时左手边 = -z 方向（红色切断闸在 +z 一侧）
  // 放上半段右墙 z=-3，避开门洞穿模也不和切断闸抢位置
  backDoor.position.set(W/2 - 0.15, 2.4, -3);
  group.add(backDoor);
  pickables.push(pickable({ id:'r4_back', mesh:backDoor, label:'下 7F · 主管办公室',
    onClick: () => engine.goto(2)
  }));

  // ========= 机柜墙 (左墙) =========
  for (let i=0; i<3; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.4, 1.4),
      new THREE.MeshStandardMaterial({ color:0x14181e, roughness:0.5, metalness:0.5 }));
    r.position.set(-W/2 + 1.0, 2.2, -2.5 + i*1.7); group.add(r);
    // 几道蓝色 LED
    for (let k=0; k<6; k++) {
      const led = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12),
        new THREE.MeshBasicMaterial({ color:0x44aaff }));
      led.position.set(-W/2 + 1.0 + 0.55, 1.0 + k*0.5, -2.5 + i*1.7);
      led.rotation.y = Math.PI/2;
      group.add(led);
    }
  }

  // ========= 紧急切断闸 (装饰)=========
  const lever = new THREE.Group();
  const lvBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.2),
    new THREE.MeshStandardMaterial({ color:0xaa1010 }));
  lever.add(lvBox);
  const lvHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06),
    new THREE.MeshStandardMaterial({ color:0xeeeeee }));
  lvHandle.position.set(0, 0.3, 0.15); lever.add(lvHandle);
  lever.position.set(W/2 - 0.5, 2.0, 2.5); lever.rotation.y = -Math.PI/2;
  group.add(lever);
  pickables.push(pickable({ id:'r4_lever', mesh:lever, label:'紧急切断闸', onClick: () => {
    if (F.transferKilled) {
      engine.showHint('已经断电了。');
      return;
    }
    engine.showHint('物理切断会触发整层警报 — 还是优先在终端里 kill 进程。');
  }}));

  // ========= 灯光 =========
  group.add(new THREE.AmbientLight(0x4060a0, 0.5));
  const blueRim = new THREE.PointLight(0x4488ff, 1.2, 16, 1.6);
  blueRim.position.set(0, 4, 0); group.add(blueRim);
  const podiumLight = new THREE.PointLight(0xaaccff, 1.0, 8, 1.6);
  podiumLight.position.set(0, 2, 0); group.add(podiumLight);
  // 倒计时屏的红光
  const redGlow = new THREE.PointLight(0xff3030, 1.4, 14, 2);
  redGlow.position.set(0, 4.0, -D/2 + 0.6); group.add(redGlow);

  // ========= 状态屏（占位）=========
  function setWSScreen(face, text, color='#9fffbf') {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#001408'; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.fillStyle = color; ctx.font = 'bold 36px monospace';
    ctx.fillText(text, 40, 130);
    const tx = new THREE.CanvasTexture(cv); tx.magFilter = THREE.NearestFilter;
    face.material = new THREE.MeshBasicMaterial({ map: tx, toneMapped:false });
  }

  // ========= 倒计时驱动 =========
  // 一旦首次进 R4 启动后，倒计时跨房继续 —— 玩家回 7F 期间 ticker 仍在跑
  let cdRemain = 120;
  let cdTimer = null;
  let cdStarted = false;

  // ========= 出口（其实通关后就关了，这里只装饰一个门）=========
  // 玩家通关条件 = 提交证据；所以出口用作"通过门走出去"，但核心是 win modal。

  // ========= 交互逻辑 =========
  function onClickWS() {
    if (!F.usbInserted) {
      if (!engine.inventory.has('r3_obelisk_usb')) {
        engine.showHint('屏幕显示 "INSERT MEDIA"。');
        return;
      }
      F.usbInserted = true;
      SFX.usbInsert();
      setTimeout(() => SFX.switchOn(), 200);
      engine.inventory.remove('r3_obelisk_usb');
      setWSScreen(wsScrFace, 'ROOT SHELL · ready', '#6effb4');
      engine.showHint('USB 插入。终端就绪。');
      advance();
    }
    openWSTerminal();
  }

  function openWSTerminal() {
    openTerminal({
      promptHead: 'root@meridian-secure-08:~#',
      init: F.transferKilled ? [
        '── shell active · transfer aborted at ' + (120 - cdRemain) + 's ──',
        '现在该把 Marcus 钉死在审计日志上：',
        '  audit                  · 看清陷害链',
        '  submit evidence 1 2 3  · 把三件证据打包发出去',
      ] : [
        '╔══════════════════════════════════════════════════╗',
        '║  EMERGENCY · DATA EXFILTRATION IN PROGRESS        ║',
        '║  PID 7747 · OBELISK-EXFIL · owner ROOT            ║',
        '║  target: RAVEN@xmail.dark · 12.4 GB / 240 万条    ║',
        '╚══════════════════════════════════════════════════╝',
        '',
        '可用命令: help, status, kill, sudo, audit, submit, clear, exit',
        '应急流程 (墙上海报):',
        '  1) status                 → 找进程 PID',
        '  2) sudo kill -9 <PID>     → SIGKILL 强制结束 (需要 admin token)',
        '  3) audit                  → 看陷害链',
        '  4) submit evidence 1 2 3  → 上交证据',
      ],
      commands: {
        help: (_, t) => {
          t.print('help, status, audit, clear, exit');
          t.print('kill -9 <PID>                # SIGKILL，普通用户');
          t.print('sudo kill -9 <PID>           # 提权 SIGKILL → 会要求 admin token');
          t.print('submit evidence 1 2 3');
        },
        status: (_, t) => {
          if (F.transferKilled) {
            t.print('STATUS: transfer ABORTED at ' + (120 - cdRemain) + 's elapsed.');
            t.print('AUDIT LOG: ' + (F.auditDone ? 'reviewed' : 'NOT reviewed'));
            t.print('EVIDENCE:  ' + (F.evidenceSubmitted ? 'submitted' : 'NOT submitted'));
          } else {
            t.print('  PID  USER  CMD');
            t.print(' 7747  ROOT  OBELISK-EXFIL → /var/lib/customers.db (12.4 GB)');
            t.print('             uplink RAVEN@xmail.dark (Tor) · ' + cdRemain + 's remaining');
            t.print('             originator (forged): PEN-TESTER · real: M.CHEN (M-0427)');
            t.print('');
            t.print('⚠ T-0 之后: 数据已交付 · 审计封档 · 无回头路。');
          }
        },
        kill: (a, t) => {
          if (F.transferKilled) { t.print('kill: PID 7747 already terminated.'); return; }
          if (a[0] !== '-9' || a[1] !== '7747') {
            t.print('kill: 用法: kill -9 <PID>   (从 status 取 PID)');
            return;
          }
          t.print('kill: (7747) Operation not permitted');
          t.print('  → process owned by ROOT, requires sudo');
        },
        sudo: (a, t) => {
          if (F.transferKilled) { t.print('sudo: PID 7747 already terminated.'); return; }
          if (a[0] !== 'kill' || a[1] !== '-9' || a[2] !== '7747') {
            t.print('sudo: 用法: sudo kill -9 <PID>');
            t.print('提示: 用 status 查 PID');
            return;
          }
          t.print('[sudo] admin override token for /usr/bin/kill -9 7747:');
          t.print('       (token = originating sysadmin employee ID)');
          t.requestInput((token) => {
            const norm = (token || '').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
            if (norm !== 'M0427') {
              t.print('[sudo] sorry, invalid override token. authentication failure logged.');
              return;
            }
            t.print('[sudo] verified · token holder: M.CHEN');
            t.print('killing 7747 (OBELISK-EXFIL) ...');
            F.transferKilled = true;
            SFX.keypadOk();
            freezeCountdown();
            drawCountdownTex(cdRemain, true);
            if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
            redGlow.color = new THREE.Color(0x44ffaa);
            redGlow.intensity = 0.7;
            setWSScreen(wsScrFace, 'PID 7747 KILLED', '#a0ffb9');
            setTimeout(() => {
              t.print('[OK] PID 7747 terminated. uplink severed.');
              t.print('提示: 跑 audit 看看陷害链 → 然后 submit evidence 1 2 3');
              engine.showHint('传输停止。下一步：audit + submit evidence。');
              advance();
            }, 600);
          }, { mask: false });
        },
        audit: (_, t) => {
          t.print('LOG · /var/log/auth.log · forensic mode');
          t.print('────────────────────────────────────────');
          t.print('  22:14  M-0427  login from desk-7F (legit)');
          t.print('  23:12  M-0427  staged OBELISK payload → /tmp/.x/');
          t.print('  23:47  PEN-TESTER  ssh from 10.44.2.9 (legit, red-team)');
          t.print('  00:31  M-0427  manually slammed B3 door bolts (CCTV-7 cap)');
          t.print('  01:36  M-0427  spawned shadow shell as PEN-TESTER');
          t.print('  01:38  M-0427  sudo --rewrite-author=PEN-TESTER');
          t.print('  01:42  rec deletion · forged author: PEN-TESTER');
          t.print('  01:55  OBELISK-EXFIL launched · forged author: PEN-TESTER');
          t.print('────────────────────────────────────────');
          t.print('真凶轨迹清晰：M.CHEN 蓄意陷害你 · 蓄意 + 现金动机 + 物证齐全。');
          t.print('现在 submit evidence 1 2 3 把它发出去。');
          F.auditDone = true;
          advance();
        },
        submit: (a, t) => {
          if (a[0] !== 'evidence') return t.print('用法: submit evidence <1 2 3>');
          if (!F.transferKilled) return t.print('submit: 传输还没停，证据会被覆盖。');
          // 必须三件证据齐全
          const need = ['r1_logs', 'r2_video', 'r3_email'];
          const missing = need.filter(id => !engine.inventory.has(id));
          if (missing.length) {
            t.print('submit: 缺少证据。需要: 机房日志(r1) + 监控录像(r2) + 邮件(r3)。');
            return;
          }
          t.print('打包: server_room_logs.zip · cctv_misc.mov · marcus_email.eml');
          t.print('  + auth.log forensic dump');
          t.print('  + your private encrypted backup');
          t.print('');
          t.print('uploading → FBI Cyber Crimes Division');
          t.print('uploading → Meridian board secsupport channel');
          t.print('uploading → KIX Airport security desk (re: M-0427)');
          setTimeout(() => {
            t.print('');
            t.print('[OK] EVIDENCE TRANSMITTED. badges revoked, accounts frozen.');
            t.print('M.CHEN 拒登记录已下发 KIX 出境闸机。');
            F.evidenceSubmitted = true;
            advance();
            setTimeout(() => {
              t.close();
              winGame();
            }, 1200);
          }, 1100);
        },
        clear: (_, t) => t.clear(),
        exit:  (_, t) => t.close(),
      },
    });
  }

  function advance() {
    if (!F.usbInserted)        return engine.setObjective('把 OBELISK USB 插进中央工作站。');
    if (!F.posterRead)         return engine.setObjective('屋里有海报写着紧急流程 — 找它。');
    if (!F.transferKilled)     return engine.setObjective('终端 `status` 看 PID → `sudo kill -9 <PID>` → 输入 admin token。');
    if (!F.auditDone)          return engine.setObjective('终端 `audit` — 查日志确认陷害。');
    if (!F.evidenceSubmitted)  return engine.setObjective('终端 `submit evidence` — 把三件证据打包上传。');
  }

  function winGame() {
    hideCountdown();
    stopAllAmbient();
    SFX.win();
    document.getElementById('win-stats').textContent = `通关用时：${(120 - cdRemain).toFixed(0)} 秒余裕`;
    openModal('win');
  }

  function loseGame() {
    if (F.transferKilled) return;
    F.timeOut = true;
    if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
    hideCountdown();
    stopAllAmbient();
    SFX.lose();
    openModal('lose');
  }

  return {
    id: 'room4',
    title: '8F · 顶层机要室',
    objective: '02:00 倒计时 — 阻止数据外泄。',
    banner: { floor:'8F · SECURE / OBELISK', name:'机要室', desc:'02:00 内停止传输 + 提交证据' },
    group, pickables, walls, cullableWalls,
    spawnPos: new THREE.Vector3(4.5, 1.65, 2.5),  // 门口
    spawnYaw: Math.PI / 2,                        // 朝向中央 podium / 倒计时屏
    spawnPitch: 0,
    init() {
      startAmbient('secure');
      // 倒计时只首次启动一次，之后跨房继续 —— 玩家临时回 7F 也照样走
      if (!cdStarted) {
        cdStarted = true;
        cdRemain = 120;
        drawCountdownTex(cdRemain, false);
        startCountdown(120, loseGame);
        cdTimer = setInterval(() => {
          if (F.transferKilled) return;
          cdRemain--;
          SFX.countdownTick(cdRemain);
          drawCountdownTex(cdRemain, false);
          if (cdRemain <= 0) { clearInterval(cdTimer); cdTimer = null; }
        }, 1000);
      }
    },
    cleanup() {
      // 故意不停 cdTimer / 不 hideCountdown —— 让倒计时跨房继续
    },
    onTick() {},
  };
}
