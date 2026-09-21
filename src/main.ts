import './style.css';
import { getAccountToken, getServer } from './state/session';
import { applyMaxListItemsCssVar } from './state/settings';
import { renderLoginView } from './views/loginView';
import { renderServerPickerView } from './views/serverPickerView';
import { renderLibraryView } from './views/libraryView';
import { renderHeader } from './ui/header';
import { el, mount } from './ui/dom';

const root = document.querySelector<HTMLDivElement>('#app')!;
applyMaxListItemsCssVar();

const content = el('div', { class: 'app-content' });
const shell = el('div', { class: 'app-shell' }, [renderHeader(), content]);
mount(root, shell);

function showLogin(): void {
  content.replaceChildren(renderLoginView({ onSignedIn: showServerPicker, onManualServer: showLibrary }));
}

function showServerPicker(): void {
  content.replaceChildren(renderServerPickerView({ onConnected: showLibrary, onManualInstead: showLogin }));
}

function showLibrary(): void {
  content.replaceChildren(renderLibraryView({ onDisconnected: routeInitial }));
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
