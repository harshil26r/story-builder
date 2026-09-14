import type { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { ToastHost } from './ToastHost';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types/domain';

export interface AppShellProps {
  user?: User | null;
  children: ReactNode;
  onLogout?: () => void;
}

/** Application chrome: TopNav + main + global toasts.
 *  Sources the signed-in user from the auth store unless overridden. */
export function AppShell({ user: userProp, children, onLogout: onLogoutProp }: AppShellProps) {
  const storeUser = useAuthStore((s) => s.user);
  const storeLogout = useAuthStore((s) => s.logout);
  const user = userProp !== undefined ? userProp : storeUser;
  const handleLogout = onLogoutProp ?? (() => void storeLogout());
  return (
    <div className="min-h-screen bg-[color:var(--bg-canvas)] text-slate-200">
      <a href="#main" className="skip-link focus:left-2 focus:top-2" aria-label="Skip to main content">
        Skip to content
      </a>
      <TopNav user={user ?? null} onLogout={handleLogout} />
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <ToastHost />
    </div>
  );
}