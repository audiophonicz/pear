// Idle-based auto-logoff. Tracked via localStorage (not an in-memory timestamp) so
// the idle clock keeps running across page reloads and closed tabs -- walking away
// and closing the laptop shouldn't reset it back to zero.

const LAST_ACTIVITY_KEY = 'pear.lastActivity';
const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'] as const;
const WRITE_THROTTLE_MS = 5_000;
const CHECK_INTERVAL_MS = 30_000;

let lastWrite = 0;

function recordActivity(): void {
  const now = Date.now();
  if (now - lastWrite < WRITE_THROTTLE_MS) return;
  lastWrite = now;
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
}

/** Call on every successful sign-in/connection so a stale timestamp left over from
 * a previous, possibly long-abandoned session doesn't immediately expire a brand
 * new one. */
export function resetIdleActivity(): void {
  lastWrite = Date.now();
  localStorage.setItem(LAST_ACTIVITY_KEY, String(lastWrite));
}

/** Starts idle tracking for the app's lifetime. Call once at startup; onTimeout
 * fires (possibly immediately, if the stored timestamp is already past due from
 * before this page load) whenever the idle clock exceeds timeoutMs. */
export function startIdleTimer(onTimeout: () => void, timeoutMs: number): void {
  if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
    resetIdleActivity();
  }

  ACTIVITY_EVENTS.forEach((evt) => document.addEventListener(evt, recordActivity, { passive: true }));

  function checkIdle(): void {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const last = raw ? Number(raw) : Date.now();
    if (Date.now() - last >= timeoutMs) {
      onTimeout();
    }
  }

  checkIdle();
  window.setInterval(checkIdle, CHECK_INTERVAL_MS);
}
