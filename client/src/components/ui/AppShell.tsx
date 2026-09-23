import type { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { ToastHost } from './ToastHost';
import { SidebarNav } from './SidebarNav';
import { CommandPalette } from './CommandPalette';
import { StudioSettingsModal } from './StudioSettingsModal';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import type { User } from '../../types/domain';

export interface AppShellProps {
  user?: User | null;
  children: ReactNode;
  onLogout?: () => void;
}

/** Application chrome: TopNav + optional Sidebar + main + global toasts + command hub.
 *  Sources the signed-in user from the auth store unless overridden. */
export function AppShell({ user: userProp, children, onLogout: onLogoutProp }: AppShellProps) {
  const storeUser = useAuthStore((s) => s.user);
  const storeLogout = useAuthStore((s) => s.logout);
  const user = userProp !== undefined ? userProp : storeUser;
  const handleLogout = onLogoutProp ?? (() => void storeLogout());

  const searchOpen = useUiStore((s) => s.searchOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);

  return (
    <div className="min-h-screen bg-[color:var(--bg-canvas)] text-slate-900">
      <a
        href="#main"
        className="skip-link focus:left-2 focus:top-2"
        aria-label="Skip to main content"
      >
        Skip to content
      </a>

      {/* Top Bar Navigation */}
      <TopNav user={user ?? null} onLogout={handleLogout} />

      {/* Workspace Body: Sidebar + Main Area */}
      <div className="flex min-h-[calc(100vh-4rem)]">
        {user && <SidebarNav />}

        <main id="main" className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Command Palette (⌘K) & Studio Settings Modal */}
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <StudioSettingsModal />

      <ToastHost />
    </div>
  );
}
