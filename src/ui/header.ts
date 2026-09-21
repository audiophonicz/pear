import { el } from './dom';
import { gearIcon, githubIcon, helpIcon, packageIcon } from './icons';
import { openSettingsModal } from './settingsModal';
import { openHelpModal } from './helpModal';

const GITHUB_URL = 'https://github.com/audiophonicz/pear';
const PACKAGE_URL = 'https://github.com/audiophonicz/pear/pkgs/container/pear';

function iconLink(icon: SVGSVGElement, href: string, label: string): HTMLAnchorElement {
  return el('a', { class: 'icon-btn', attrs: { href, target: '_blank', rel: 'noopener', 'aria-label': label } }, [icon]) as HTMLAnchorElement;
}

export function renderHeader(): HTMLElement {
  const settingsBtn = el('button', { class: 'icon-btn', attrs: { 'aria-label': 'Settings' } }, [gearIcon()]);
  settingsBtn.addEventListener('click', () => openSettingsModal());

  const helpBtn = el('button', { class: 'icon-btn', attrs: { 'aria-label': 'Help & About' } }, [helpIcon()]);
  helpBtn.addEventListener('click', () => openHelpModal());

  return el('header', { class: 'app-header' }, [
    el('div', { class: 'app-brand' }, [
      el('div', { class: 'app-logo-box' }, [el('img', { attrs: { src: '/favicon.svg', width: '22', height: '22', alt: '' } })]),
      el('span', { class: 'app-name', text: 'PEAR' }),
    ]),
    el('div', { class: 'app-header-actions' }, [
      settingsBtn,
      iconLink(packageIcon(), PACKAGE_URL, 'Container image'),
      iconLink(githubIcon(), GITHUB_URL, 'GitHub repository'),
      helpBtn,
    ]),
  ]);
}
