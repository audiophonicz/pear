import { buildAuthLink, checkPinLogin, checkServer, startPinLogin } from '../plex/api';
import { getClientId, setAccountToken, setServer } from '../state/session';
import { el, statusBanner } from '../ui/dom';

interface LoginViewProps {
  onSignedIn: () => void;
  onManualServer: () => void;
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

function renderPlexLoginPanel(onSignedIn: () => void): HTMLElement {
  const clientId = getClientId();
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let pollDeadline = 0;

  const statusArea = el('div', { class: 'status-area' });
  const signInButton = el('button', { class: 'btn btn-primary', text: 'Login with Plex' });
  const cancelButton = el('button', { class: 'btn btn-ghost hidden', text: 'Cancel' });

  const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    signInButton.classList.remove('hidden');
    cancelButton.classList.add('hidden');
  };

  signInButton.addEventListener('click', async () => {
    statusArea.replaceChildren();
    signInButton.classList.add('hidden');
    cancelButton.classList.remove('hidden');
    try {
      const pin = await startPinLogin(clientId);
      const link = buildAuthLink(pin, clientId);
      window.open(link, '_blank', 'noopener');
      statusArea.replaceChildren(statusBanner('info', 'Waiting for you to finish signing in at plex.tv…'));

      pollDeadline = Date.now() + POLL_TIMEOUT_MS;
      pollTimer = setInterval(async () => {
        if (Date.now() > pollDeadline) {
          stopPolling();
          statusArea.replaceChildren(statusBanner('error', 'Sign-in timed out. Try again.'));
          return;
        }
        try {
          const token = await checkPinLogin(pin.id, clientId);
          if (token) {
            stopPolling();
            setAccountToken(token);
            onSignedIn();
          }
        } catch (err) {
          stopPolling();
          statusArea.replaceChildren(statusBanner('error', `Sign-in check failed: ${(err as Error).message}`));
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      stopPolling();
      statusArea.replaceChildren(statusBanner('error', `Could not start sign-in: ${(err as Error).message}`));
    }
  });

  cancelButton.addEventListener('click', () => {
    stopPolling();
    statusArea.replaceChildren();
  });

  return el('div', { class: 'tab-panel tab-panel-center' }, [
    el('div', { class: 'button-row' }, [signInButton, cancelButton]),
    statusArea,
  ]);
}

function renderManualPanel(onConnected: () => void): HTMLElement {
  const clientId = getClientId();
  const urlInput = el('input', { class: 'input', attrs: { type: 'text', placeholder: 'http://192.168.1.10:32400', autocomplete: 'off' } }) as HTMLInputElement;
  const tokenInput = el('input', { class: 'input', attrs: { type: 'password', placeholder: 'X-Plex-Token', autocomplete: 'off' } }) as HTMLInputElement;
  const statusArea = el('div', { class: 'status-area' });
  const connectButton = el('button', { class: 'btn btn-secondary', text: 'Connect' });

  connectButton.addEventListener('click', async () => {
    const url = urlInput.value.trim().replace(/\/$/, '');
    const token = tokenInput.value.trim();
    if (!url || !token) {
      statusArea.replaceChildren(statusBanner('error', 'Server address and token are both required.'));
      return;
    }
    connectButton.disabled = true;
    statusArea.replaceChildren(statusBanner('info', 'Connecting…'));
    try {
      await checkServer(url, clientId, token);
      setServer(url, url, token);
      connectButton.disabled = false;
      onConnected();
    } catch (err) {
      connectButton.disabled = false;
      statusArea.replaceChildren(statusBanner('error', `Could not reach that server: ${(err as Error).message}`));
    }
  });

  return el('div', { class: 'tab-panel' }, [
    el('label', { class: 'field-label', text: 'Plex URL' }),
    urlInput,
    el('label', { class: 'field-label', text: 'Plex Token' }),
    tokenInput,
    connectButton,
    statusArea,
  ]);
}

export function renderLoginView({ onSignedIn, onManualServer }: LoginViewProps): HTMLElement {
  const plexTab = el('button', { class: 'tab-btn tab-active', text: 'Plex Login' });
  const manualTab = el('button', { class: 'tab-btn', text: 'Manual Connection' });

  const plexPanel = renderPlexLoginPanel(onSignedIn);
  const manualPanel = renderManualPanel(onManualServer);
  manualPanel.classList.add('hidden');

  plexTab.addEventListener('click', () => {
    plexTab.classList.add('tab-active');
    manualTab.classList.remove('tab-active');
    plexPanel.classList.remove('hidden');
    manualPanel.classList.add('hidden');
  });

  manualTab.addEventListener('click', () => {
    manualTab.classList.add('tab-active');
    plexTab.classList.remove('tab-active');
    manualPanel.classList.remove('hidden');
    plexPanel.classList.add('hidden');
  });

  return el('div', { class: 'card login-card' }, [
    el('div', { class: 'tab-row' }, [plexTab, manualTab]),
    plexPanel,
    manualPanel,
  ]);
}
