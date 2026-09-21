import { checkServer, fetchDevices } from '../plex/api';
import type { PlexConnection, PlexDevice } from '../plex/types';
import { getClientId, getPreferLocal, setPreferLocal, getAccountToken, setServer } from '../state/session';
import { el, statusBanner } from '../ui/dom';

interface ServerPickerProps {
  onConnected: () => void;
  onManualInstead: () => void;
}

function sortConnections(connections: PlexConnection[], preferLocal: boolean): PlexConnection[] {
  const usableProtocol = window.location.protocol === 'https:' ? 'https' : connections[0]?.protocol ?? 'http';
  const usable = connections.filter((c) => (window.location.protocol === 'https:' ? c.protocol === 'https' : true) || c.protocol === usableProtocol);
  return [...usable].sort((a, b) => {
    if (a.local === b.local) return 0;
    if (preferLocal) return a.local ? -1 : 1;
    return a.local ? 1 : -1;
  });
}

/** Races every candidate connection for a server and resolves with the first that answers /identity. */
async function raceConnections(device: PlexDevice, clientId: string, preferLocal: boolean): Promise<string | null> {
  const candidates = sortConnections(device.connections, preferLocal);
  if (candidates.length === 0) return null;

  const controllers = candidates.map(() => new AbortController());
  const attempts = candidates.map(async (conn, i) => {
    try {
      await checkServer(conn.uri, clientId, device.accessToken, controllers[i].signal);
      controllers.forEach((c, j) => j !== i && c.abort());
      return conn.uri;
    } catch {
      return null;
    }
  });
  const results = await Promise.all(attempts);
  return results.find((uri): uri is string => uri !== null) ?? null;
}

export function renderServerPickerView({ onConnected, onManualInstead }: ServerPickerProps): HTMLElement {
  const clientId = getClientId();
  const token = getAccountToken();

  const listEl = el('div', { class: 'server-list' }, [el('div', { class: 'spinner' })]);
  const statusArea = el('div', { class: 'status-area' });

  const preferLocalCheckbox = el('input', { attrs: { type: 'checkbox', id: 'preferLocal' } }) as HTMLInputElement;
  preferLocalCheckbox.checked = getPreferLocal();
  preferLocalCheckbox.addEventListener('change', () => setPreferLocal(preferLocalCheckbox.checked));

  const manualLink = el('button', { class: 'btn btn-ghost', text: 'Enter a server address manually instead' });
  manualLink.addEventListener('click', onManualInstead);

  const container = el('div', { class: 'card picker-card' }, [
    el('h2', { class: 'title', text: 'Select a Plex Server' }),
    listEl,
    el('label', { class: 'checkbox-row' }, [preferLocalCheckbox, el('span', { text: 'Prefer Local Address' })]),
    statusArea,
    manualLink,
  ]);

  if (!token) {
    statusArea.replaceChildren(statusBanner('error', 'No account token found. Please sign in again.'));
    return container;
  }

  fetchDevices(clientId, token)
    .then((devices) => {
      if (devices.length === 0) {
        listEl.replaceChildren(el('p', { class: 'muted', text: 'No servers found on this Plex account.' }));
        return;
      }
      const rows = devices.map((device) => {
        const row = el('button', { class: 'server-row', attrs: { type: 'button' } }, [
          el('span', { class: 'server-name', text: device.name }),
          el('span', { class: 'server-version', text: device.productVersion }),
        ]) as HTMLButtonElement;
        row.addEventListener('click', async () => {
          row.disabled = true;
          statusArea.replaceChildren(statusBanner('info', `Connecting to ${device.name}…`));
          const uri = await raceConnections(device, clientId, preferLocalCheckbox.checked);
          row.disabled = false;
          if (!uri) {
            statusArea.replaceChildren(statusBanner('error', `Could not reach ${device.name} on any known address.`));
            return;
          }
          setServer(uri, device.name, device.accessToken);
          onConnected();
        });
        return row;
      });
      listEl.replaceChildren(...rows);
    })
    .catch((err) => {
      listEl.replaceChildren();
      statusArea.replaceChildren(statusBanner('error', `Failed to load servers: ${(err as Error).message}`));
    });

  return container;
}
