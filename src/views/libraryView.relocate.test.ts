import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecentItem } from '../plex/types';

vi.mock('../plex/api', () => ({
  fetchSections: vi.fn(),
  fetchSectionRecentlyAdded: vi.fn(),
  relocateAddedAt: vi.fn(),
}));

vi.mock('../state/session', () => ({
  getServer: vi.fn(),
  getAccountToken: vi.fn(),
  getClientId: vi.fn(),
}));

import { fetchSectionRecentlyAdded, fetchSections, relocateAddedAt } from '../plex/api';
import { getAccountToken, getClientId, getServer } from '../state/session';
import { renderLibraryView } from './libraryView';

const MOVIE_SECTION = { key: '1', uuid: 'a', type: 'movie' as const, title: 'Movies' };

function movie(overrides: Partial<RecentItem> = {}): RecentItem {
  return {
    ratingKey: 'm1',
    librarySectionID: '1',
    type: 'movie',
    title: 'Some Movie',
    addedAt: 1_700_000_000,
    ...overrides,
  };
}

async function renderWithItems(items: RecentItem[]): Promise<HTMLElement> {
  vi.mocked(getServer).mockReturnValue({ url: 'http://plex.local:32400', name: 'Test Server', token: 'server-token' });
  vi.mocked(getAccountToken).mockReturnValue(null);
  vi.mocked(getClientId).mockReturnValue('client-id');
  vi.mocked(fetchSections).mockResolvedValue([MOVIE_SECTION]);
  vi.mocked(fetchSectionRecentlyAdded).mockResolvedValue(items);

  const root = renderLibraryView();
  await vi.waitFor(() => expect(root.querySelectorAll('.dash-card').length).toBe(items.length));
  return root;
}

function selectCard(root: HTMLElement, index: number): void {
  const cards = root.querySelectorAll<HTMLButtonElement>('.dash-card');
  cards[index].click();
}

function clickRelocate(root: HTMLElement): void {
  root.querySelector<HTMLButtonElement>('.btn-primary')!.click();
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('relocate: original release date mode (default)', () => {
  it('calls relocateAddedAt with the timestamp computed from originallyAvailableAt', async () => {
    const item = movie({ ratingKey: 'm1', originallyAvailableAt: '2020-05-15' });
    const root = await renderWithItems([item]);

    selectCard(root, 0);
    clickRelocate(root);

    const expected = Math.floor(new Date('2020-05-15T12:00:00').getTime() / 1000);
    await vi.waitFor(() => expect(relocateAddedAt).toHaveBeenCalledTimes(1));
    expect(relocateAddedAt).toHaveBeenCalledWith('http://plex.local:32400', '1', item, expected, 'client-id', 'server-token');
  });
});

describe('relocate: days mode', () => {
  it("computes the new addedAt relative to the item's own current addedAt, not now", async () => {
    const item = movie({ ratingKey: 'm1', addedAt: 1_700_000_000 });
    const root = await renderWithItems([item]);

    selectCard(root, 0);
    root.querySelector<HTMLInputElement>('input[value="days"]')!.click();
    const daysInput = root.querySelector<HTMLInputElement>('input[type="number"]')!;
    daysInput.value = '30';
    daysInput.dispatchEvent(new Event('input'));
    clickRelocate(root);

    await vi.waitFor(() => expect(relocateAddedAt).toHaveBeenCalledTimes(1));
    expect(relocateAddedAt).toHaveBeenCalledWith(
      'http://plex.local:32400',
      '1',
      item,
      1_700_000_000 - 30 * 86400,
      'client-id',
      'server-token',
    );
  });
});

describe('relocate: date mode validation', () => {
  it('shows a validation error and never calls the API when no date is picked', async () => {
    const item = movie({ ratingKey: 'm1' });
    const root = await renderWithItems([item]);

    selectCard(root, 0);
    root.querySelector<HTMLInputElement>('input[value="date"]')!.click();
    clickRelocate(root);

    await vi.waitFor(() => expect(root.querySelector('.banner')).toBeTruthy());
    expect(root.querySelector('.banner')?.textContent).toMatch(/pick a date/i);
    expect(relocateAddedAt).not.toHaveBeenCalled();
  });
});

describe('relocate: partial failure', () => {
  it('reports the correct failure count and message when one of several items fails', async () => {
    const itemA = movie({ ratingKey: 'a', title: 'Item A', originallyAvailableAt: '2020-01-01' });
    const itemB = movie({ ratingKey: 'b', title: 'Item B', originallyAvailableAt: '2020-01-01' });
    const root = await renderWithItems([itemA, itemB]);

    vi.mocked(relocateAddedAt).mockImplementation(async (_url, _sid, item) => {
      if (item.ratingKey === 'b') throw new Error('boom');
    });

    selectCard(root, 0);
    selectCard(root, 1);
    clickRelocate(root);

    // The status banner passes through intermediate "Relocating N/2…" states
    // before the final summary replaces it -- wait for that final state
    // specifically rather than just "a banner exists".
    await vi.waitFor(() => expect(root.querySelector('.banner')?.textContent).toMatch(/Done with/));
    const text = root.querySelector('.banner')?.textContent ?? '';
    expect(text).toMatch(/Done with 1 failure\(s\)\. 1 item\(s\) relocated\./);
    expect(text).toMatch(/"Item B": boom/);
  });
});
