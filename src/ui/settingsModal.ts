import { DEFAULT_MAX_LIST_ITEMS, MAX_MAX_LIST_ITEMS, MIN_MAX_LIST_ITEMS, getMaxListItems, restoreDefaults, setMaxListItems } from '../state/settings';
import { el } from './dom';
import { openModal } from './modal';

export function openSettingsModal(): void {
  const slider = el('input', {
    class: 'input',
    attrs: {
      type: 'range',
      min: String(MIN_MAX_LIST_ITEMS),
      max: String(MAX_MAX_LIST_ITEMS),
      step: '1',
    },
  }) as HTMLInputElement;
  slider.value = String(getMaxListItems());

  const valueLabel = el('span', { class: 'settings-value', text: String(slider.value) });

  slider.addEventListener('input', () => {
    valueLabel.textContent = slider.value;
    setMaxListItems(Number(slider.value));
  });

  const restoreBtn = el('button', { class: 'btn btn-secondary', text: 'Restore Defaults' });
  restoreBtn.addEventListener('click', () => {
    restoreDefaults();
    slider.value = String(DEFAULT_MAX_LIST_ITEMS);
    valueLabel.textContent = slider.value;
  });

  const body = el('div', { class: 'settings-body' }, [
    el('div', { class: 'settings-row' }, [
      el('div', {}, [
        el('div', { class: 'settings-label', text: 'Max List Items' }),
        el('div', { class: 'settings-hint', text: 'How many items are visible before the list scrolls.' }),
      ]),
      el('div', { class: 'settings-control' }, [slider, valueLabel]),
    ]),
    el('div', { class: 'settings-footer' }, [restoreBtn]),
  ]);

  openModal('Settings', body);
}
