import './style.css';
import { getAccountToken, getServer } from './state/session';
import { renderLoginView } from './views/loginView';
import { renderServerPickerView } from './views/serverPickerView';
import { renderLibraryView } from './views/libraryView';
import { mount } from './ui/dom';

const root = document.querySelector<HTMLDivElement>('#app')!;

function showLogin(): void {
  mount(root, renderLoginView({ onSignedIn: showServerPicker, onManualServer: showLibrary }));
}

function showServerPicker(): void {
  mount(root, renderServerPickerView({ onConnected: showLibrary, onManualInstead: showLogin }));
}

function showLibrary(): void {
  mount(root, renderLibraryView({ onDisconnected: routeInitial }));
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
