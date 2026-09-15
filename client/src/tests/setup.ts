import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.cookie.split(';').forEach((c) => {
    const [name] = c.trim().split('=');
    if (name) document.cookie = `${name}=; Max-Age=-99999999; path=/`;
  });
});

// jsdom lacks matchMedia — provide a stub used by framer-motion.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// ResizeObserver stub for framer-motion / layout effects.
if (!('ResizeObserver' in window)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverStub,
  });
}

// scrollIntoView stub
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// jsdom in this Node version exposes window.localStorage as undefined unless
// a storage file is configured. Provide a minimal in-memory Storage so the
// afterEach cleanup (and any store using storage) won't crash.
function createMemoryStorage(): Storage {
  let store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store = new Map();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

if (!window.localStorage) {
  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: createMemoryStorage(),
  });
}
if (!window.sessionStorage) {
  Object.defineProperty(window, 'sessionStorage', {
    writable: true,
    value: createMemoryStorage(),
  });
}

// PointerEvent stub (framer-motion gestures)
if (!window.PointerEvent) {
  Object.defineProperty(window, 'PointerEvent', { writable: true, value: Event });
}