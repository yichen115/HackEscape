// 终端模拟器（命令表按房间注入）
import { openModal, closeModal } from './modal.js';
import { SFX } from '../sound.js';

let session = null;
let pendingPrompt = null;       // 当 sudo 等命令需要追加一行输入时挂起回调
const out = () => document.getElementById('term-out');
const inp = () => document.getElementById('term-in');

// 挂起：下一次 Enter 不当命令解析，作为字符串塞给 callback
export function requestInput(callback, opts = {}) {
  pendingPrompt = { callback, mask: !!opts.mask };
}

export function openTerminal({ promptHead='root@host:~#', prompt='$', commands={}, init=null, onClose=null } = {}) {
  session = { commands, onClose };
  pendingPrompt = null;        // 重开终端时清空遗留的 sudo 等输入挂起
  document.getElementById('term-prompt-head').textContent = promptHead;
  document.getElementById('term-prompt').textContent = prompt;
  out().textContent = '';
  inp().value = '';
  if (init) for (const line of init) print(line);
  openModal('mTerm');
  setTimeout(() => inp().focus(), 50);
  inp().onkeydown = onKey;
  inp().oninput = onType;
}

function onType(e) {
  // 普通字符输入时打字音
  SFX.termType();
}

function onKey(e) {
  if (e.key !== 'Enter') return;
  SFX.termEnter();
  const raw = inp().value; inp().value = '';

  // 挂起的提示输入（如 sudo token）—— 不当命令解析，直接回调
  if (pendingPrompt) {
    const { callback, mask } = pendingPrompt;
    pendingPrompt = null;
    print('  ' + (mask ? '*'.repeat(raw.length) : raw));
    callback(raw);
    return;
  }

  print('$ ' + raw);
  const trimmed = raw.trim();
  if (!trimmed) return;
  const [cmd, ...rest] = trimmed.split(/\s+/);
  const fn = session.commands[cmd];
  if (!fn) { print(cmd + ': 命令未找到'); return; }
  fn(rest, { print, clear, close, requestInput });
}

export function print(s='') {
  const el = out();
  el.textContent += s + '\n';
  el.scrollTop = el.scrollHeight;
}
export function clear() { out().textContent = ''; }

export function close() {
  closeModal('mTerm');
  if (session && session.onClose) session.onClose();
  session = null;
}
