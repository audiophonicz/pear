// Persists everything PEAR needs to remember between page loads in localStorage.
// There is no backend, so this *is* the session store.

const KEYS = {
  clientId: 'pear.clientId',
  accountToken: 'pear.accountToken',
  serverUrl: 'pear.serverUrl',
  serverName: 'pear.serverName',
  serverToken: 'pear.serverToken',
  preferLocal: 'pear.preferLocal',
} as const;

function randomId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID();
  // Fallback for non-secure-context browsers without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getClientId(): string {
  let id = localStorage.getItem(KEYS.clientId);
  if (!id) {
    id = `PEAR-${randomId()}`;
    localStorage.setItem(KEYS.clientId, id);
  }
  return id;
}

export function getAccountToken(): string | null {
  return localStorage.getItem(KEYS.accountToken);
}

export function setAccountToken(token: string): void {
  localStorage.setItem(KEYS.accountToken, token);
}

export function getServer(): { url: string; name: string; token: string } | null {
  const url = localStorage.getItem(KEYS.serverUrl);
  const name = localStorage.getItem(KEYS.serverName);
  const token = localStorage.getItem(KEYS.serverToken);
  if (!url || !token) return null;
  return { url, name: name ?? url, token };
}

export function setServer(url: string, name: string, token: string): void {
  localStorage.setItem(KEYS.serverUrl, url);
  localStorage.setItem(KEYS.serverName, name);
  localStorage.setItem(KEYS.serverToken, token);
}

export function clearServer(): void {
  localStorage.removeItem(KEYS.serverUrl);
  localStorage.removeItem(KEYS.serverName);
  localStorage.removeItem(KEYS.serverToken);
}

export function getPreferLocal(): boolean {
  return localStorage.getItem(KEYS.preferLocal) === '1';
}

export function setPreferLocal(value: boolean): void {
  if (value) localStorage.setItem(KEYS.preferLocal, '1');
  else localStorage.removeItem(KEYS.preferLocal);
}

export function signOut(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
