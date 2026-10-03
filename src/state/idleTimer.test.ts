import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('idleTimer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not time out immediately when no prior activity is stored', async () => {
    const { startIdleTimer } = await import('./idleTimer');
    const onTimeout = vi.fn();
    startIdleTimer(onTimeout, 1_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('fires onTimeout once the idle window elapses with no activity', async () => {
    const { startIdleTimer } = await import('./idleTimer');
    const onTimeout = vi.fn();
    startIdleTimer(onTimeout, 1_000);
    vi.advanceTimersByTime(31_000); // past the 30s check interval
    expect(onTimeout).toHaveBeenCalled();
  });

  it('fires immediately if a stored timestamp is already past due on startup', async () => {
    localStorage.setItem('pear.lastActivity', String(Date.now() - 100_000));
    const { startIdleTimer } = await import('./idleTimer');
    const onTimeout = vi.fn();
    startIdleTimer(onTimeout, 1_000);
    expect(onTimeout).toHaveBeenCalled();
  });

  it('resetIdleActivity prevents an immediate timeout from a stale stored timestamp', async () => {
    localStorage.setItem('pear.lastActivity', String(Date.now() - 100_000));
    const { startIdleTimer, resetIdleActivity } = await import('./idleTimer');
    resetIdleActivity();
    const onTimeout = vi.fn();
    startIdleTimer(onTimeout, 1_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('a recorded activity event pushes the idle clock back before timeout', async () => {
    const { startIdleTimer } = await import('./idleTimer');
    const onTimeout = vi.fn();
    startIdleTimer(onTimeout, 60_000);

    vi.advanceTimersByTime(30_000);
    document.dispatchEvent(new Event('click'));
    vi.advanceTimersByTime(30_000); // 60s since start, but only 30s since the click

    expect(onTimeout).not.toHaveBeenCalled();
  });
});
