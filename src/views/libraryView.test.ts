import { describe, expect, it } from 'vitest';
import type { RecentItem } from '../plex/types';
import { CLUSTER_GAP_SECONDS, groupShowItems, seasonNumberOf, showDisplayName, showGroupKey } from './libraryView';

const BASE_TIME = 1_700_000_000;

function episode(overrides: Partial<RecentItem> = {}): RecentItem {
  return {
    ratingKey: 'ep1',
    librarySectionID: '1',
    type: 'episode',
    title: 'Episode Title',
    grandparentTitle: 'Show Name',
    grandparentRatingKey: 'show-1',
    parentIndex: 1,
    index: 1,
    addedAt: BASE_TIME,
    ...overrides,
  };
}

function season(overrides: Partial<RecentItem> = {}): RecentItem {
  return {
    ratingKey: 'season1',
    librarySectionID: '1',
    type: 'season',
    title: 'Season 1',
    parentTitle: 'Show Name',
    parentRatingKey: 'show-1',
    index: 1,
    addedAt: BASE_TIME,
    ...overrides,
  };
}

function movie(overrides: Partial<RecentItem> = {}): RecentItem {
  return {
    ratingKey: 'movie1',
    librarySectionID: '2',
    type: 'movie',
    title: 'Movie Title',
    addedAt: BASE_TIME,
    ...overrides,
  };
}

describe('showGroupKey', () => {
  it('uses the grandparent rating key for an episode', () => {
    expect(showGroupKey(episode())).toBe('show-1');
  });

  it('uses the parent rating key for a season', () => {
    expect(showGroupKey(season())).toBe('show-1');
  });

  it('returns null for a movie', () => {
    expect(showGroupKey(movie())).toBeNull();
  });
});

describe('seasonNumberOf', () => {
  it("reads an episode's parentIndex", () => {
    expect(seasonNumberOf(episode({ parentIndex: 3 }))).toBe(3);
  });

  it("reads a season's own index", () => {
    expect(seasonNumberOf(season({ index: 2 }))).toBe(2);
  });

  it('is undefined for a movie', () => {
    expect(seasonNumberOf(movie())).toBeUndefined();
  });
});

describe('showDisplayName', () => {
  it("uses an episode's grandparentTitle", () => {
    expect(showDisplayName(episode({ grandparentTitle: 'Attack on Titan' }))).toBe('Attack on Titan');
  });

  it("falls back to an episode's own title when grandparentTitle is missing", () => {
    expect(showDisplayName(episode({ grandparentTitle: undefined, title: 'Fallback Title' }))).toBe('Fallback Title');
  });

  it("uses a season's parentTitle", () => {
    expect(showDisplayName(season({ parentTitle: 'Attack on Titan' }))).toBe('Attack on Titan');
  });

  it('uses a movie title as-is', () => {
    expect(showDisplayName(movie({ title: 'Some Movie' }))).toBe('Some Movie');
  });
});

describe('groupShowItems', () => {
  it('merges episodes of the same show added seconds apart into one cluster', () => {
    const items = [
      episode({ ratingKey: 'e1', index: 1, addedAt: BASE_TIME }),
      episode({ ratingKey: 'e2', index: 2, addedAt: BASE_TIME + 10 }),
      episode({ ratingKey: 'e3', index: 3, addedAt: BASE_TIME + 20 }),
    ];

    const groups = groupShowItems(items);

    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(3);
  });

  it('keeps weekly-release episodes of the same show as separate clusters', () => {
    const items = [
      episode({ ratingKey: 'e1', index: 1, addedAt: BASE_TIME }),
      episode({ ratingKey: 'e2', index: 2, addedAt: BASE_TIME + 7 * CLUSTER_GAP_SECONDS }),
    ];

    const groups = groupShowItems(items);

    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.items.length === 1)).toBe(true);
  });

  it('treats each movie as its own cluster, never merged with another', () => {
    const items = [
      movie({ ratingKey: 'm1', addedAt: BASE_TIME }),
      movie({ ratingKey: 'm2', addedAt: BASE_TIME + 5 }),
    ];

    const groups = groupShowItems(items);

    expect(groups).toHaveLength(2);
  });

  it('keeps different shows in separate clusters even when added at the same time', () => {
    const items = [
      episode({ ratingKey: 'e1', grandparentRatingKey: 'show-a', addedAt: BASE_TIME }),
      episode({ ratingKey: 'e2', grandparentRatingKey: 'show-b', addedAt: BASE_TIME }),
    ];

    const groups = groupShowItems(items);

    expect(groups).toHaveLength(2);
  });

  it('splits a bulk cluster from a later weekly episode of the same show', () => {
    const items = [
      episode({ ratingKey: 'e1', index: 1, addedAt: BASE_TIME }),
      episode({ ratingKey: 'e2', index: 2, addedAt: BASE_TIME + 10 }),
      episode({ ratingKey: 'e3', index: 3, addedAt: BASE_TIME + 7 * CLUSTER_GAP_SECONDS }),
    ];

    const groups = groupShowItems(items);

    expect(groups).toHaveLength(2);
    const sizes = groups.map((g) => g.items.length).sort((a, b) => a - b);
    expect(sizes).toEqual([1, 2]);
  });

  it('orders clusters by their most recent addedAt, newest first', () => {
    const items = [
      episode({ ratingKey: 'old', grandparentRatingKey: 'show-a', addedAt: BASE_TIME }),
      episode({ ratingKey: 'new', grandparentRatingKey: 'show-b', addedAt: BASE_TIME + 1_000 }),
    ];

    const groups = groupShowItems(items);

    expect(groups[0].items[0].ratingKey).toBe('new');
    expect(groups[1].items[0].ratingKey).toBe('old');
  });
});
