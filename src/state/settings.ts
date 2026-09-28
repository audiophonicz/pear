// UI preferences, separate from session.ts (account/server connection state).

const KEYS = {
  maxListItems: 'pear.settings.maxListItems',
} as const;

// How many items are actually displayed in the Recently Added lists per library --
// applied after fetching/grouping, not the raw Plex fetch depth (that's a separate,
// fixed constant in libraryView.ts, independent of this setting).
export const DEFAULT_MAX_LIST_ITEMS = 30;
export const MIN_MAX_LIST_ITEMS = 10;
export const MAX_MAX_LIST_ITEMS = 100;

export function getMaxListItems(): number {
  const raw = localStorage.getItem(KEYS.maxListItems);
  const value = raw ? Number(raw) : DEFAULT_MAX_LIST_ITEMS;
  if (!Number.isFinite(value)) return DEFAULT_MAX_LIST_ITEMS;
  return Math.min(MAX_MAX_LIST_ITEMS, Math.max(MIN_MAX_LIST_ITEMS, value));
}

export function setMaxListItems(value: number): void {
  localStorage.setItem(KEYS.maxListItems, String(value));
}

export function restoreDefaults(): void {
  localStorage.removeItem(KEYS.maxListItems);
}
