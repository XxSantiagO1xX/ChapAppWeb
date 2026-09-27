/**
 * ChapApp - Estado Reactivo Centralizado (Store)
 */

import { CONFIG } from '../config.js';

class Store {
  constructor() {
    this.state = {
      theme: localStorage.getItem(CONFIG.APP.STORAGE_KEYS.THEME) || CONFIG.APP.DEFAULT_THEME,
      events: [],
      activeEvent: null,
      activeEventTotals: null,
      activeDashboardTab: 'summary', // 'summary' | 'subfamilies' | 'expenses'
      selectedSubFamily: null,
      filterTab: 'active', // 'active' | 'archived' | 'all'
      searchQuery: '',
      isDrawerOpen: false,
      loading: true,
    };

    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  toggleTheme() {
    const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(CONFIG.APP.STORAGE_KEYS.THEME, nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    this.setState({ theme: nextTheme });
  }

  setTheme(theme) {
    localStorage.setItem(CONFIG.APP.STORAGE_KEYS.THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.setState({ theme });
  }
}

export const store = new Store();
