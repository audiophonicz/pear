import { buildAuthLink, checkPinLogin, startPinLogin } from '../plex/api';
import { getClientId, setAccountToken, setServer } from '../state/session';
import { el, statusBanner } from '../ui/dom';
import { checkServer } from '../plex/api';

interface LoginViewProps {
  onSignedIn: () => void;
  onManualServer: () => void;
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export function renderLoginView({ onSignedIn, onManualServer }: LoginViewProps): HTMLElement {
  const clientId = getClientId();
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let pollDeadline = 0;

  const statusArea = el('div', { class: 'status-area' });

  const signInButton = el('button', { class: 'btn btn-primary', text: 'Sign in with Plex' });
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

  // Manual connection: skip plex.tv entirely and talk straight to a server address + token.
  const urlInput = el('input', { class: 'input', attrs: { type: 'text', placeholder: 'http://192.168.1.50:32400', autocomplete: 'off' } }) as HTMLInputElement;
  const tokenInput = el('input', { class: 'input', attrs: { type: 'password', placeholder: 'X-Plex-Token', autocomplete: 'off' } }) as HTMLInputElement;
  const manualStatus = el('div', { class: 'status-area' });
  const manualButton = el('button', { class: 'btn btn-secondary', text: 'Connect' });

  manualButton.addEventListener('click', async () => {
    const url = urlInput.value.trim().replace(/\/$/, '');
    const token = tokenInput.value.trim();
    if (!url || !token) {
      manualStatus.replaceChildren(statusBanner('error', 'Server address and token are both required.'));
      return;
    }
    manualButton.disabled = true;
    manualStatus.replaceChildren(statusBanner('info', 'Connecting…'));
    try {
      await checkServer(url, clientId, token);
      setServer(url, url, token);
      manualButton.disabled = false;
      onManualServer();
    } catch (err) {
      manualButton.disabled = false;
      manualStatus.replaceChildren(statusBanner('error', `Could not reach that server: ${(err as Error).message}`));
    }
  });

  return el('div', { class: 'card login-card' }, [
    el('h1', { class: 'title', text: 'PEAR' }),
    el('p', { class: 'subtitle', text: 'Plex Entity AddedAt Relocator' }),
    el('div', { class: 'button-row' }, [signInButton, cancelButton]),
    statusArea,
    el('div', { class: 'divider', text: 'or connect manually' }),
    el('label', { class: 'field-label', text: 'Server address' }),
    urlInput,
    el('label', { class: 'field-label', text: 'Access token' }),
    tokenInput,
    manualButton,
    manualStatus,
  ]);
}
