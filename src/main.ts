import './style.css';
import { clearServer, getAccountToken, getServer, signOut } from './state/session';
import { renderLoginView } from './views/loginView';
import { renderServerPickerView } from './views/serverPickerView';
import { renderLibraryView } from './views/libraryView';
import { renderHeader } from './ui/header';
import { el, mount } from './ui/dom';

const root = document.querySelector<HTMLDivElement>('#app')!;

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
});
const shell = el('div', { class: 'app-shell' }, [header.element, content]);
mount(root, shell);

function showLogin(): void {
  content.replaceChildren(renderLoginView({ onSignedIn: showServerPicker, onManualServer: showLibrary }));
  header.refresh();
}

function showServerPicker(): void {
  content.replaceChildren(renderServerPickerView({ onConnected: showLibrary, onManualInstead: showLogin }));
  header.refresh();
}

function showLibrary(): void {
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

routeInitial();
