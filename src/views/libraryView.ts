import { fetchSectionRecentlyAdded, fetchSections, relocateAddedAt } from '../plex/api';
import type { RecentItem } from '../plex/types';
import { getAccountToken, getClientId, getServer } from '../state/session';
import { getMaxListItems, MAX_MAX_LIST_ITEMS } from '../state/settings';
import { el, statusBanner } from '../ui/dom';
import { checkIcon, chevronLeftIcon, chevronRightIcon } from '../ui/icons';

type TypeFilter = 'all' | 'movie' | 'show';

const CONCURRENCY = 4;

// A bulk touch/re-encode event adds many episodes (often spanning several seasons)
// within seconds of each other; a genuine weekly release adds one episode roughly
// every 7 days. This threshold sits enormously far from both real patterns, verified
// directly against a live library (bulk clusters: same-second; weekly: ~7.0 days
// apart, consistently, across every real weekly show checked), so its exact value
// isn't sensitive -- it just needs to separate "seconds" from "days".
const CLUSTER_GAP_SECONDS = 24 * 60 * 60;

// Two rows (Movies/TV), Plex-dashboard style, is the current layout. The original
// single vertical scrolling list with All/Movies/TV chips is kept below rather than
// deleted — flip this back to 'list' to bring it back if the dashboard layout doesn't
// stick.
const LAYOUT_MODE: 'dashboard' | 'list' = 'dashboard';

function displayType(item: RecentItem): TypeFilter {
  // Episodes/seasons surfaced by the recently-added hub belong to a show for filtering purposes.
  return item.type === 'movie' ? 'movie' : 'show';
}

/** Stable id for "which show does this belong to", so multiple recently-added
 * episodes/seasons for the same show can be grouped -- title text alone risks
 * collisions between different shows that happen to share a name. */
function showGroupKey(item: RecentItem): string | null {
  if (item.type === 'episode') return item.grandparentRatingKey ?? null;
  if (item.type === 'season') return item.parentRatingKey ?? null;
  return null;
}

/** Season number: Plex reuses "index" for a season's own number, and "parentIndex"
 * for an episode's containing season number -- two different fields, same concept. */
function seasonNumberOf(item: RecentItem): number | undefined {
  if (item.type === 'episode') return item.parentIndex;
  if (item.type === 'season') return item.index;
  return undefined;
}

function showDisplayName(item: RecentItem): string {
  if (item.type === 'episode') return item.grandparentTitle ?? item.title;
  if (item.type === 'season') return item.parentTitle ?? item.title;
  return item.title;
}

interface ShowGroup {
  key: string;
  items: RecentItem[];
}

/** Groups recently-added TV entries by show, then splits each show's items into
 * time-clusters: consecutive items (sorted by addedAt) join the same cluster only
 * if each is within CLUSTER_GAP_SECONDS of the previous one, chained transitively --
 * so a bulk event spanning multiple seasons still merges into one cluster, but a
 * genuine weekly release (~7 days between episodes) never merges with anything,
 * even for the same show. A cluster of exactly one episode-type item stays
 * individual; anything else (2+ items in a cluster, in any season distribution, or
 * a lone season-type item) becomes one card labeled by how many distinct seasons
 * are represented within THAT cluster. A show can end up with multiple separate
 * cards this way: one for a bulk-added cluster, plus individual cards for any of
 * its episodes that arrived on a normal weekly schedule instead. */
function groupShowItems(items: RecentItem[]): ShowGroup[] {
  const byShow = new Map<string, RecentItem[]>();
  for (const item of items) {
    const key = showGroupKey(item) ?? `item:${item.ratingKey}`;
    const existing = byShow.get(key);
    if (existing) existing.push(item);
    else byShow.set(key, [item]);
  }

  const clusters: ShowGroup[] = [];
  for (const [showKey, showItemsList] of byShow) {
    const sorted = [...showItemsList].sort((a, b) => a.addedAt - b.addedAt);
    let clusterStart = 0;
    let clusterIndex = 0;
    for (let i = 1; i <= sorted.length; i++) {
      const atBoundary = i === sorted.length || sorted[i].addedAt - sorted[i - 1].addedAt > CLUSTER_GAP_SECONDS;
      if (atBoundary) {
        clusters.push({ key: `${showKey}#${clusterIndex}`, items: sorted.slice(clusterStart, i) });
        clusterStart = i;
        clusterIndex += 1;
      }
    }
  }

  return clusters.sort((a, b) => Math.max(...b.items.map((i) => i.addedAt)) - Math.max(...a.items.map((i) => i.addedAt)));
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
  // Every renderable card (movie, singleton episode, or a grouped show) registers
  // itself here, singleton cards as a 1-item array -- lets the relocate handler
  // resolve any selection id back to its underlying item(s) uniformly, regardless
  // of which layout (dashboard or list) or card type produced that selection.
  const groupMembership = new Map<string, RecentItem[]>();
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

  // ---------------------------------------------------------------------------
  // Dashboard layout: two horizontal Plex-style rows (current default)
  // ---------------------------------------------------------------------------
  function renderDashboardBody(): HTMLElement {
    const searchInput = el('input', { class: 'input', attrs: { type: 'text', placeholder: 'Filter by title…' } }) as HTMLInputElement;
    searchInput.value = searchTerm;

    const movieTrack = el('div', { class: 'dash-track' });
    const showTrack = el('div', { class: 'dash-track' });

    function cardFor(item: RecentItem): HTMLElement {
      let primaryTitle: string;
      let secondary: string;
      let subtitleTooltip: string | undefined;
      if (item.type === 'episode') {
        primaryTitle = item.grandparentTitle ?? item.title;
        if (item.parentIndex !== undefined && item.index !== undefined) {
          const pad = (n: number) => String(n).padStart(2, '0');
          secondary = `S${pad(item.parentIndex)} E${pad(item.index)}`;
          subtitleTooltip = item.title;
        } else {
          secondary = item.title;
        }
      } else if (item.type === 'season') {
        primaryTitle = item.parentTitle ?? item.title;
        secondary = item.title;
      } else {
        primaryTitle = item.title;
        secondary = item.year ? String(item.year) : '';
      }

      const thumbSrc = thumbUrl(posterPath(item));
      const poster = thumbSrc
        ? (el('img', { class: 'dash-poster', attrs: { src: thumbSrc, loading: 'lazy', alt: '' } }) as HTMLImageElement)
        : el('div', { class: 'dash-poster dash-poster-empty' });

      const subtitleEl = el('div', { class: 'dash-subtitle', text: secondary });
      if (subtitleTooltip) subtitleEl.title = subtitleTooltip;

      const card = el('button', { class: 'dash-card', attrs: { type: 'button' } }, [
        el('div', { class: 'dash-poster-wrap' }, [poster, el('div', { class: 'dash-check' }, [checkIcon()])]),
        el('div', { class: 'dash-title', text: primaryTitle }),
        subtitleEl,
      ]);
      groupMembership.set(item.ratingKey, [item]);
      if (selected.has(item.ratingKey)) card.classList.add('selected');
      card.addEventListener('click', () => {
        if (selected.has(item.ratingKey)) selected.delete(item.ratingKey);
        else selected.add(item.ratingKey);
        card.classList.toggle('selected');
        updateSelectedCount();
      });
      return card;
    }

    /** A show with 2+ recently-added entries (in any season distribution), or a lone
     * season-type entry -- one card for the whole show, labeled by how many distinct
     * seasons are represented. Relocating it applies to every underlying item. */
    function groupCardFor(group: ShowGroup): HTMLElement {
      const first = group.items[0];
      const showName = showDisplayName(first);
      const seasonCount = new Set(group.items.map(seasonNumberOf).filter((n): n is number => n !== undefined)).size;
      const secondary = seasonCount > 0 ? `${seasonCount} Season${seasonCount === 1 ? '' : 's'}` : '';

      const thumbSrc = thumbUrl(posterPath(first));
      const poster = thumbSrc
        ? (el('img', { class: 'dash-poster', attrs: { src: thumbSrc, loading: 'lazy', alt: '' } }) as HTMLImageElement)
        : el('div', { class: 'dash-poster dash-poster-empty' });

      const card = el('button', { class: 'dash-card', attrs: { type: 'button' } }, [
        el('div', { class: 'dash-poster-wrap' }, [poster, el('div', { class: 'dash-check' }, [checkIcon()])]),
        el('div', { class: 'dash-title', text: showName }),
        el('div', { class: 'dash-subtitle', text: secondary }),
      ]);
      groupMembership.set(group.key, group.items);
      if (selected.has(group.key)) card.classList.add('selected');
      card.addEventListener('click', () => {
        if (selected.has(group.key)) selected.delete(group.key);
        else selected.add(group.key);
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
      groupMembership.clear();
      const term = searchTerm.trim().toLowerCase();
      const matches = (item: RecentItem) => !term || item.title.toLowerCase().includes(term) || (item.grandparentTitle ?? '').toLowerCase().includes(term);
      const displayLimit = getMaxListItems();

      movieTrack.replaceChildren(...movieItems.filter(matches).slice(0, displayLimit).map(cardFor));

      // Group first, filter second: filtering the raw items before grouping could
      // show a show's group card with the wrong season count if the search term
      // only matched some of its episodes. A group is shown whole if ANY of its
      // episodes match, never a partial subset. The display cap applies to groups
      // (what's actually visible), not the raw episode count that fed them.
      const groups = groupShowItems(showItems).filter((g) => g.items.some(matches)).slice(0, displayLimit);
      showTrack.replaceChildren(
        ...groups.map((g) => (g.items.length === 1 && g.items[0].type === 'episode' ? cardFor(g.items[0]) : groupCardFor(g))),
      );
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
      groupMembership.clear();
      const term = searchTerm.trim().toLowerCase();
      const visible = allItemsFlat
        .filter((item) => {
          if (typeFilter !== 'all' && displayType(item) !== typeFilter) return false;
          if (term && !item.title.toLowerCase().includes(term) && !(item.grandparentTitle ?? '').toLowerCase().includes(term)) return false;
          return true;
        })
        .slice(0, getMaxListItems());

      if (visible.length === 0) {
        listEl.replaceChildren(el('p', { class: 'muted', text: 'No items match.' }));
        return;
      }

      const rows = visible.map((item) => {
        groupMembership.set(item.ratingKey, [item]);
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
    const targets = Array.from(selected).flatMap((id) => groupMembership.get(id) ?? []);
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
        removeRelocatedItem(item.ratingKey);
      } catch (err) {
        failures.push(`"${item.title}": ${(err as Error).message}`);
      } finally {
        done += 1;
        statusArea.replaceChildren(statusBanner('info', `Relocating ${done}/${targets.length}…`));
      }
    });

    // A selection id may have been a group covering several underlying items with
    // mixed success/failure -- rather than track partial-group survival through a
    // regroup on the next render, just clear selection entirely after a batch.
    selected.clear();
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
        el('label', {}, [modeDays, el('span', { text: 'Push added date back' }), daysInput, el('span', { text: 'days' })]),
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

      // Always fetch the largest practical raw batch, independent of the display
      // setting -- "Max List Items" controls how many items are VISIBLE (its own
      // label says so), not how many get fetched. TV grouping in particular can
      // collapse many raw episodes into one displayed card, so fetching only as
      // many raw items as the display count would starve the display step of
      // enough material to actually fill that many slots after grouping.
      const [movieResults, showResults] = await Promise.all([
        Promise.all(movieSections.map((s) => fetchSectionRecentlyAdded(server.url, s.key, clientId, token, MAX_MAX_LIST_ITEMS))),
        Promise.all(showSections.map((s) => fetchSectionRecentlyAdded(server.url, s.key, clientId, token, MAX_MAX_LIST_ITEMS))),
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
