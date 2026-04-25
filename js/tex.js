/* global THREE */
// 通用 canvas 贴图工厂
export function makeScreenTexture(draw, w=512, h=384) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); draw(ctx, cv);
  const tx = new THREE.CanvasTexture(cv);
  tx.magFilter = THREE.NearestFilter;
  tx.needsUpdate = true;
  return tx;
}

// 房间 1: 显示器三种状态
export function makeMonitorTex(state) {
  return makeScreenTexture((c, cv) => {
    c.fillStyle = '#000'; c.fillRect(0,0,cv.width,cv.height);
    if (state === 'locked') {
      c.fillStyle = '#222'; c.font = 'bold 26px monospace';
      c.fillText('NO BOOT DEVICE', 140, 180);
      c.font = '16px monospace'; c.fillStyle = '#444';
      c.fillText('Please insert bootable media.', 130, 210);
    } else if (state === 'login') {
      c.fillStyle = '#0f1e14'; c.fillRect(0,0,cv.width,cv.height);
      c.fillStyle = '#6effb4'; c.font = 'bold 28px monospace';
      c.fillText('MERIDIAN · secure login', 80, 130);
      c.font = '20px monospace'; c.fillStyle = '#aaffc0';
      c.fillText('user: admin', 80, 200);
      c.fillText('pass: ________', 80, 235);
      c.fillText('[ click to enter ]', 80, 290);
    } else if (state === 'desktop') {
      c.fillStyle = '#0a1410'; c.fillRect(0,0,cv.width,cv.height);
      c.fillStyle = '#2a5a3e';
      for (let i=0;i<60;i++) c.fillText('·', Math.random()*cv.width, Math.random()*cv.height);
      c.fillStyle = '#6effb4'; c.font = 'bold 22px monospace';
      c.fillText('root shell active', 70, 80);
      c.font = '14px monospace';
      c.fillText('~$ click the screen to open terminal', 70, 110);
    }
  });
}

// 房间 1: 狗狗照片（贴在 3D 框里的画面）
export function makePhotoTex() {
  return makeScreenTexture((c, cv) => {
    const g = c.createLinearGradient(0,0,0,cv.height);
    g.addColorStop(0,'#a5c975'); g.addColorStop(1,'#5a7a3a');
    c.fillStyle = g; c.fillRect(0,0,cv.width,cv.height);
    c.fillStyle = '#8b5a2b';
    c.beginPath(); c.ellipse(cv.width/2, cv.height*0.62, 130, 70, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(cv.width/2 - 100, cv.height*0.5, 60, 55, 0, 0, Math.PI*2); c.fill();
    c.fillRect(cv.width/2 - 130, cv.height*0.65, 18, 60);
    c.fillRect(cv.width/2 - 60,  cv.height*0.65, 18, 60);
    c.fillRect(cv.width/2 + 30,  cv.height*0.65, 18, 60);
    c.fillRect(cv.width/2 + 90,  cv.height*0.65, 18, 60);
    c.fillStyle = '#000';
    c.beginPath(); c.arc(cv.width/2 - 120, cv.height*0.48, 4, 0, Math.PI*2); c.fill();
    c.fillStyle = '#6a3f1b';
    c.beginPath(); c.moveTo(cv.width/2 - 140, cv.height*0.42);
    c.lineTo(cv.width/2 - 110, cv.height*0.48);
    c.lineTo(cv.width/2 - 155, cv.height*0.6); c.fill();
    c.fillStyle = '#f1ecd6'; c.fillRect(0, cv.height-60, cv.width, 60);
    c.fillStyle = '#2a1a0a'; c.font = 'bold 28px VT323, monospace';
    c.fillText('REX — 出生于 2015 春', 100, cv.height-22);
  });
}

// 房间 1: 日历贴图
export function makeCalendarTex() {
  return makeScreenTexture((c, cv) => {
    c.fillStyle = '#fafafa'; c.fillRect(0,0,cv.width,cv.height);
    c.fillStyle = '#aa1e1e'; c.font = 'bold 44px VT323, monospace';
    c.fillText('MARCH  2026', 130, 60);
    const days = ['S','M','T','W','T','F','S'];
    c.fillStyle = '#555'; c.font = '28px VT323, monospace';
    for (let i=0;i<7;i++) c.fillText(days[i], 40 + i*66, 110);
    for (let d=1; d<=31; d++) {
      const col = (d-1) % 7, row = Math.floor((d-1)/7);
      const x = 40 + col*66, y = 150 + row*50;
      if (d === 12) {
        c.fillStyle = '#d92a2a';
        c.beginPath(); c.arc(x+8, y-8, 22, 0, Math.PI*2); c.fill();
        c.fillStyle = '#fff';
      } else c.fillStyle = '#222';
      c.font = '28px VT323, monospace';
      c.fillText(String(d), x, y);
    }
    c.fillStyle = '#2a1a0a'; c.font = '20px VT323, monospace';
    c.fillText('*老板的狗生日', 260, 360);
  });
}

// 房间 1: 白板
export function makeWhiteboardTex() {
  return makeScreenTexture((c, cv) => {
    c.fillStyle = '#f4f4f0'; c.fillRect(0,0,cv.width,cv.height);
    c.strokeStyle = '#1a78d6'; c.lineWidth = 4;
    c.strokeRect(10, 10, cv.width-20, cv.height-20);
    c.fillStyle = '#1a78d6'; c.font = 'bold 36px monospace';
    c.fillText('// NIGHT SHIFT TODO', 30, 60);
    c.fillStyle = '#222'; c.font = '24px monospace';
    c.fillText('1. 替换坏掉的 RAID 面板 (#2 机柜)', 40, 110);
    c.fillText('2. 老板的狗生日 — 提醒买蛋糕', 40, 150);
    c.fillText('3. ATM 机房门换新密码', 40, 190);
    c.fillStyle = '#aa1e1e'; c.font = 'bold 24px monospace';
    c.fillText('!! 不要再把口令写在便签上 !!', 40, 240);
    c.fillStyle = '#2a7a3e'; c.font = '20px monospace';
    c.fillText('P.S. Rex 很乖。', 40, 290);
  });
}

// 房间 2: 监控墙摄像头网格（4×3 暗屏）
export function makeCCTVTex(label) {
  return makeScreenTexture((c, cv) => {
    c.fillStyle = '#020608'; c.fillRect(0,0,cv.width,cv.height);
    c.strokeStyle = '#0a1a18'; c.lineWidth = 2;
    for (let i=0;i<8;i++) c.strokeRect(0+i*12,0+i*9,cv.width-i*24,cv.height-i*18);
    c.fillStyle = '#0a3a28'; c.font = '14px monospace';
    c.fillText(label || 'CAM-XX', 16, 24);
    c.fillStyle = '#1a4a32'; c.font = '12px monospace';
    c.fillText('NO SIGNAL', cv.width/2 - 50, cv.height/2);
    c.fillStyle = '#ff3030'; c.beginPath(); c.arc(cv.width-20, 20, 4, 0, Math.PI*2); c.fill();
    c.fillStyle = '#aa2020'; c.font = '11px monospace';
    c.fillText('REC ●', cv.width-46, 24);
  });
}

// 房间 2: 监控控台主屏（2 状态：locked / online）
export function makeConsoleTex(state) {
  return makeScreenTexture((c, cv) => {
    c.fillStyle = '#000'; c.fillRect(0,0,cv.width,cv.height);
    if (state === 'locked') {
      c.fillStyle = '#444'; c.font = 'bold 24px monospace';
      c.fillText('SECURITY CONSOLE · LOCKED', 90, 150);
      c.fillStyle = '#666'; c.font = '14px monospace';
      c.fillText('SWIPE KEY CARD TO ACTIVATE', 130, 190);
    } else if (state === 'online') {
      c.fillStyle = '#001408'; c.fillRect(0,0,cv.width,cv.height);
      c.fillStyle = '#6effb4'; c.font = 'bold 18px monospace';
      c.fillText('SECURITY CONSOLE · ONLINE', 30, 30);
      c.fillStyle = '#aa3030'; c.font = 'bold 22px monospace';
      c.fillText('!! REC LOG · TONIGHT 01:00 — 01:42 !!', 30, 80);
      c.fillStyle = '#ff8888'; c.font = '16px monospace';
      c.fillText('STATUS: DELETED  by user ROOT', 30, 110);
      c.fillStyle = '#88ffaa'; c.font = '14px monospace';
      c.fillText('Type "help" in terminal to continue.', 30, 160);
      c.fillStyle = '#446'; c.font = '11px monospace';
      let y = 200;
      ['BACKUP TAPE  ARCHIVE  ROUTE',
       'PT-0420 .. PT-0427 (today PT-0428 SHOULD be archived but missing)',
       'CHECK SHELF · USE FLASHLIGHT FOR DARK CORNER',
      ].forEach(t => { c.fillText(t, 30, y); y += 18; });
    }
  });
}

// 房间 2: 白板
export function makeMonitorWBTex() {
  return makeScreenTexture((c, cv) => {
    c.fillStyle = '#f4f4f0'; c.fillRect(0,0,cv.width,cv.height);
    c.strokeStyle = '#aa1e1e'; c.lineWidth = 4;
    c.strokeRect(10, 10, cv.width-20, cv.height-20);
    c.fillStyle = '#aa1e1e'; c.font = 'bold 36px monospace';
    c.fillText('// BACKUP PROCEDURES', 30, 60);
    c.fillStyle = '#222'; c.font = '24px monospace';
    c.fillText('• Tape archive runs nightly @ 02:00', 40, 110);
    c.fillText('• Naming: PT-####  (sequential)', 40, 150);
    c.fillText('• Yesterday: PT-0427', 40, 190);
    c.fillText('• Tonight: PT-0428 (TBA)', 40, 230);
    c.fillStyle = '#1a78d6'; c.font = '20px monospace';
    c.fillText('Lost tape? Check the shelf — properly!', 40, 280);
    c.fillStyle = '#666'; c.font = '14px monospace';
    c.fillText('-- L. Foreman, Sec Op', 40, 340);
  });
}

// 房间 3: 家庭照片
export function makeFamilyPhotoTex() {
  return makeScreenTexture((c, cv) => {
    const g = c.createLinearGradient(0,0,0,cv.height);
    g.addColorStop(0,'#9bb3d8'); g.addColorStop(1,'#3e5b8a');
    c.fillStyle = g; c.fillRect(0,0,cv.width,cv.height);
    // 三个简化的人形剪影
    c.fillStyle = '#3a2a1a';
    const hs = [[180,180,80],[260,170,100],[340,200,70]];
    for (const [x,y,h] of hs) {
      c.beginPath(); c.arc(x, y, 26, 0, Math.PI*2); c.fill();
      c.fillRect(x-22, y+20, 44, h);
    }
    c.fillStyle = '#f1ecd6'; c.fillRect(0, cv.height-72, cv.width, 72);
    c.fillStyle = '#2a1a0a'; c.font = 'bold 26px VT323, monospace';
    c.fillText('Anniversary', 90, cv.height-40);
    c.font = 'bold 30px VT323, monospace';
    c.fillText('April 7, 2008', 80, cv.height-12);
  });
}

// 房间 3: 灯塔油画（暗藏保险箱）
export function makePaintingTex() {
  return makeScreenTexture((c, cv) => {
    const g = c.createLinearGradient(0,0,0,cv.height);
    g.addColorStop(0,'#1a2a44'); g.addColorStop(0.6,'#2a4060'); g.addColorStop(1,'#0a1830');
    c.fillStyle = g; c.fillRect(0,0,cv.width,cv.height);
    // 海岸 + 灯塔
    c.fillStyle = '#403828'; c.fillRect(0, cv.height*0.7, cv.width, cv.height);
    c.fillStyle = '#e8d8b4'; c.fillRect(cv.width*0.4, cv.height*0.4, 40, cv.height*0.3);
    c.fillStyle = '#aa3030'; c.fillRect(cv.width*0.4, cv.height*0.4, 40, 40);
    c.fillStyle = '#fff8a0'; c.beginPath();
    c.arc(cv.width*0.42, cv.height*0.42, 14, 0, Math.PI*2); c.fill();
    // 月亮
    c.fillStyle = '#dde'; c.beginPath();
    c.arc(cv.width*0.78, cv.height*0.18, 30, 0, Math.PI*2); c.fill();
  });
}

// 房间 3: 邮件
export function makeEmailHTML() {
  return `
    <div class="email" style="width:560px;">
      <div class="from">From: m.chen@meridian.corp · To: raven_obelisk@xmail.dark</div>
      <div class="sub">Re: 周三 02:00 OBELISK 交付 — 最终确认</div>
      <div class="body">RAVEN —

OBELISK 全集今晚 02:00 准时上传：
  · 240 万条客户银行账户
  · 配套医疗记录 + 生物识别模板
  · 完整 KYC 档案（含未脱敏身份证扫描）

解密钥分两段：
一段在我办公室<b>保险箱</b>（4 位旋钮，密码就是我和她结婚那天，你懂的）。
另一段在 8F 工作站启动时自动注入。

画后面是保险箱。便条上写了 8F 门禁码，看完撕掉。

外面那个 PEN-TESTER 给我帮了大忙——我把今晚审计日志全署名到他账户上了。
等明早大楼炸开锅，他坐牢，我已经在 KIX 等转机。

最后说一遍：<b>80 万 USDT 到账才交东西</b>，别耍小聪明。
她临走前那张医院账单我照付不误，这十二年的事我也算清楚了。
9F 那位现在还以为我是他的 IT 跑腿——明早他会知道把我按了十二年是什么代价。

— M.

P.S. 别再用这个邮箱回我，明早我就把它烧了。</div>
    </div>`;
}

// 房间 4: 紧急流程海报
export function makePosterTex() {
  return makeScreenTexture((c, cv) => {
    c.fillStyle = '#0a1410'; c.fillRect(0,0,cv.width,cv.height);
    c.strokeStyle = '#ff3030'; c.lineWidth = 4;
    c.strokeRect(10, 10, cv.width-20, cv.height-20);
    c.fillStyle = '#ff5050'; c.font = 'bold 26px monospace';
    c.fillText('!! EMERGENCY ABORT !!', 90, 55);
    c.fillStyle = '#9fffbf'; c.font = '17px monospace';
    let y = 95;
    [
      'On suspicious data exfiltration:',
      '',
      '  1) $ status              # 查 PID',
      '  2) $ sudo kill -9 <PID>  # SIGKILL',
      '  3) admin override token =',
      '     originating sysadmin',
      '     employee ID',
      '',
      '禁止在普通用户下尝试 kill：',
      '  目标进程默认为 ROOT 持有，',
      '  必须 sudo 才能操作 SIGKILL。',
      '',
      'Failure to abort before T-0 will',
      'be charged to your access token.',
      '',
      '— Meridian Compliance · doc 8F-A12',
    ].forEach(line => { c.fillText(line, 35, y); y += 22; });
  }, 512, 512);
}
