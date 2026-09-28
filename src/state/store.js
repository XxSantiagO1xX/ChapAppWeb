/**
 * ChapApp - Estado Reactivo Centralizado (Store)
 */

import { CONFIG } from '../config.js';

const getInitialTheme = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(CONFIG.APP.STORAGE_KEYS.THEME) || CONFIG.APP.DEFAULT_THEME;
    }
  } catch (e) {}
  return CONFIG.APP.DEFAULT_THEME;
};

const getInitialTicketGuests = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('chapapp_ticket_guests');
      return raw ? JSON.parse(raw) : {};
    }
  } catch (e) {}
  return {};
};

class Store {
  constructor() {
    this.state = {
      theme: getInitialTheme(),
      events: [],
      activeEvent: null,
      activeEventTotals: null,
      activeDashboardTab: 'summary', // 'summary' | 'subfamilies' | 'expenses'
      selectedSubFamily: null,
      filterTab: 'active', // 'active' | 'archived' | 'all'
      searchQuery: '',
      isDrawerOpen: false,
      isSidebarCollapsed: true, // Inicia oculto / colapsado por defecto
      ticketGuests: getInitialTicketGuests(), // { [eventId]?: { [subFamilyName]: [{ id, name, category, weight, daysCount }] } }
      loading: true,
    };

    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    if (partialState.ticketGuests && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('chapapp_ticket_guests', JSON.stringify(partialState.ticketGuests));
      } catch (e) {}
    }
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
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CONFIG.APP.STORAGE_KEYS.THEME, nextTheme);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', nextTheme);
    }
    this.setState({ theme: nextTheme });
  }

  setTheme(theme) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CONFIG.APP.STORAGE_KEYS.THEME, theme);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    this.setState({ theme });
  }
}

export const store = new Store();
