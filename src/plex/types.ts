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
  /** e.g. "Plex Movie" vs "Plex Video Files Scanner" -- distinguishes a real Movies
   * library from an "Other Videos"/home-video library, since Plex reports both as
   * type="movie" with no dedicated type of its own for the latter. */
  scanner?: string;
  /** The "Exclude from Home" library setting: 1 = hidden from dashboard/home. */
  hidden?: number;
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
  /** Episode number within its season, for an episode-type item. */
  index?: number;
  /** Season number, for an episode-type item (its own season/parent's index). */
  parentIndex?: number;
  /** Original release/air date, "YYYY-MM-DD", from Plex's own agent match. Absent for
   * unmatched (personal media) items, and not reliably present on season-type items. */
  originallyAvailableAt?: string;
  /** This item's own thumbnail (an episode's screencap, not its show's poster). */
  thumb?: string;
  /** Season's poster — the show's poster, for a season-type item. */
  parentThumb?: string;
  /** Show's poster, for an episode-type item (its parent is the season, not the show). */
  grandparentThumb?: string;
}
