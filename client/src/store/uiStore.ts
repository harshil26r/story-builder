import { create } from 'zustand';

export type ReadingMode = 'night' | 'paper';
export type ReaderMode = 'read' | 'edit';

export interface UiState {
  darkMode: boolean;
  readingMode: ReadingMode;
  readerMode: ReaderMode;
  currentPage: number;
  sidebarCollapsed: boolean;
  searchOpen: boolean;
  settingsOpen: boolean;
  toggleDarkMode(): void;
  setReadingMode(mode: ReadingMode): void;
  setReaderMode(mode: ReaderMode): void;
  setCurrentPage(page: number): void;
  nextPage(): void;
  prevPage(): void;
  toggleSidebar(): void;
  setSidebarCollapsed(collapsed: boolean): void;
  setSearchOpen(open: boolean): void;
  setSettingsOpen(open: boolean): void;
}

function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

if (typeof document !== 'undefined') {
  try {
    const initial = getInitialDarkMode();
    document.documentElement.classList.toggle('dark', initial);
  } catch {
    // ignore
  }
}

export const useUiStore = create<UiState>((set) => ({
  darkMode: typeof document !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : getInitialDarkMode(),
  readingMode: 'paper',
  readerMode: 'read',
  currentPage: 0,
  sidebarCollapsed: false,
  searchOpen: false,
  settingsOpen: false,

  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next);
      }
      try {
        localStorage.setItem('theme', next ? 'dark' : 'light');
      } catch {
        // ignore
      }
      return { darkMode: next };
    }),
  setReadingMode: (mode) => set({ readingMode: mode }),
  setReaderMode: (mode) => set({ readerMode: mode }),
  setCurrentPage: (page) => set({ currentPage: page }),
  nextPage: () => set((s) => ({ currentPage: s.currentPage + 1 })),
  prevPage: () => set((s) => ({ currentPage: Math.max(0, s.currentPage - 1) })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));
