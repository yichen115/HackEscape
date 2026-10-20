// 房间注入命令表；历史和补全只在模拟终端内工作。
import { openModal, closeModal } from './modal.js';
import { SFX } from '../sound.js';

let session = null, pendingPrompt = null;
const histories = new Map();
const out = () => document.getElementById('term-out');
const inp = () => document.getElementById('term-in');
const normalTools = 'Tab 补全 · ↑ / ↓ 历史 · Esc 返回游戏';
function tools() {
  let el=document.getElementById('term-tools');
  if (!el) {
    el=document.createElement('div'); el.id='term-tools';
    document.getElementById('term-in-row').before(el);
  }
  return el;
}
export function requestInput(callback, opts={}) {
  pendingPrompt={callback,mask:!!opts.mask};
  tools().textContent='请输入验证信息 · Esc 返回游戏';
}
export function openTerminal({promptHead='root@host:~#',prompt='$',commands={},init=null,onClose=null,complete=null,visibleCommands=null}={}) {
  if (session) finishSession();
  if (!histories.has(promptHead)) histories.set(promptHead,[]);
  const history=histories.get(promptHead);
  session={commands,onClose,complete,visibleCommands,history,historyIndex:history.length,draft:'',editor:null};
  pendingPrompt=null;
  document.getElementById('term-prompt-head').textContent=promptHead;
  document.getElementById('term-prompt').textContent=prompt;
  out().textContent=''; inp().value=''; inp().placeholder='';
  tools().textContent=normalTools; document.getElementById('term-box').dataset.mode='shell';
  if (init) for (const line of init) print(line);
  openModal('mTerm');
  const opened=session;
  setTimeout(()=>{if(session===opened) inp().focus();},50);
  inp().onkeydown=onKey; inp().oninput=()=>SFX.termType();
}

function remember(raw) {
  if (!raw.trim()) return;
  const history=session.history;
  if (history[history.length-1]!==raw) history.push(raw);
  if (history.length>100) history.shift();
  session.historyIndex=history.length; session.draft='';
}
function browseHistory(direction) {
  if (session.historyIndex===session.history.length) session.draft=inp().value;
  session.historyIndex=Math.max(0,Math.min(session.history.length,session.historyIndex+direction));
  inp().value=session.historyIndex===session.history.length ? session.draft : session.history[session.historyIndex];
  inp().setSelectionRange(inp().value.length,inp().value.length);
}
function completeInput() {
  const raw=inp().value,caret=inp().selectionStart??raw.length;
  const before=raw.slice(0,caret),prefix=before.match(/\S*$/)[0];
  const tailLength=raw.slice(caret).match(/^\S*/)[0].length;
  const tokens=before.trimStart().split(/\s+/);
  let candidates=tokens.length===1 ? (session.visibleCommands || Object.keys(session.commands)) : [];
  if (session.complete) candidates=session.complete(tokens)??candidates;
  const matches=[...new Set(candidates)].filter(word=>word.startsWith(prefix)).sort();
  if (!matches.length) return;
  let common=matches[0];
  for(const word of matches) while(!word.startsWith(common)) common=common.slice(0,-1);
  if (matches.length===1 || common.length>prefix.length) {
    const replacement=matches.length===1 ? matches[0] : common;
    const rest=raw.slice(caret+tailLength),space=matches.length===1&&!rest ? ' ' : '';
    const leading=raw.slice(0,caret-prefix.length);
    inp().value=leading+replacement+space+rest;
    const next=leading.length+replacement.length+space.length; inp().setSelectionRange(next,next);
  } else print(matches.join('   '));
}

// 只读 Vim 小场景；退出后恢复之前的终端输出，不保存或执行文件。
function openEditor({name,text,onExit=null}) {
  if (!session || session.editor) return;
  session.editor={name,onExit,output:out().textContent,head:document.getElementById('term-prompt-head').textContent,prompt:document.getElementById('term-prompt').textContent};
  document.getElementById('term-box').dataset.mode='vim';
  document.getElementById('term-prompt-head').textContent='vim — '+name+' [只读]';
  document.getElementById('term-prompt').textContent='';
  out().textContent=text.split('\n').map((line,i)=>String(i+1).padStart(3)+'  '+line).join('\n')+'\n\n~\n~\n~\n~\n~';
  out().scrollTop=0;
  inp().value=''; inp().placeholder='输入 :q!，或按 Esc 返回终端';
  tools().textContent='NORMAL · '+name+' [只读] · :q! / Esc 返回终端';
  inp().focus();
}
function exitEditor(method) {
  const editor=session?.editor; if(!editor) return;
  session.editor=null; out().textContent=editor.output;
  document.getElementById('term-prompt-head').textContent=editor.head;
  document.getElementById('term-prompt').textContent=editor.prompt;
  document.getElementById('term-box').dataset.mode='shell';
  inp().value=''; inp().placeholder=''; tools().textContent=normalTools;
  print('你逃出了编辑器。现在继续逃出大楼。');
  if(editor.onExit) editor.onExit(method); inp().focus();
}
function onKey(e) {
  if (!session || e.isComposing) return;
  if (session.editor) {
    if(e.key==='Escape') {e.preventDefault();e.stopPropagation();exitEditor('escape');return;}
    if(e.key==='Tab') {e.preventDefault();return;}
    if(e.key!=='Enter') return;
    e.preventDefault(); SFX.termEnter();
    const command=inp().value.trim(); inp().value='';
    if(/^:?(?:q!?|wq)$/.test(command)) exitEditor(command);
    else if(/^:?(?:help|h)$/.test(command)) tools().textContent='输入 :q! 退出编辑器；Esc 也能返回终端。';
    else tools().textContent='这份备忘录只读。输入 :q! 或按 Esc 返回终端。';
    return;
  }
  if (e.key==='Tab' || e.key==='ArrowUp' || e.key==='ArrowDown') {
    e.preventDefault();
    if(pendingPrompt) return;
    if(e.key==='Tab') completeInput(); else browseHistory(e.key==='ArrowUp'?-1:1);
    return;
  }
  if (e.key!=='Enter') return;
  e.preventDefault(); SFX.termEnter();
  const raw=inp().value; inp().value='';
  if (pendingPrompt) {
    const {callback,mask}=pendingPrompt; pendingPrompt=null; tools().textContent=normalTools;
    print('  '+(mask?'*'.repeat(raw.length):raw)); callback(raw); return;
  }
  print('$ '+raw); remember(raw);
  const trimmed=raw.trim(); if(!trimmed) return;
  const [cmd,...rest]=trimmed.split(/\s+/),fn=Object.prototype.hasOwnProperty.call(session.commands,cmd)?session.commands[cmd]:null;
  if(typeof fn!=='function') {print(cmd+': 命令未找到');return;}
  fn(rest,{print,clear,close,requestInput,openEditor});
}
export function print(s='') {
  // 等待中的主线回显写入保存的 shell，不覆盖 Vim 文档。
  if(session?.editor) {session.editor.output+=s+'\n';return;}
  const el=out(); el.textContent+=s+'\n'; el.scrollTop=el.scrollHeight;
}
export function clear() {out().textContent='';}
function finishSession() {
  const closed=session; session=null; pendingPrompt=null;
  inp().placeholder=''; inp().value=''; inp().onkeydown=null; inp().oninput=null;
  document.getElementById('term-box').dataset.mode='shell';
  if(closed?.onClose) closed.onClose();
}
export function close() {closeModal('mTerm');}
document.addEventListener('game:modalclose',event=>{if(event.detail.id==='mTerm') finishSession();});
