// 通用文档/物件查看器（便签、照片、日历、票据、邮件等用 HTML 渲染）
import { openModal, closeModal } from './modal.js';

export function openViewer(html) {
  document.getElementById('mViewBody').innerHTML = html;
  openModal('mView');
}
export function closeViewer() { closeModal('mView'); }
