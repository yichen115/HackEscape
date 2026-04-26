// 入口：注册引擎模块 + 各房间，启动游戏
import { engine } from './engine.js';
import './touch.js';           // 触屏输入（手机端自动激活；桌面端 no-op）
import './controls.js';        // 启动 FPS 控制（副作用：绑事件 + addUpdate）
import './interact.js';        // 启动 raycast 准星（副作用：addUpdate + 绑事件）

// 房间
import buildRoom1 from './rooms/room1-server.js';
import buildRoom2 from './rooms/room2-monitor.js';
import buildRoom3 from './rooms/room3-office.js';
import buildRoom4 from './rooms/room4-secure.js';

[buildRoom1, buildRoom2, buildRoom3, buildRoom4].forEach(b => engine.registerRoom(b));

engine.start();
