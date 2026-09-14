import { Link } from 'react-router-dom';
import { BookOpen, LogOut, Moon, Sun } from 'lucide-react';
import type { User } from '../../types/domain';
import { useUiStore } from '../../store/uiStore';

export interface NavItem {
  label: string;
  to: string;
}

export interface TopNavProps {
  user: User | null;
  onLogout?: () => void;
  navItems?: NavItem[];
}

const DEFAULT_ITEMS: NavItem[] = [
  { label: 'Stories', to: '/' },
  { label: 'Characters', to: '/characters' },
];

export function TopNav({ user, onLogout, navItems = DEFAULT_ITEMS }: TopNavProps) {
  const darkMode = useUiStore((s) => s.darkMode);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--surface-1-border)] bg-[color:var(--surface-1)]/80 backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md font-semibold tracking-tight text-slate-100 transition-colors duration-200 hover:text-indigo-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
        >
          <BookOpen className="h-5 w-5 text-indigo-400" aria-hidden="true" />
          <span className="hidden sm:inline">Story Builder</span>
        </Link>

        <div className="ml-4 flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-1.5 text-sm text-slate-400 transition-colors duration-200 hover:bg-slate-800/60 hover:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-md p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-800/60 hover:text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5" aria-hidden="true" /> : <Moon className="h-4.5 w-4.5" aria-hidden="true" />}
          </button>
          {user ? (
            <span className="hidden items-center gap-2 text-sm text-slate-300 sm:flex" data-testid="user-name">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700/60 text-xs font-semibold text-slate-200">
                {user.name.charAt(0).toUpperCase()}
              </span>
              {user.name}
            </span>
          ) : null}
          {user && onLogout ? (
            <button
              onClick={onLogout}
              aria-label="Logout"
              className="rounded-md p-2 text-slate-400 transition-colors duration-200 hover:bg-rose-500/10 hover:text-rose-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
            >
              <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          ) : (
            <Link
              to="/auth/login"
              className="rounded-md px-3 py-1.5 text-sm text-slate-300 transition-colors duration-200 hover:bg-slate-800/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}