import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAuthLink, checkServer, fetchSectionRecentlyAdded, fetchSections, relocateAddedAt } from './api';
import type { PlexPin } from './types';

function mockResponse(body: unknown, opts: { ok?: boolean; status?: number; statusText?: string } = {}) {
  const ok = opts.ok ?? true;
  const status = opts.status ?? (ok ? 200 : 500);
  return {
    ok,
    status,
    statusText: opts.statusText ?? (ok ? 'OK' : 'Internal Server Error'),
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('relocateAddedAt', () => {
  it('builds the PUT request with the correct type id, params, and credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(undefined, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await relocateAddedAt('http://plex.local:32400', '5', { ratingKey: '123', type: 'episode' }, 1700000000, 'client-abc', 'token-xyz');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(options).toMatchObject({ method: 'PUT' });
    const parsed = new URL(url as string);
    expect(parsed.pathname).toBe('/library/sections/5/all');
    expect(parsed.searchParams.get('type')).toBe('4'); // episode
    expect(parsed.searchParams.get('id')).toBe('123');
    expect(parsed.searchParams.get('addedAt.value')).toBe('1700000000');
    expect(parsed.searchParams.get('addedAt.locked')).toBe('1');
    expect(parsed.searchParams.get('X-Plex-Client-Identifier')).toBe('client-abc');
    expect(parsed.searchParams.get('X-Plex-Token')).toBe('token-xyz');
  });

  it('throws a descriptive error including status and body on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockResponse('section not found', { ok: false, status: 404, statusText: 'Not Found' })),
    );

    await expect(relocateAddedAt('http://plex.local:32400', '5', { ratingKey: '123', type: 'movie' }, 1700000000, 'c', 't')).rejects.toThrow(
      /Failed to update 123.*404.*Not Found.*section not found/s,
    );
  });

  it('resolves without throwing on a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(undefined, { ok: true })));

    await expect(
      relocateAddedAt('http://plex.local:32400', '5', { ratingKey: '123', type: 'season' }, 1700000000, 'c', 't'),
    ).resolves.toBeUndefined();
  });
});

describe('fetchSectionRecentlyAdded', () => {
  it("overrides each item's librarySectionID with the requested section id", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse({
          MediaContainer: {
            Metadata: [
              { ratingKey: '1', librarySectionID: 'wrong-id', type: 'episode', title: 'Ep 1', addedAt: 100 },
              { ratingKey: '2', librarySectionID: '', type: 'episode', title: 'Ep 2', addedAt: 200 },
            ],
          },
        }),
      ),
    );

    const items = await fetchSectionRecentlyAdded('http://plex.local:32400', 'requested-id', 'c', 't');

    expect(items).toHaveLength(2);
    expect(items.every((i) => i.librarySectionID === 'requested-id')).toBe(true);
  });

  it('sends the limit as the container size param', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ MediaContainer: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchSectionRecentlyAdded('http://plex.local:32400', '5', 'c', 't', 42);

    const [url] = fetchMock.mock.calls[0];
    const parsed = new URL(url as string);
    expect(parsed.searchParams.get('X-Plex-Container-Size')).toBe('42');
  });
});

describe('fetchSections', () => {
  it('filters out hidden libraries and non-movie/show library types', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse({
          MediaContainer: {
            Directory: [
              { key: '1', uuid: 'a', type: 'movie', title: 'Movies' },
              { key: '2', uuid: 'b', type: 'movie', title: 'Hidden Movies', hidden: 1 },
              { key: '3', uuid: 'c', type: 'artist', title: 'Music' },
              { key: '4', uuid: 'd', type: 'show', title: 'TV Shows' },
            ],
          },
        }),
      ),
    );

    const sections = await fetchSections('http://plex.local:32400', 'c', 't');

    expect(sections.map((s) => s.title)).toEqual(['Movies', 'TV Shows']);
  });

  it('filters out "Other Videos" libraries via the generic file scanner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse({
          MediaContainer: {
            Directory: [
              { key: '1', uuid: 'a', type: 'movie', title: 'Movies', scanner: 'Plex Movie' },
              { key: '2', uuid: 'b', type: 'movie', title: 'Home Videos', scanner: 'Plex Video Files Scanner' },
            ],
          },
        }),
      ),
    );

    const sections = await fetchSections('http://plex.local:32400', 'c', 't');

    expect(sections.map((s) => s.title)).toEqual(['Movies']);
  });
});

describe('buildAuthLink', () => {
  it('builds the exact auth URL with Plex Web device context', () => {
    const pin: PlexPin = { id: 1, code: 'ABCD', authToken: null, expiresAt: '2026-01-01' };

    const link = buildAuthLink(pin, 'client-123');

    expect(link).toBe('https://app.plex.tv/auth#?clientID=client-123&code=ABCD&context%5Bdevice%5D%5Bproduct%5D=Plex%20Web');
  });
});

describe('checkServer', () => {
  it('throws with the status and body when the server is unreachable or rejects the request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse('unauthorized', { ok: false, status: 401, statusText: 'Unauthorized' })));

    await expect(checkServer('http://plex.local:32400', 'c', 't')).rejects.toThrow(/401.*Unauthorized.*unauthorized/s);
  });
});
