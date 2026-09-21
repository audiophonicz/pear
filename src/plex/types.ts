// Minimal typings for the slice of the Plex API surface PEAR touches.
// Plex's API returns far more fields than these; only what we read/write is modeled.

export interface PlexPin {
  id: number;
  code: string;
  authToken: string | null;
  expiresAt: string;
}

export interface PlexAccount {
  id: number;
  uuid: string;
  username: string;
  email: string;
  title: string;
  thumb: string;
}

export interface PlexConnection {
  protocol: 'http' | 'https';
  address: string;
  port: number;
  uri: string;
  local: boolean;
  relay: boolean;
}

export interface PlexDevice {
  name: string;
  product: string;
  productVersion: string;
  clientIdentifier: string;
  accessToken: string;
  owned: boolean;
  presence: boolean;
  publicAddress: string;
  connections: PlexConnection[];
}

export interface PlexIdentity {
  machineIdentifier: string;
  version: string;
}

export interface PlexSection {
  key: string;
  uuid: string;
  type: 'movie' | 'show' | 'artist' | 'photo';
  title: string;
}

/** One row of /library/recentlyAdded, normalized to what PEAR needs to render + relocate. */
export interface RecentItem {
  ratingKey: string;
  librarySectionID: string;
  /** Plex metadata type: 1=movie 2=show 3=season 4=episode */
  type: 'movie' | 'show' | 'season' | 'episode';
  title: string;
  parentTitle?: string;
  grandparentTitle?: string;
  year?: number;
  addedAt: number;
  thumb?: string;
}
