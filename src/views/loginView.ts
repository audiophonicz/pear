import { buildAuthLink, checkPinLogin, checkServer, startPinLogin } from '../plex/api';
import { getClientId, setAccountToken, setServer } from '../state/session';
import { el, statusBanner } from '../ui/dom';

interface LoginViewProps {
  onSignedIn: () => void;
  onManualServer: () => void;
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const POPUP_WIDTH = 600;
const POPUP_HEIGHT = 700;

function openAuthPopup(link: string): Window | null {
  const left = window.screenX + Math.max(0, (window.outerWidth - POPUP_WIDTH) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - POPUP_HEIGHT) / 2);
  const features = `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;
  // Deliberately no "noopener" here (unlike most outbound links) so we can hold a
  // reference and close this popup ourselves once sign-in completes.
  return window.open(link, 'pear-plex-auth', features);
}

function renderPlexLoginPanel(onSignedIn: () => void): HTMLElement {
  const clientId = getClientId();
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let pollDeadline = 0;
  let authPopup: Window | null = null;

  const statusArea = el('div', { class: 'status-area' });
  const signInButton = el('button', { class: 'btn btn-primary btn-lg', text: 'Login with Plex' });
  const cancelButton = el('button', { class: 'btn btn-ghost hidden', text: 'Cancel' });

  const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    signInButton.classList.remove('hidden');
    cancelButton.classList.add('hidden');
    if (authPopup && !authPopup.closed) authPopup.close();
    authPopup = null;
  };

  signInButton.addEventListener('click', async () => {
    statusArea.replaceChildren();
    signInButton.classList.add('hidden');
    cancelButton.classList.remove('hidden');
    try {
      const pin = await startPinLogin(clientId);
      const link = buildAuthLink(pin, clientId);
      authPopup = openAuthPopup(link);
      if (!authPopup) {
        statusArea.replaceChildren(statusBanner('error', 'Pop-up was blocked. Allow pop-ups for this site and try again.'));
        stopPolling();
        return;
      }
      statusArea.replaceChildren(statusBanner('info', 'Waiting for you to finish signing in at plex.tv…'));

      pollDeadline = Date.now() + POLL_TIMEOUT_MS;
      pollTimer = setInterval(async () => {
        if (Date.now() > pollDeadline) {
          stopPolling();
          statusArea.replaceChildren(statusBanner('error', 'Sign-in timed out. Try again.'));
          return;
        }
        try {
          const token = await checkPinLogin(pin.id, clientId, pin.code);
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
