// UI preferences, separate from session.ts (account/server connection state).

const KEYS = {
  maxListItems: 'pear.settings.maxListItems',
} as const;

// Plex's Recently Added has no day-based cutoff of its own -- it's just "N most
// recent items by addedAt", where N is whatever the requesting client asks for.
// This setting IS that N (fetched per library section), not a display/viewport
// limit -- pick it generous enough that nothing recent gets missed.
export const DEFAULT_MAX_LIST_ITEMS = 100;
export const MIN_MAX_LIST_ITEMS = 20;
export const MAX_MAX_LIST_ITEMS = 300;

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
