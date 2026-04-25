# Hack Escape · 黑客密室逃脱

> *01:47 AM. 你被反锁在公司机房。*
> *空调温度正在飙升，磁带即将被热销毁。*
> *你只剩一件事可做——从地下三层一路黑回去，*
> *不是为了求救，而是为了把陷害你的人钉死。*

**模块化引擎 + 关卡注册制**的多房间第一人称黑客密室逃脱。零外部资源，所有 3D 模型、贴图、UI 全部 procedurally generated。

---

## 目录

- [故事](#故事)
- [4 个房间](#4-个房间)
- [游戏特色](#游戏特色)
- [操作](#操作)
- [本地运行](#本地运行)
- [部署到 GitHub Pages](#部署到-github-pages)
- [文件结构](#文件结构)
- [加新房间](#加新房间)
- [完整通关指南（剧透）](#完整通关指南剧透)
- [设计要点 / 技术栈](#设计要点--技术栈)

---

## 故事

**3 月 13 日，凌晨 01:47。Meridian Holdings 数据中心 B3。**

三周前他们打电话来：标准红队演练，一周交付，价钱够你过半年。你接了——这是你独立接单后第三个客户。

23:47 你刚拿到核心认证服务器的 root shell。23:55 身后机房门"咔"地一声反锁。手机没信号，门外密码盘亮红灯。

01:47 现在——空调温度 38°C 还在涨，磁带库正在按计划归档覆盖。**有人专门挑了一个外包打工人当替罪羊**：没有内部门卡、没人陪同、没有可追溯的指挥链。02:00 数据外泄就要完成，等天亮，审计日志写的会是"渗透测试人员外泄了 240 万条客户记录"。

**内鬼是 Marcus Chen**——7F 的 IT 主管，被 9F 那位老板按了 12 年还没升上去 VP，去年妻子离开他时留下一笔医院账单。他半夜翻磁带翻了两周，监控操作员上报过，9F 没回复。今晚他终于动手：先在 22:14 提前布好 OBELISK 载荷，把你引进 B3，反锁门，再用你的账户把所有命令重新部署一遍。买家是暗网代号 RAVEN，价位 80 万 USDT，他订了凌晨 KIX 转机的票。

你只剩 **13 分钟到 02:00**。从地下三层一路黑回去——抓出 Marcus、拦住传输、把锅扣回他头上。

---

## 4 个房间

| 楼层 | 场景 | 节奏 |
|---|---|---|
| **B3** | 服务器机房 | 困境 · 解谜 |
| **6F** | 监控室 | 调查 · 发现 |
| **7F** | 主管办公室 | 潜入 · 取证 |
| **8F** | 顶层机要室 | 倒计时 · 高潮 |

每个房间一条独立的道具链：每件物品只有一个用途，但下一件必然依赖上一件。**相邻楼层之间可以自由上下** —— 每个房间在前进门旁边都有"下行"指示灯，证据漏拿了直接走回去就行。

最后一关有 **120 秒硬倒计时**——倒计时**跨楼层持续**（你回 7F 也照样在跑），归零数据外流完成，你彻底背锅。

---

## 游戏特色

- **第一人称 FPS** —— WASD 移动 + 鼠标视角 + 墙体碰撞（家具不挡）
- **键盘驱动** —— 视角靠鼠标，所有交互靠键盘；弹窗 ESC 关闭后会自动锁回鼠标，体验连贯
- **零外部资源** —— 3D 模型、贴图、海报、便签、家庭照片、灯塔油画……全部 procedural 生成，单页加载即玩
- **跨房间库存** —— 手电筒、指纹模、加密 USB 等会跟着你走完整局
- **CRT 终端美学** —— 扫描线、暗角、绿色磷光字体，VT323 + Share Tech Mono

---

## 操作

| 输入 | 行为 |
|---|---|
| 鼠标 | 控制视角（点击画布锁鼠）|
| `W A S D` / 方向键 | 移动 |
| `Shift` | 加速 |
| `E` | 与准星对准的物体交互 |
| 数字键 / `Enter` / `Backspace` | 密码盘和终端直接键盘输入 |
| **`ESC`** | 关闭弹窗（动画结束后自动锁回视角） |
| `M` | 切换音效（默认关闭）|

设计原则：所有交互一律 `E`，所有数字输入一律键盘，弹窗一律 `ESC` 关闭。准星对准可交互物体时会变绿并显示标签和 `[E]` 提示。

---

## 本地运行

由于使用 ES Module，**必须本地起 HTTP 服务**（`file://` 因 CORS 无法加载 module）：

```bash
cd HackEscape
python -m http.server 8000
# 或
npx http-server -p 8000
```

浏览器打开 `http://localhost:8000`。建议 Chrome / Edge / Firefox 最新版，分辨率 1280×720 起。

---

## 部署到 GitHub Pages

完全静态的纯前端页面，零构建步骤。Three.js 从 CDN 加载，自身代码全部相对路径 ES Module，GitHub Pages 直接 serve 即可。

### 方式 A：仓库根目录直接发布（推荐，最简单）

```bash
# 1. 在 HackEscape 目录里初始化 git
cd HackEscape
git init
git add .
git commit -m "Hack Escape v2"

# 2. 在 GitHub 创建一个空仓库（比如 hack-escape），然后：
git branch -M main
git remote add origin git@github.com:你的用户名/hack-escape.git
git push -u origin main

# 3. 在仓库 Settings → Pages：
#    Source = Deploy from a branch
#    Branch = main / (root)
#    Save
```

等 1-2 分钟，访问 `https://你的用户名.github.io/hack-escape/` 即可。

### 方式 B：用 `docs/` 子目录

如果你的仓库还有别的内容、想把游戏放进 `docs/` 子目录：

```bash
# 把 HackEscape 整个目录改名为 docs/ 放进项目根
mv HackEscape docs
git add docs
git commit -m "Add game under docs/"
git push
```

仓库 Settings → Pages：Source = main / `/docs`。

### 方式 C：GitHub Actions 工作流

如果想用 Pages 的 Actions 部署模式（Settings → Pages → Source = GitHub Actions），在 `.github/workflows/pages.yml` 写：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'        # 如果游戏在 docs/，改成 'docs'
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 部署后注意事项

- **Three.js CDN 必须可访问**：仓库的 `index.html` 用的是 `cdnjs.cloudflare.com`，被屏蔽时换 `cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js`
- **HTTPS 必需**：GitHub Pages 默认 HTTPS，Pointer Lock API 在 HTTP 上有些浏览器不工作（localhost 例外）
- **路径**：所有资源都是相对路径，不依赖根 URL，子路径部署也能跑
- **首次加载**：Pages 偶尔需要 1–10 分钟刷新缓存，看不到改动多刷几次或换无痕窗口

---

## 文件结构

```
HackEscape/
├── index.html              入口：HTML 骨架 + UI 占位
├── styles.css              全部样式
├── README.md               (本文件)
└── js/
    ├── main.js             启动器
    ├── engine.js           scene/camera/loop + inventory/flags + 房间注册
    ├── controls.js         FPS 控制器（pointer lock + WASD）
    ├── collision.js        AABB 墙体碰撞 + 滑墙
    ├── interact.js         准星 raycast + 标签 + E 键
    ├── materials.js        共享材质库
    ├── tex.js              Canvas 贴图工厂
    ├── ui/                 UI 组件
    │   ├── modal.js        通用模态控制（ESC 关闭 + 自动锁回鼠标）
    │   ├── viewer.js       便签/照片/日历/邮件查看器
    │   ├── keypad.js       数字密码盘
    │   ├── terminal.js     终端模拟器
    │   ├── login.js        登录窗
    │   ├── countdown.js    房 4 倒计时
    │   └── hud.js          顶部 HUD + 转场字幕
    └── rooms/              关卡（每个一份独立文件）
        ├── room1-server.js
        ├── room2-monitor.js
        ├── room3-office.js
        └── room4-secure.js
```

---

## 加新房间

1. 复制任一房间文件改名 `roomN-yourname.js`，按统一接口默认导出：
   ```js
   export default function build() {
     return {
       id, title, objective, banner,
       group, pickables, walls, cullableWalls,
       spawnPos, spawnYaw, spawnPitch,
       init(), cleanup(), onTick(),
     };
   }
   ```
2. 在 `js/main.js` 加一行 import + 一行 `engine.registerRoom(builder)`，就这么多。

---

## 完整通关指南（剧透）

> ⚠️ **以下内容包含全部答案。请优先尝试自行通关。**
> 把页面拉到这之前的部分应该够你卡两到三个小时。如果实在卡死，再往下看。

<details>
<summary><b>展开通关详解</b></summary>

### 房间 1：B3 服务器机房

| # | 行动 | 说明 |
|---|---|---|
| 1 | 点亮**台灯** | 点开屋里光源 |
| 2 | 移开**咖啡杯** | 露出键盘下压着的便签 |
| 3 | 看**便签** | 提示："admin 默认口令 = 我家那只的名字 + 它出生的那一年" |
| 4 | 看墙上的**狗狗照片** | "REX · 出生于 2015 春" → 密码 `rex2015` |
| 5 | 看墙上的**日历** | 3/12 被红圈圈住（老板娘标注 Rex 生日）→ 4 位密码 `0312` |
| 6 | **档案柜**输 `0312` | 抽屉弹开，露出 USB 闪存盘 |
| 7 | 取走 **USB** | 插入 USB 启动电脑 |
| 8 | **PC 主机**点击 → USB 自动插入 | 显示器亮起进登录 |
| 9 | **显示器**输入密码 `rex2015` | 进入桌面，终端自动弹出 |
| 10 | 终端依次：`help` → `ls` → `cat clue.txt` → `decrypt clue.txt` | 解密提示："门禁码 = 三机柜的红色 LED 数，左到右" |
| 11 | 走到三个**机柜**前点击逐一查看 | 红灯数：4 / 1 / 7 |
| 12 | **门禁键盘**输 `417` | 门开 → 自动转场到房间 2 |

获得证据：`机房访问日志` （证据 #1）

### 房间 2：6F 监控室

| # | 行动 | 说明 |
|---|---|---|
| 1 | 点击衣帽架上的**外套** → 翻口袋 | 干洗票编号 `4283` |
| 2 | **抽屉**输 `4283` | 抽屉滑出 → 内有门禁卡 + 手电筒 |
| 3 | 取走**门禁卡**和**手电筒** |  |
| 4 | **主控台**点击 | 自动刷卡 → 显示"今晚 01:00–01:42 录像被 ROOT 删除" |
| 5 | 看**白板** | 提示："今晚备份磁带 PT-0428" + "磁带按顺序排列" |
| 6 | 走到角落的**磁带架**点击 | （拿了手电筒后才显示）发现 PT-0421 后塞着一盘错位的"MISC"磁带 |
| 7 | 拿走 **MISC 磁带** |  |
| 8 | 再点**主控台** | 自动播放磁带 → 视频显示 `01:38 Marcus Chen (M-0427) 进机房拉闸` |
| 9 | 在主控台终端输 `unlock floor7 M-0427` | 7 楼楼梯门解锁 |
| 10 | 走到**门**点击 | 转场到房间 3 |

获得证据：`监控录像 [证据]`（证据 #2）

### 房间 3：7F 主管办公室

| # | 行动 | 说明 |
|---|---|---|
| 1 | 桌下**抽屉**点击 | 自动滑出 → 露出指纹粉末套装 |
| 2 | 取走**指纹粉末套装** |  |
| 3 | 点击酒柜上的**酒杯** | （已带粉末）自动用粉末提取 → 获得 Marcus 指纹模 |
| 4 | 点击桌上**笔记本电脑** | 用指纹解锁 → 弹出邮件：周三 02:00 OBELISK 数据交付，密钥在保险箱，密码是"我和老婆结婚那天" |
| 5 | 桌上**家庭相框**点击 | "Anniversary · April 7, 2008" → 4 位密码 `0407` |
| 6 | 墙上**灯塔油画**点击 | 油画推开，露出保险箱 |
| 7 | **保险箱**输 `0407` | 内有 OBELISK USB + 写着 8F 门禁码的便条 |
| 8 | 取走 **OBELISK USB** + 看**便条**：`3371` |  |
| 9 | **门禁**输 `3371` | 转场到房间 4 |

获得证据：`Marcus 邮件 [证据]`（证据 #3）+ OBELISK USB

### 房间 4：8F 顶层机要室（120 秒硬倒计时）

进入瞬间，墙上的大屏幕开始 **02:00 倒计时**。归零 = 失败。

| # | 行动 | 说明 |
|---|---|---|
| 1 | 走到中央**工作站**点击 | OBELISK USB 自动插入 → 终端就绪 |
| 2 | 看**墙上海报**（前墙） | 紧急流程：`status` → `sudo kill -9 <PID>` → admin token = 主管员工号 |
| 3 | 终端输 `status` | 看见 `PID 7747 · OBELISK-EXFIL · owner ROOT`、Tor 链路、剩余时间 |
| 4 | 终端输 `kill -9 7747` | 普通用户：`Operation not permitted`（owner 是 ROOT）—— 要 sudo |
| 5 | 终端输 `sudo kill -9 7747` | 提示：`[sudo] admin override token:` |
| 6 | 输 `M-0427` 回车 | 来自房 2 视频的 Marcus 员工号。**SIGKILL 成功 + 倒计时冻结** |
| 7 | 终端输 `audit` | 看到日志被 Marcus 用 `sudo --rewrite-author=PEN-TESTER` 篡改 |
| 8 | 终端输 `submit evidence 1 2 3` | 把房 1 日志、房 2 录像、房 3 邮件三件证据打包发给 FBI / 董事会 / KIX 安检 |
| 9 | 等待 1.2 秒 | "EVIDENCE TRANSMITTED. ACCESS GRANTED." → 通关 |

### 答案速查表

| 谜题 | 答案 |
|---|---|
| 房 1 档案柜 | `0312` |
| 房 1 PC 登录 | `rex2015` |
| 房 1 门禁 | `417` |
| 房 2 抽屉 | `4283` |
| 房 2 终端解锁 | `unlock floor7 M-0427` |
| 房 3 保险箱 | `0407` |
| 房 3 门禁 | `3371` |
| 房 4 终止传输 | `sudo kill -9 7747` → token 输 `M-0427` |
| 房 4 提交证据 | `submit evidence 1 2 3` |

### 速通参考

正常通关 12-25 分钟。熟练后理论速通：
- 房 1：~3 分钟（解谜深度最大）
- 房 2：~2 分钟
- 房 3：~2 分钟
- 房 4：~30 秒（倒计时还剩 90 秒余裕）

总用时 ~7-8 分钟可以打到全过。

</details>

---

## 设计要点 / 技术栈

- **跨房间库存**：`engine.inventory.add(id, label)`，所有房间通过同一个全局接口存取
- **三件证据**：`r1_logs`、`r2_video`、`r3_email`，最终在房 4 的 `submit evidence` 命令中合并
- **碰撞**：每房间在 `walls[]` 里只放真正应该挡人的盒子（墙、上锁的门）。家具不挡，方便走位
- **动态遮挡**：墙体相对相机方向自动隐藏，从而 FPS 在小房间里也能用相机角度看清房间结构
- **门解锁**：`doorAabb.disabled = true` 即可让玩家穿过

技术栈：
- Three.js r128 (CDN)
- 原生 ES Modules（不需要打包工具）
- 程序化 Canvas 贴图 + BoxGeometry 几何
- Pointer Lock API（FPS 视角）
- VT323 / Share Tech Mono（CRT 终端字体）

---

> *"You think you locked me out?*
> *I am the back door."*



操作逻辑和技术由 AI 参考自：https://github.com/CNSleepybear/echoes-of-yesterday
