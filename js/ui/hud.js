// HUD 辅助：进入房间过场字幕、转场黑遮罩

const fadeEl = document.getElementById('fade');
const banner = document.getElementById('room-banner');
const bFloor = document.getElementById('rb-floor');
const bName  = document.getElementById('rb-name');
const bDesc  = document.getElementById('rb-desc');

export function fadeIn(ms=600) {
  return new Promise(res => {
    fadeEl.classList.add('show');
    setTimeout(res, ms);
  });
}
export function fadeOut(ms=600) {
  return new Promise(res => {
    fadeEl.classList.remove('show');
    setTimeout(res, ms);
  });
}

let bannerTimer = null;
export function showRoomBanner(floor, name, desc, dur=2200) {
  bFloor.textContent = floor || '';
  bName.textContent  = name || '';
  bDesc.textContent  = desc || '';
  banner.classList.remove('hidden');
  banner.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    banner.classList.remove('show');
    setTimeout(() => banner.classList.add('hidden'), 500);
  }, dur);
}
