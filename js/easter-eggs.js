// 可选探索记录；只展示已经发现的条目，每次新游戏从空白开始。
import { engine } from './engine.js';
import { openViewer } from './ui/viewer.js';
import { isAnyModalOpen } from './ui/modal.js';

const entries = {
  teapot: { title:'418 咖啡杯', room:'B3 · 机房', detail:'装着咖啡的杯子，坚持自己是茶壶。' },
  sandwich: { title:'sudo 三明治', room:'B3 · 终端', detail:'权限足够了，夜班的宵夜也有着落了。' },
  dns: { title:'It’s always DNS', room:'6F · 监控室', detail:'排查三小时，结案原因还是 DNS。这次的入侵另算。' },
  flag: { title:'隐藏 FLAG', room:'B3 · 隐藏文件', detail:'FLAG{trust_no_one_but_your_logs}' },
  vim: { title:'退出 Vim', room:'B3 · 交接备忘录', detail:'你逃出了编辑器。现在继续逃出大楼。' },
  duck: { title:'橡皮鸭调试', room:'7F · 书架', detail:'把问题讲到一半，终于发现漏掉了分号。' },
  planet: { title:'Hack the planet', room:'8F · 终端', detail:'先把这一栋救下来。' },
};
const found = new Set();
let mounted = false;
export function hasEgg(id) { return found.has(id); }
export function foundEggs() { return [...found].map(id => ({ id, ...entries[id] })); }
export function discoverEgg(id) {
  if (!entries[id] || found.has(id)) return false;
  found.add(id);
  if (found.size===1) engine.showHint('已记入探索记录 · J 查看');
  const button = document.getElementById('exploration-toggle');
  if (button) {
    button.hidden = false;
    button.textContent = '探索记录 · ' + found.size;
    button.classList.add('unread');
  }
  document.querySelectorAll('.exploration-end').forEach(button=>button.hidden=false);
  return true;
}
export function openExploration() {
  document.getElementById('exploration-toggle')?.classList.remove('unread');
  const records = foundEggs();
  const ending=['win','lose'].some(id=>document.getElementById(id)?.classList.contains('show'));
  document.getElementById('mView').style.zIndex=ending?'140':'100';
  openViewer('<section class="exploration-notebook"><div class="eyebrow">// FIELD NOTES</div>' +
    '<h2>探索记录</h2><p class="exploration-intro">夜班里，顺手记下的小发现。</p>' +
    (records.length ? records.map(entry => '<article><div class="exploration-room">' + entry.room +
      '</div><h3>' + entry.title + '</h3><p>' + entry.detail + '</p></article>').join('') :
      '<p class="exploration-empty">纸上还没有记录。也许桌边、书架或旧文件里藏着点什么。</p>') + '</section>');
}
export function initExploration() {
  if (mounted) return;
  mounted = true;
  const button = document.createElement('button');
  button.id = 'exploration-toggle'; button.type = 'button'; button.hidden = !found.size;
  button.textContent = '探索记录 · ' + found.size;
  button.title = '查看已发现的探索记录（J）';
  button.onclick = () => { if (!isAnyModalOpen()) openExploration(); };
  document.body.appendChild(button);
  for(const id of ['win','lose']) {
    const box=document.querySelector('#'+id+' .box'); if(!box) continue;
    const endButton=document.createElement('button'); endButton.type='button'; endButton.className='exploration-end';
    endButton.hidden=!found.size; endButton.textContent='查看探索记录'; endButton.onclick=openExploration;
    box.querySelector('.again')?.before(endButton);
  }
  document.addEventListener('keydown', event => {
    if (event.code !== 'KeyJ' || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target?.matches('input,textarea,[contenteditable="true"]') || isAnyModalOpen()) return;
    event.preventDefault(); openExploration();
  });
}
