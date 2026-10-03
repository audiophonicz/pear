import './style.css';
import { clearServer, getAccountToken, getServer, signOut } from './state/session';
import { resetIdleActivity, startIdleTimer } from './state/idleTimer';
import { renderLoginView } from './views/loginView';
import { renderServerPickerView } from './views/serverPickerView';
import { renderLibraryView } from './views/libraryView';
import { renderHeader } from './ui/header';
import { el, mount } from './ui/dom';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

const root = document.querySelector<HTMLDivElement>('#app')!;

let activeView: 'login' | 'picker' | 'library' | null = null;

const content = el('div', { class: 'app-content' });
const header = renderHeader({
  onChangeServer: () => {
    clearServer();
    showServerPicker();
  },
  onLogout: () => {
    signOut();
    showLogin();
  },
  onSettingsChanged: () => {
    // Only the library view's fetch depth is settings-driven right now; re-mounting
    // it re-fetches with the new value instead of requiring a page refresh.
    if (activeView === 'library') showLibrary();
  },
});
const shell = el('div', { class: 'app-shell' }, [header.element, content]);
mount(root, shell);

function showLogin(): void {
  activeView = 'login';
  content.replaceChildren(renderLoginView({ onSignedIn: showServerPicker, onManualServer: showLibrary }));
  header.refresh();
}

function showServerPicker(): void {
  resetIdleActivity();
  activeView = 'picker';
  content.replaceChildren(renderServerPickerView({ onConnected: showLibrary, onManualInstead: showLogin }));
  header.refresh();
}

function showLibrary(): void {
  resetIdleActivity();
  activeView = 'library';
  content.replaceChildren(renderLibraryView());
  header.refresh();
}

function routeInitial(): void {
  if (getServer()) {
    showLibrary();
  } else if (getAccountToken()) {
    showServerPicker();
  } else {
    showLogin();
  }
}

startIdleTimer(() => {
  if (getAccountToken() || getServer()) {
    signOut();
    showLogin();
  }
}, IDLE_TIMEOUT_MS);

routeInitial();
