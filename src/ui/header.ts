import { el } from './dom';
import { chevronDownIcon, dockerWhaleIcon, gearIcon, githubIcon, helpIcon, logoutIcon, serversIcon } from './icons';
import { openSettingsModal } from './settingsModal';
import { openHelpModal } from './helpModal';
import { fetchAccount } from '../plex/api';
import { getAccountToken, getAccountUsername, getClientId, getServer, setAccountUsername } from '../state/session';

const GITHUB_URL = 'https://github.com/audiophonicz/pear';
// TODO: point at the actual image registry page once one is set up; hub.docker.com
// itself for now since there's no published image there yet.
const DOCKER_URL = 'https://hub.docker.com';

function iconLink(icon: SVGSVGElement, href: string, label: string): HTMLAnchorElement {
  return el('a', { class: 'icon-btn', attrs: { href, target: '_blank', rel: 'noopener', 'aria-label': label } }, [icon]) as HTMLAnchorElement;
}

export interface HeaderApi {
  element: HTMLElement;
  /** Re-checks session state (signed in? which account?) and updates the account badge. */
  refresh: () => void;
}

interface HeaderOpts {
  onChangeServer: () => void;
  onLogout: () => void;
  onSettingsChanged?: () => void;
}

function renderAccountArea({ onChangeServer, onLogout }: HeaderOpts): { wrap: HTMLElement; refresh: () => void } {
  const avatar = el('div', { class: 'account-avatar' });
  const nameEl = el('span', { class: 'account-name' });
  const toggle = el('button', { class: 'account-toggle hidden', attrs: { type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false' } }, [
    avatar,
    nameEl,
    chevronDownIcon(),
  ]);

  const changeServerBtn = el('button', { class: 'dropdown-item', attrs: { type: 'button' } }, [serversIcon(), el('span', { text: 'Change Server' })]);
  const logoutLabel = el('span', { text: 'Logout' });
  const logoutBtn = el('button', { class: 'dropdown-item', attrs: { type: 'button' } }, [logoutIcon(), logoutLabel]);
  const menu = el('div', { class: 'account-menu hidden' }, [changeServerBtn, logoutBtn]);
  const wrap = el('div', { class: 'account-wrap' }, [toggle, menu]);

  const closeMenu = () => {
    menu.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    toggle.setAttribute('aria-expanded', String(willOpen));
  });
  menu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', closeMenu);

  changeServerBtn.addEventListener('click', () => {
    closeMenu();
    onChangeServer();
  });
  logoutBtn.addEventListener('click', () => {
    closeMenu();
    onLogout();
  });

  function applyBadge(label: string): void {
    avatar.textContent = label.charAt(0).toUpperCase();
    nameEl.textContent = label;
    toggle.classList.remove('hidden');
  }

  function refresh(): void {
    const token = getAccountToken();
    if (token) {
      changeServerBtn.classList.remove('hidden');
      logoutLabel.textContent = 'Logout';
      const cached = getAccountUsername();
      if (cached) {
        applyBadge(cached);
        return;
      }
      fetchAccount(getClientId(), token)
        .then((account) => {
          const username = account.username || account.title || account.email || 'Account';
          setAccountUsername(username);
          applyBadge(username);
        })
        .catch(() => {
          // Token may be stale; leave the badge hidden rather than erroring the whole header.
        });
      return;
    }

    // No Plex account -- but a manually-connected server still needs a way to
    // disconnect. There's no account to list other servers under, so no
    // "Change Server" option here, just a straight disconnect.
    const server = getServer();
    if (server) {
      changeServerBtn.classList.add('hidden');
      logoutLabel.textContent = 'Disconnect';
      applyBadge(server.name || 'Manual connection');
      return;
    }

    toggle.classList.add('hidden');
    closeMenu();
  }

  return { wrap, refresh };
}

export function renderHeader(opts: HeaderOpts): HeaderApi {
  const account = renderAccountArea(opts);

  const settingsBtn = el('button', { class: 'icon-btn', attrs: { 'aria-label': 'Settings' } }, [gearIcon()]);
  settingsBtn.addEventListener('click', () => openSettingsModal(opts.onSettingsChanged));

  const helpBtn = el('button', { class: 'icon-btn', attrs: { 'aria-label': 'Help & About' } }, [helpIcon()]);
  helpBtn.addEventListener('click', () => openHelpModal());

  const element = el('header', { class: 'app-header' }, [
    el('div', { class: 'app-brand' }, [
      el('div', { class: 'app-logo-box' }, [el('img', { attrs: { src: '/favicon.svg', width: '33', height: '33', alt: '' } })]),
      el('span', { class: 'app-name', text: 'PEAR' }),
    ]),
    el('div', { class: 'app-header-actions' }, [
      account.wrap,
      settingsBtn,
      iconLink(dockerWhaleIcon(), DOCKER_URL, 'Docker Hub'),
      iconLink(githubIcon(), GITHUB_URL, 'GitHub repository'),
      helpBtn,
    ]),
  ]);

  return { element, refresh: account.refresh };
}
