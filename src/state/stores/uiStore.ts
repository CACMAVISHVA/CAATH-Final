import { createStore } from '../core/createStore';

type UIState = {
  activeTab: string;
  isSearchOpen: boolean;
};

export const uiStore = createStore<UIState>({
  activeTab: 'dashboard',
  isSearchOpen: false,
});
