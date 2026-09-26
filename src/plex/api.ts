// Talks directly to plex.tv and to a Plex Media Server from the browser.
// Plex's servers and plex.tv both allow authenticated cross-origin requests, so PEAR
// (like other browser-only Plex tools) never needs a backend of its own.
import type { PlexAccount, PlexDevice, PlexIdentity, PlexPin, PlexSection, RecentItem } from './types';

const ACCOUNTS_API = 'https://plex.tv/api/v2';

const APP_HEADERS = {
  'X-Plex-Product': 'PEAR',
  'X-Plex-Version': '0.1.0',
  'X-Plex-Platform': 'Web',
  'X-Plex-Device': 'Web',
  'X-Plex-Device-Name': 'PEAR (Web)',
  Accept: 'application/json',
};

function accountHeaders(clientId: string, token?: string): Record<string, string> {
  const headers: Record<string, string> = { ...APP_HEADERS, 'X-Plex-Client-Identifier': clientId };
  if (token) headers['X-Plex-Token'] = token;
  return headers;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? `: ${body}` : ''}`);
  }
  return res.json() as Promise<T>;
}

/** Starts an OAuth-style PIN login. The caller opens the returned link in a new tab. */
export async function startPinLogin(clientId: string): Promise<PlexPin> {
  const res = await fetch(`${ACCOUNTS_API}/pins`, {
    method: 'POST',
    headers: { ...accountHeaders(clientId), strong: 'true' },
  });
  return asJson<PlexPin>(res);
}

/**
 * The auth page's device-context product is deliberately "Plex Web", not our own
 * product name — Plex's confirmation page otherwise renders a permanent
 * "unable to complete this request" failure for third-party device contexts.
 * Our own X-Plex-Product header elsewhere still reports as PEAR.
 */
export function buildAuthLink(pin: PlexPin, clientId: string): string {
  return `https://app.plex.tv/auth#?clientID=${encodeURIComponent(clientId)}&code=${encodeURIComponent(pin.code)}&context%5Bdevice%5D%5Bproduct%5D=Plex%20Web`;
}

/** Polls a single time; caller is responsible for the interval/timeout loop. */
export async function checkPinLogin(pinId: number, clientId: string, code: string): Promise<string | null> {
  const res = await fetch(`${ACCOUNTS_API}/pins/${pinId}`, { headers: { ...accountHeaders(clientId), code } });
  const data = await asJson<PlexPin>(res);
  return data.authToken ?? null;
}

export async function fetchAccount(clientId: string, token: string): Promise<PlexAccount> {
  const res = await fetch(`${ACCOUNTS_API}/user`, { headers: accountHeaders(clientId, token) });
  return asJson<PlexAccount>(res);
}

export async function fetchDevices(clientId: string, token: string): Promise<PlexDevice[]> {
  const includeHttps = window.location.protocol === 'https:' ? 1 : 0;
  const url = `${ACCOUNTS_API}/resources?includeHttps=${includeHttps}&includeRelay=0`;
  const res = await fetch(url, { headers: accountHeaders(clientId, token) });
  const devices = await asJson<PlexDevice[]>(res);
  return devices.filter((d) => d.product === 'Plex Media Server');
}

// Direct Plex Media Server requests put credentials in the query string instead of headers
// to avoid a CORS preflight on top of the actual request.
function serverAuth(clientId: string, token: string): string {
  return new URLSearchParams({ 'X-Plex-Client-Identifier': clientId, 'X-Plex-Token': token }).toString();
}

export async function checkServer(baseUrl: string, clientId: string, token: string, signal?: AbortSignal): Promise<PlexIdentity> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/identity?${serverAuth(clientId, token)}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  const data = await asJson<{ MediaContainer: PlexIdentity }>(res);
  return data.MediaContainer;
}

export async function fetchSections(baseUrl: string, clientId: string, token: string): Promise<PlexSection[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/library/sections?${serverAuth(clientId, token)}`, {
    headers: { Accept: 'application/json' },
  });
  const data = await asJson<{ MediaContainer: { Directory?: PlexSection[] } }>(res);
  return (data.MediaContainer.Directory ?? []).filter((s) => {
    if (s.hidden) return false; // "Exclude from Home" library setting
    if (s.type !== 'movie' && s.type !== 'show') return false;
    // "Other Videos"/home-video libraries report type="movie" too (Plex has no
    // distinct type for them) but use the generic file scanner instead of the
    // real movie scanner -- exclude those from the Movies feed.
    if (s.type === 'movie' && /video files/i.test(s.scanner ?? '')) return false;
    return true;
  });
}

interface RawRecentEntry {
  ratingKey: string;
  librarySectionID: string;
  type: RecentItem['type'];
  title: string;
  parentTitle?: string;
  grandparentTitle?: string;
  year?: number;
  addedAt: number;
  originallyAvailableAt?: string;
  thumb?: string;
  parentThumb?: string;
  grandparentThumb?: string;
}

/**
 * Recently-added items for one library section — the same per-library data source
 * Plex's own Home dashboard hubs are built from. Fetching per-section (rather than
 * one combined server-wide feed) matters: a single shared/capped feed lets a busy
 * movie library crowd TV items out of the results entirely, even though they'd
 * still rank highly within their own library's recently-added list.
 */
export async function fetchSectionRecentlyAdded(
  baseUrl: string,
  sectionId: string,
  clientId: string,
  token: string,
  limit = 100,
): Promise<RecentItem[]> {
  const params = new URLSearchParams({
    'X-Plex-Container-Start': '0',
    'X-Plex-Container-Size': String(limit),
  });
  const url = `${baseUrl.replace(/\/$/, '')}/library/sections/${sectionId}/recentlyAdded?${params}&${serverAuth(clientId, token)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await asJson<{ MediaContainer: { Metadata?: RawRecentEntry[] } }>(res);
  const items = data.MediaContainer.Metadata ?? [];
  // Use the section we explicitly requested rather than trusting each item's own
  // librarySectionID from the response -- it's unambiguously correct here (we just
  // fetched this batch BY section id), whereas the field's reliability per item type
  // (season/episode entries in particular) isn't guaranteed, and relocateAddedAt
  // builds its PUT URL path directly from this value: a missing/wrong one there
  // produces a malformed request path and a generic 404 from the server.
  return items.map((item) => ({ ...item, librarySectionID: sectionId }));
}

const METADATA_TYPE_ID: Record<RecentItem['type'], number> = {
  movie: 1,
  show: 2,
  season: 3,
  episode: 4,
};

/**
 * Rewrites an item's addedAt via the same "edit field" endpoint Plex Web uses when you
 * manually correct a date in the metadata editor, then locks the field so a future
 * library scan won't revert it.
 */
export async function relocateAddedAt(
  baseUrl: string,
  sectionId: string,
  item: Pick<RecentItem, 'ratingKey' | 'type'>,
  newAddedAtEpochSeconds: number,
  clientId: string,
  token: string,
): Promise<void> {
  const params = new URLSearchParams({
    type: String(METADATA_TYPE_ID[item.type]),
    id: item.ratingKey,
    'addedAt.value': String(newAddedAtEpochSeconds),
    'addedAt.locked': '1',
    'X-Plex-Client-Identifier': clientId,
    'X-Plex-Token': token,
  });
  const url = `${baseUrl.replace(/\/$/, '')}/library/sections/${sectionId}/all?${params}`;
  const res = await fetch(url, { method: 'PUT' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to update ${item.ratingKey}: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`);
  }
}
