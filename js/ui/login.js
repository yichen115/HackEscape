// 登录窗（用户名/密码）
import { openModal, closeModal } from './modal.js';
import { SFX } from '../sound.js';

let cb = null;

export function openLogin({ title='SECURE LOGIN', sub='—', user='admin', verify, onSuccess, onFail } = {}) {
  document.getElementById('login-title').textContent = title;
  document.getElementById('login-sub').textContent = sub;
  document.getElementById('loginUser').value = user;
  document.getElementById('loginPw').value = '';
  setFb('', '');
  cb = { verify, onSuccess, onFail };
  openModal('mLogin');
  setTimeout(() => document.getElementById('loginPw').focus(), 50);
}

function setFb(text, cls) {
  const el = document.getElementById('loginFb');
  el.textContent = text || ' ';
  el.className = 'code-fb ' + (cls || '');
}

document.getElementById('loginGo').addEventListener('click', tryLogin);
document.getElementById('loginPw').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') tryLogin();
});

function tryLogin() {
  if (!cb) return;
  const pw = document.getElementById('loginPw').value;
  const ok = cb.verify ? cb.verify(pw) : false;
  if (ok) {
    SFX.keypadOk();
    setFb('登录成功 ...', 'ok');
    const f = cb.onSuccess; cb = null;
    setTimeout(() => { closeModal('mLogin'); f && f(); }, 600);
  } else {
    SFX.keypadErr();
    setFb('× 密码错误', 'err');
    document.getElementById('loginPw').value = '';
    cb.onFail && cb.onFail();
  }
}

// 输入密码时打字音
document.getElementById('loginPw').addEventListener('input', () => SFX.termType());

export function closeLogin() { cb = null; closeModal('mLogin'); }
