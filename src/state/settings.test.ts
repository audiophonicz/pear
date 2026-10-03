import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_MAX_LIST_ITEMS, MAX_MAX_LIST_ITEMS, MIN_MAX_LIST_ITEMS, getMaxListItems, restoreDefaults, setMaxListItems } from './settings';

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the default when nothing is stored', () => {
    expect(getMaxListItems()).toBe(DEFAULT_MAX_LIST_ITEMS);
  });

  it('returns a stored value within range', () => {
    setMaxListItems(50);
    expect(getMaxListItems()).toBe(50);
  });

  it('clamps a stored value above the maximum', () => {
    setMaxListItems(MAX_MAX_LIST_ITEMS + 1000);
    expect(getMaxListItems()).toBe(MAX_MAX_LIST_ITEMS);
  });

  it('clamps a stored value below the minimum', () => {
    setMaxListItems(MIN_MAX_LIST_ITEMS - 10);
    expect(getMaxListItems()).toBe(MIN_MAX_LIST_ITEMS);
  });

  it('falls back to the default when the stored value is not a number', () => {
    localStorage.setItem('pear.settings.maxListItems', 'not-a-number');
    expect(getMaxListItems()).toBe(DEFAULT_MAX_LIST_ITEMS);
  });

  it('restoreDefaults clears the stored override', () => {
    setMaxListItems(75);
    restoreDefaults();
    expect(getMaxListItems()).toBe(DEFAULT_MAX_LIST_ITEMS);
  });
});
