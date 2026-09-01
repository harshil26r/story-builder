import { create } from 'zustand';

export type ReadingMode = 'night' | 'paper';
export type ReaderMode = 'read' | 'edit';

interface UiState {
  darkMode: boolean;
  readingMode: ReadingMode;
  readerMode: ReaderMode;
  currentPage: number;
  toggleDarkMode(): void;
  setReadingMode(mode: ReadingMode): void;
  setReaderMode(mode: ReaderMode): void;
  setCurrentPage(page: number): void;
  nextPage(): void;
  prevPage(): void;
}

export const useUiStore = create<UiState>((set) => ({
  darkMode: true,
  readingMode: 'night',
  readerMode: 'read',
  currentPage: 0,

  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  setReadingMode: (mode) => set({ readingMode: mode }),
  setReaderMode: (mode) => set({ readerMode: mode }),
  setCurrentPage: (page) => set({ currentPage: page }),
  nextPage: () => set((s) => ({ currentPage: s.currentPage + 1 })),
  prevPage: () => set((s) => ({ currentPage: Math.max(0, s.currentPage - 1) })),
}));