import { fetchRecentlyAdded, relocateAddedAt } from '../plex/api';
import type { RecentItem } from '../plex/types';
import { clearServer, getAccountToken, getClientId, getServer } from '../state/session';
import { el, statusBanner } from '../ui/dom';

interface LibraryViewProps {
  onDisconnected: () => void;
}

type TypeFilter = 'all' | 'movie' | 'show';

const CONCURRENCY = 4;

function itemSubtitle(item: RecentItem): string {
  if (item.type === 'episode') return `${item.grandparentTitle ?? ''} — ${item.parentTitle ?? ''}`;
  if (item.type === 'season') return item.parentTitle ?? '';
  return item.year ? String(item.year) : '';
}

function displayType(item: RecentItem): TypeFilter {
  // Episodes/seasons surfaced by the recently-added hub belong to a show for filtering purposes.
  return item.type === 'movie' ? 'movie' : 'show';
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function next(): Promise<void> {
    const i = cursor++;
    if (i >= items.length) return;
    await worker(items[i]);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
}

export function renderLibraryView({ onDisconnected }: LibraryViewProps): HTMLElement {
  const clientId = getClientId();
  const server = getServer();
  const accountToken = getAccountToken();
  const token = server?.token ?? accountToken;

  const root = el('div', { class: 'library-view' });

  if (!server || !token) {
    root.replaceChildren(statusBanner('error', 'No server connection found.'));
    return root;
  }

  let allItems: RecentItem[] = [];
  const selected = new Set<string>();
  let typeFilter: TypeFilter = 'all';
  let searchTerm = '';

  const listEl = el('div', { class: 'item-list' }, [el('div', { class: 'spinner' })]);
  const statusArea = el('div', { class: 'status-area' });
  const selectedCountEl = el('span', { class: 'selected-count', text: '0 selected' });

  const searchInput = el('input', { class: 'input', attrs: { type: 'text', placeholder: 'Filter by title…' } }) as HTMLInputElement;
  const filterAll = el('button', { class: 'chip chip-active', text: 'All' });
  const filterMovies = el('button', { class: 'chip', text: 'Movies' });
  const filterShows = el('button', { class: 'chip', text: 'TV' });

  const daysInput = el('input', { class: 'input input-narrow', attrs: { type: 'number', min: '0', value: '30' } }) as HTMLInputElement;
  const dateInput = el('input', { class: 'input input-narrow', attrs: { type: 'date' } }) as HTMLInputElement;
  const modeDays = el('input', { attrs: { type: 'radio', name: 'relocate-mode', value: 'days', checked: 'checked' } }) as HTMLInputElement;
  const modeDate = el('input', { attrs: { type: 'radio', name: 'relocate-mode', value: 'date' } }) as HTMLInputElement;
  const applyButton = el('button', { class: 'btn btn-primary', text: 'Relocate selected' }) as HTMLButtonElement;

  function thumbUrl(path?: string): string | null {
    if (!path || !server) return null;
    return `${server.url}${path}?X-Plex-Token=${encodeURIComponent(token!)}`;
  }

  function renderList(): void {
    const term = searchTerm.trim().toLowerCase();
    const visible = allItems.filter((item) => {
      if (typeFilter !== 'all' && displayType(item) !== typeFilter) return false;
      if (term && !item.title.toLowerCase().includes(term) && !(item.grandparentTitle ?? '').toLowerCase().includes(term)) return false;
      return true;
    });

    if (visible.length === 0) {
      listEl.replaceChildren(el('p', { class: 'muted', text: 'No items match.' }));
      return;
    }

    const rows = visible.map((item) => {
      const checkbox = el('input', { attrs: { type: 'checkbox' } }) as HTMLInputElement;
      checkbox.checked = selected.has(item.ratingKey);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selected.add(item.ratingKey);
        else selected.delete(item.ratingKey);
        updateSelectedCount();
      });

      const thumbSrc = thumbUrl(item.thumb);
      const thumb = thumbSrc
        ? (el('img', { class: 'item-thumb', attrs: { src: thumbSrc, loading: 'lazy', alt: '' } }) as HTMLImageElement)
        : el('div', { class: 'item-thumb item-thumb-empty' });

      const addedDate = new Date(item.addedAt * 1000).toLocaleDateString();

      const row = el('label', { class: 'item-row' }, [
        checkbox,
        thumb,
        el('div', { class: 'item-meta' }, [
          el('div', { class: 'item-title', text: item.title }),
          el('div', { class: 'item-subtitle', text: itemSubtitle(item) }),
        ]),
        el('div', { class: 'item-added', text: `Added ${addedDate}` }),
      ]);
      return row;
    });

    listEl.replaceChildren(...rows);
  }

  function updateSelectedCount(): void {
    selectedCountEl.textContent = `${selected.size} selected`;
    applyButton.disabled = selected.size === 0;
  }

  function setTypeFilter(next: TypeFilter): void {
    typeFilter = next;
    [filterAll, filterMovies, filterShows].forEach((chip) => chip.classList.remove('chip-active'));
    ({ all: filterAll, movie: filterMovies, show: filterShows }[next]).classList.add('chip-active');
    renderList();
  }

  filterAll.addEventListener('click', () => setTypeFilter('all'));
  filterMovies.addEventListener('click', () => setTypeFilter('movie'));
  filterShows.addEventListener('click', () => setTypeFilter('show'));
  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value;
    renderList();
  });

  applyButton.disabled = true;
  applyButton.addEventListener('click', async () => {
    const targets = allItems.filter((item) => selected.has(item.ratingKey));
    if (targets.length === 0) return;

    let newAddedAt: number;
    if (modeDays.checked) {
      const days = Number(daysInput.value);
      if (!Number.isFinite(days) || days < 0) {
        statusArea.replaceChildren(statusBanner('error', 'Enter a valid number of days.'));
        return;
      }
      newAddedAt = Math.floor(Date.now() / 1000) - days * 86400;
    } else {
      if (!dateInput.value) {
        statusArea.replaceChildren(statusBanner('error', 'Pick a date.'));
        return;
      }
      newAddedAt = Math.floor(new Date(`${dateInput.value}T12:00:00`).getTime() / 1000);
    }

    applyButton.disabled = true;
    let done = 0;
    let failed = 0;
    statusArea.replaceChildren(statusBanner('info', `Relocating 0/${targets.length}…`));

    await runWithConcurrency(targets, CONCURRENCY, async (item) => {
      try {
        await relocateAddedAt(server.url, item.librarySectionID, item, newAddedAt, clientId, token!);
        selected.delete(item.ratingKey);
        allItems = allItems.filter((i) => i.ratingKey !== item.ratingKey);
      } catch {
        failed += 1;
      } finally {
        done += 1;
        statusArea.replaceChildren(statusBanner('info', `Relocating ${done}/${targets.length}…`));
      }
    });

    updateSelectedCount();
    renderList();
    statusArea.replaceChildren(
      failed > 0
        ? statusBanner('error', `Done with ${failed} failure(s). ${targets.length - failed} item(s) relocated.`)
        : statusBanner('info', `${targets.length} item(s) relocated.`),
    );
  });

  const disconnectBtn = el('button', { class: 'btn btn-ghost', text: 'Disconnect' });
  disconnectBtn.addEventListener('click', () => {
    clearServer();
    onDisconnected();
  });

  root.replaceChildren(
    el('div', { class: 'library-header' }, [
      el('h2', { class: 'title', text: server.name }),
      disconnectBtn,
    ]),
    el('div', { class: 'toolbar' }, [
      searchInput,
      el('div', { class: 'chip-row' }, [filterAll, filterMovies, filterShows]),
    ]),
    listEl,
    el('div', { class: 'relocate-panel' }, [
      el('div', { class: 'relocate-mode-row' }, [
        el('label', {}, [modeDays, el('span', { text: 'Mark as added' }), daysInput, el('span', { text: 'days ago' })]),
        el('label', {}, [modeDate, el('span', { text: 'Set added date to' }), dateInput]),
      ]),
      el('div', { class: 'relocate-action-row' }, [selectedCountEl, applyButton]),
      statusArea,
    ]),
  );

  fetchRecentlyAdded(server.url, clientId, token)
    .then((items) => {
      allItems = items;
      renderList();
    })
    .catch((err) => {
      listEl.replaceChildren();
      statusArea.replaceChildren(statusBanner('error', `Failed to load recently added items: ${(err as Error).message}`));
    });

  return root;
}
