import { fetchSectionRecentlyAdded, fetchSections, relocateAddedAt } from '../plex/api';
import type { RecentItem } from '../plex/types';
import { getAccountToken, getClientId, getServer } from '../state/session';
import { getMaxListItems } from '../state/settings';
import { el, statusBanner } from '../ui/dom';
import { checkIcon, chevronLeftIcon, chevronRightIcon } from '../ui/icons';

type TypeFilter = 'all' | 'movie' | 'show';

const CONCURRENCY = 4;

// Two rows (Movies/TV), Plex-dashboard style, is the current layout. The original
// single vertical scrolling list with All/Movies/TV chips is kept below rather than
// deleted — flip this back to 'list' to bring it back if the dashboard layout doesn't
// stick.
const LAYOUT_MODE: 'dashboard' | 'list' = 'dashboard';

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

export function renderLibraryView(): HTMLElement {
  const clientId = getClientId();
  const server = getServer();
  const accountToken = getAccountToken();
  const token = server?.token ?? accountToken;

  const root = el('div', { class: 'library-view' });

  if (!server || !token) {
    root.replaceChildren(statusBanner('error', 'No server connection found.'));
    return root;
  }

  let movieItems: RecentItem[] = [];
  let showItems: RecentItem[] = [];
  let allItemsFlat: RecentItem[] = [];
  const selected = new Set<string>();
  let searchTerm = '';

  const bodyContainer = el('div', { class: 'library-body' });
  const statusArea = el('div', { class: 'status-area' });
  const selectedCountEl = el('span', { class: 'selected-count', text: '0 selected' });

  const daysInput = el('input', { class: 'input input-narrow', attrs: { type: 'number', min: '0', value: '90' } }) as HTMLInputElement;
  const dateInput = el('input', { class: 'input input-narrow', attrs: { type: 'date' } }) as HTMLInputElement;
  const modeOriginal = el('input', { attrs: { type: 'radio', name: 'relocate-mode', value: 'original', checked: 'checked' } }) as HTMLInputElement;
  const modeDays = el('input', { attrs: { type: 'radio', name: 'relocate-mode', value: 'days' } }) as HTMLInputElement;
  const modeDate = el('input', { attrs: { type: 'radio', name: 'relocate-mode', value: 'date' } }) as HTMLInputElement;
  const applyButton = el('button', { class: 'btn btn-primary', text: 'Relocate selected' }) as HTMLButtonElement;

  function thumbUrl(path?: string): string | null {
    if (!path || !server) return null;
    return `${server.url}${path}?X-Plex-Token=${encodeURIComponent(token!)}`;
  }

  /** The show's poster, not the episode's own screencap thumbnail. */
  function posterPath(item: RecentItem): string | undefined {
    if (item.type === 'episode') return item.grandparentThumb ?? item.thumb;
    if (item.type === 'season') return item.parentThumb ?? item.thumb;
    return item.thumb;
  }

  function updateSelectedCount(): void {
    selectedCountEl.textContent = `${selected.size} selected`;
    applyButton.disabled = selected.size === 0;
  }

  function removeRelocatedItem(ratingKey: string): void {
    movieItems = movieItems.filter((i) => i.ratingKey !== ratingKey);
    showItems = showItems.filter((i) => i.ratingKey !== ratingKey);
    allItemsFlat = allItemsFlat.filter((i) => i.ratingKey !== ratingKey);
  }

  function findItem(ratingKey: string): RecentItem | undefined {
    return movieItems.find((i) => i.ratingKey === ratingKey) ?? showItems.find((i) => i.ratingKey === ratingKey);
  }

  // ---------------------------------------------------------------------------
  // Dashboard layout: two horizontal Plex-style rows (current default)
  // ---------------------------------------------------------------------------
  function renderDashboardBody(): HTMLElement {
    const searchInput = el('input', { class: 'input', attrs: { type: 'text', placeholder: 'Filter by title…' } }) as HTMLInputElement;
    searchInput.value = searchTerm;

    const movieTrack = el('div', { class: 'dash-track' });
    const showTrack = el('div', { class: 'dash-track' });

    function cardFor(item: RecentItem): HTMLElement {
      const isEpisodeish = item.type !== 'movie';
      const primaryTitle = isEpisodeish ? (item.grandparentTitle ?? item.title) : item.title;
      const secondary = isEpisodeish ? (item.parentTitle ?? item.title) : item.year ? String(item.year) : '';

      const thumbSrc = thumbUrl(posterPath(item));
      const poster = thumbSrc
        ? (el('img', { class: 'dash-poster', attrs: { src: thumbSrc, loading: 'lazy', alt: '' } }) as HTMLImageElement)
        : el('div', { class: 'dash-poster dash-poster-empty' });

      const card = el('button', { class: 'dash-card', attrs: { type: 'button' } }, [
        el('div', { class: 'dash-poster-wrap' }, [poster, el('div', { class: 'dash-check' }, [checkIcon()])]),
        el('div', { class: 'dash-title', text: primaryTitle }),
        el('div', { class: 'dash-subtitle', text: secondary }),
      ]);
      if (selected.has(item.ratingKey)) card.classList.add('selected');
      card.addEventListener('click', () => {
        if (selected.has(item.ratingKey)) selected.delete(item.ratingKey);
        else selected.add(item.ratingKey);
        card.classList.toggle('selected');
        updateSelectedCount();
      });
      return card;
    }

    function buildRow(title: string, track: HTMLElement): HTMLElement {
      const prevBtn = el('button', { class: 'row-nav-btn', attrs: { type: 'button', 'aria-label': `Scroll ${title} left` } }, [chevronLeftIcon()]);
      const nextBtn = el('button', { class: 'row-nav-btn', attrs: { type: 'button', 'aria-label': `Scroll ${title} right` } }, [chevronRightIcon()]);
      prevBtn.addEventListener('click', () => track.scrollBy({ left: -600, behavior: 'smooth' }));
      nextBtn.addEventListener('click', () => track.scrollBy({ left: 600, behavior: 'smooth' }));
      return el('section', { class: 'dash-row' }, [
        el('div', { class: 'dash-row-header' }, [el('h3', { class: 'dash-row-title', text: title }), el('div', { class: 'dash-nav' }, [prevBtn, nextBtn])]),
        track,
      ]);
    }

    function refreshRows(): void {
      const term = searchTerm.trim().toLowerCase();
      const matches = (item: RecentItem) => !term || item.title.toLowerCase().includes(term) || (item.grandparentTitle ?? '').toLowerCase().includes(term);
      movieTrack.replaceChildren(...movieItems.filter(matches).map(cardFor));
      showTrack.replaceChildren(...showItems.filter(matches).map(cardFor));
    }

    searchInput.addEventListener('input', () => {
      searchTerm = searchInput.value;
      refreshRows();
    });

    refreshRows();

    return el('div', { class: 'dashboard-body' }, [
      searchInput,
      buildRow('Recently Added Movies', movieTrack),
      buildRow('Recently Added TV', showTrack),
    ]);
  }

  // ---------------------------------------------------------------------------
  // List layout: original single vertical scrolling list with All/Movies/TV chips.
  // Preserved (not deleted) in case the dashboard layout above doesn't stick —
  // switch LAYOUT_MODE back to 'list' to use this instead.
  // ---------------------------------------------------------------------------
  let typeFilter: TypeFilter = 'all';

  function itemSubtitle(item: RecentItem): string {
    if (item.type === 'episode') return `${item.grandparentTitle ?? ''} — ${item.parentTitle ?? ''}`;
    if (item.type === 'season') return item.parentTitle ?? '';
    return item.year ? String(item.year) : '';
  }

  function renderListBody(): HTMLElement {
    const listEl = el('div', { class: 'item-list' });
    const searchInput = el('input', { class: 'input', attrs: { type: 'text', placeholder: 'Filter by title…' } }) as HTMLInputElement;
    searchInput.value = searchTerm;
    const filterAll = el('button', { class: 'chip', text: 'All' });
    const filterMovies = el('button', { class: 'chip', text: 'Movies' });
    const filterShows = el('button', { class: 'chip', text: 'TV' });
    ({ all: filterAll, movie: filterMovies, show: filterShows }[typeFilter]).classList.add('chip-active');

    function renderRows(): void {
      const term = searchTerm.trim().toLowerCase();
      const visible = allItemsFlat.filter((item) => {
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

        const thumbSrc = thumbUrl(posterPath(item));
        const thumb = thumbSrc
          ? (el('img', { class: 'item-thumb', attrs: { src: thumbSrc, loading: 'lazy', alt: '' } }) as HTMLImageElement)
          : el('div', { class: 'item-thumb item-thumb-empty' });

        const addedDate = new Date(item.addedAt * 1000).toLocaleDateString();

        return el('label', { class: 'item-row' }, [
          checkbox,
          thumb,
          el('div', { class: 'item-meta' }, [
            el('div', { class: 'item-title', text: item.title }),
            el('div', { class: 'item-subtitle', text: itemSubtitle(item) }),
          ]),
          el('div', { class: 'item-added', text: `Added ${addedDate}` }),
        ]);
      });

      listEl.replaceChildren(...rows);
    }

    function setTypeFilter(next: TypeFilter): void {
      typeFilter = next;
      [filterAll, filterMovies, filterShows].forEach((chip) => chip.classList.remove('chip-active'));
      ({ all: filterAll, movie: filterMovies, show: filterShows }[next]).classList.add('chip-active');
      renderRows();
    }

    filterAll.addEventListener('click', () => setTypeFilter('all'));
    filterMovies.addEventListener('click', () => setTypeFilter('movie'));
    filterShows.addEventListener('click', () => setTypeFilter('show'));
    searchInput.addEventListener('input', () => {
      searchTerm = searchInput.value;
      renderRows();
    });

    renderRows();

    return el('div', { class: 'list-body' }, [
      el('div', { class: 'toolbar' }, [searchInput, el('div', { class: 'chip-row' }, [filterAll, filterMovies, filterShows])]),
      listEl,
    ]);
  }

  function renderBody(): void {
    bodyContainer.replaceChildren(LAYOUT_MODE === 'dashboard' ? renderDashboardBody() : renderListBody());
  }

  applyButton.disabled = true;
  applyButton.addEventListener('click', async () => {
    const targets = Array.from(selected)
      .map((key) => findItem(key))
      .filter((item): item is RecentItem => item !== undefined);
    if (targets.length === 0) return;

    const mode: 'original' | 'days' | 'date' = modeOriginal.checked ? 'original' : modeDays.checked ? 'days' : 'date';
    let days = 0;
    let absoluteTarget = 0;
    if (mode === 'days') {
      days = Number(daysInput.value);
      if (!Number.isFinite(days) || days < 0) {
        statusArea.replaceChildren(statusBanner('error', 'Enter a valid number of days.'));
        return;
      }
    } else if (mode === 'date') {
      if (!dateInput.value) {
        statusArea.replaceChildren(statusBanner('error', 'Pick a date.'));
        return;
      }
      absoluteTarget = Math.floor(new Date(`${dateInput.value}T12:00:00`).getTime() / 1000);
    }

    applyButton.disabled = true;
    let done = 0;
    const failures: string[] = [];
    statusArea.replaceChildren(statusBanner('info', `Relocating 0/${targets.length}…`));

    await runWithConcurrency(targets, CONCURRENCY, async (item) => {
      // Days mode is relative to the item's OWN current addedAt, not to "now" — that
      // way an item that's already old still moves further into the past instead of
      // potentially jumping more recent than it already was.
      try {
        let newAddedAt: number;
        if (mode === 'original') {
          if (!item.originallyAvailableAt) {
            throw new Error('No original release date available for this item.');
          }
          newAddedAt = Math.floor(new Date(`${item.originallyAvailableAt}T12:00:00`).getTime() / 1000);
        } else if (mode === 'days') {
          newAddedAt = item.addedAt - days * 86400;
        } else {
          newAddedAt = absoluteTarget;
        }
        await relocateAddedAt(server.url, item.librarySectionID, item, newAddedAt, clientId, token!);
        selected.delete(item.ratingKey);
        removeRelocatedItem(item.ratingKey);
      } catch (err) {
        failures.push(`"${item.title}": ${(err as Error).message}`);
      } finally {
        done += 1;
        statusArea.replaceChildren(statusBanner('info', `Relocating ${done}/${targets.length}…`));
      }
    });

    updateSelectedCount();
    renderBody();
    statusArea.replaceChildren(
      failures.length > 0
        ? statusBanner('error', `Done with ${failures.length} failure(s). ${targets.length - failures.length} item(s) relocated. ${failures.join(' | ')}`)
        : statusBanner('info', `${targets.length} item(s) relocated.`),
    );
  });

  root.replaceChildren(
    el('div', { class: 'library-header' }, [el('h2', { class: 'title', text: server.name })]),
    bodyContainer,
    el('div', { class: 'relocate-panel' }, [
      el('p', { class: 'relocate-instructions', text: 'To remove an item from the Recently Added lists:' }),
      el('div', { class: 'relocate-mode-row' }, [
        el('label', {}, [modeOriginal, el('span', { text: 'Set added date to original release date' })]),
        el('span', { class: 'relocate-or', text: 'OR' }),
        el('label', {}, [modeDays, el('span', { text: 'Push added date back' }), daysInput, el('span', { text: 'days' })]),
        el('span', { class: 'relocate-or', text: 'OR' }),
        el('label', {}, [modeDate, el('span', { text: 'Set added date to' }), dateInput]),
      ]),
      el('div', { class: 'relocate-action-row' }, [selectedCountEl, applyButton]),
      statusArea,
    ]),
  );

  bodyContainer.replaceChildren(el('div', { class: 'spinner' }));

  fetchSections(server.url, clientId, token)
    .then(async (sections) => {
      const movieSections = sections.filter((s) => s.type === 'movie');
      const showSections = sections.filter((s) => s.type === 'show');

      const fetchLimit = getMaxListItems();
      const [movieResults, showResults] = await Promise.all([
        Promise.all(movieSections.map((s) => fetchSectionRecentlyAdded(server.url, s.key, clientId, token, fetchLimit))),
        Promise.all(showSections.map((s) => fetchSectionRecentlyAdded(server.url, s.key, clientId, token, fetchLimit))),
      ]);

      movieItems = movieResults.flat().sort((a, b) => b.addedAt - a.addedAt);
      showItems = showResults.flat().sort((a, b) => b.addedAt - a.addedAt);
      allItemsFlat = [...movieItems, ...showItems].sort((a, b) => b.addedAt - a.addedAt);

      renderBody();
    })
    .catch((err) => {
      bodyContainer.replaceChildren();
      statusArea.replaceChildren(statusBanner('error', `Failed to load recently added items: ${(err as Error).message}`));
    });

  return root;
}
