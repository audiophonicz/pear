import { el } from './dom';
import { openModal } from './modal';

const REPO_ISSUES_URL = 'https://github.com/audiophonicz/pear/issues';
const PASTA_URL = 'https://github.com/cglatot/pasta';

function link(text: string, href: string): HTMLAnchorElement {
  return el('a', { text, attrs: { href, target: '_blank', rel: 'noopener' } }) as HTMLAnchorElement;
}

export function openHelpModal(): void {
  const body = el('div', { class: 'help-body' }, [
    el('p', {}, [
      el('span', { text: 'Found a bug or have a feature request? Log it here: ' }),
      link(REPO_ISSUES_URL, REPO_ISSUES_URL),
    ]),

    el('h3', { text: 'What is PEAR?' }),
    el(
      'p',
      {
        text:
          "Plex's Recently Added hub is great until you bulk-import a backlog, rescan a " +
          'reorganized library, or fix metadata on old media — suddenly everything looks ' +
          "brand new. PEAR lets you sign in to Plex, browse what's currently Recently " +
          "Added, select the items that don't belong there, and push their added date " +
          'back — by a number of days or to an exact date — so they drop out of the hub ' +
          'without touching the actual media file.',
      },
    ),

    el('h3', { text: 'How do I use PEAR?' }),
    el('ul', {}, [
      el('li', { text: 'Sign in with your Plex account, or connect to a server manually if you already have its address and an access token.' }),
      el('li', { text: "This runs much faster on the same network as your Plex server, same as most browser-based Plex tools." }),
      el('li', { text: 'Select one or more items, choose a relocate mode, and apply — the change is made directly on your Plex server.' }),
    ]),

    el('h3', { text: 'About PEAR' }),
    el('p', {}, [
      el('span', { text: 'PEAR (Plex Entity AddedAt Relocator) is a companion to ' }),
      link('PASTA', PASTA_URL),
      el('span', {
        text:
          ", another browser-based Plex tool. PEAR runs entirely client-side — it talks " +
          "directly to plex.tv and your Plex server, the same way Plex Web does, so " +
          'nothing about your library passes through a third party.',
      }),
    ]),
    el('p', {
      text:
        'Your sign-in token and server connection are kept in this browser\'s local ' +
        'storage only — nothing is set as a cookie, and nothing is synced anywhere else.',
    }),

    el('div', { class: 'help-footer' }, [
      el('button', { class: 'btn btn-primary', text: 'Close', attrs: { 'data-close': 'true' } }),
    ]),
  ]);

  const close = openModal('Help & About', body);
  body.querySelector('[data-close]')?.addEventListener('click', close);
}
