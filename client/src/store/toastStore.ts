import { create } from 'zustand';

export type ToastKind = 'info' | 'error' | 'success';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

const AUTO_DISMISS_MS = 4000;

interface ToastState {
  toasts: Toast[];
  push(message: string, kind?: ToastKind): void;
  dismiss(id: number): void;
}

let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (message, kind = 'info') => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, message, kind }] }));
    const timer = setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
    timers.set(id, timer);
  },

  dismiss: (id) => {
    const t = timers.get(id);
    if (t) clearTimeout(t);
    timers.delete(id);
    set((s) => ({ toasts: s.toasts.filter((toast) => toast.id !== id) }));
  },
}));
