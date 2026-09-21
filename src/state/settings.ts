// UI preferences, separate from session.ts (account/server connection state).

const KEYS = {
  maxListItems: 'pear.settings.maxListItems',
} as const;

export const DEFAULT_MAX_LIST_ITEMS = 8;
export const MIN_MAX_LIST_ITEMS = 3;
export const MAX_MAX_LIST_ITEMS = 20;

export function getMaxListItems(): number {
  const raw = localStorage.getItem(KEYS.maxListItems);
  const value = raw ? Number(raw) : DEFAULT_MAX_LIST_ITEMS;
  if (!Number.isFinite(value)) return DEFAULT_MAX_LIST_ITEMS;
  return Math.min(MAX_MAX_LIST_ITEMS, Math.max(MIN_MAX_LIST_ITEMS, value));
}

/** Reflected into a CSS custom property so any currently-rendered list picks up the
 * change immediately, without every view needing to listen for settings updates. */
export function applyMaxListItemsCssVar(): void {
  document.documentElement.style.setProperty('--item-list-rows', String(getMaxListItems()));
}

export function setMaxListItems(value: number): void {
  localStorage.setItem(KEYS.maxListItems, String(value));
  applyMaxListItemsCssVar();
}

export function restoreDefaults(): void {
  localStorage.removeItem(KEYS.maxListItems);
  applyMaxListItemsCssVar();
}
