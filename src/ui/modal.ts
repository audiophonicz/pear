import { el } from './dom';
import { closeIcon } from './icons';

export function openModal(title: string, body: Node): () => void {
  const closeBtn = el('button', { class: 'icon-btn modal-close', attrs: { 'aria-label': 'Close' } }, [closeIcon()]);
  const dialog = el('div', { class: 'modal-dialog' }, [
    el('div', { class: 'modal-header' }, [el('h2', { class: 'modal-title', text: title }), closeBtn]),
    el('div', { class: 'modal-body' }, [body]),
  ]);
  const overlay = el('div', { class: 'modal-overlay' }, [dialog]);

  function close(): void {
    overlay.remove();
    document.removeEventListener('keydown', onKeydown);
  }
  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') close();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKeydown);

  document.body.appendChild(overlay);
  return close;
}
