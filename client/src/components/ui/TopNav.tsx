import { Link } from 'react-router-dom';
import {
  BookOpen,
  LogOut,
  Moon,
  Sun,
  Search,
  Bell,
  ChevronDown,
  Menu,
  Sparkles,
} from 'lucide-react';
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
  { label: 'Explore', to: '/explore' },
  { label: 'Characters', to: '/characters' },
];

export function TopNav({ user, onLogout, navItems = DEFAULT_ITEMS }: TopNavProps) {
  const darkMode = useUiStore((s) => s.darkMode);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
      >
        {/* Left: Hamburger + Logo + Workspace Selector */}
        <div className="flex items-center gap-3 lg:gap-4">
          {user && (
            <button
              onClick={toggleSidebar}
              aria-label="Toggle navigation menu"
              className="rounded-lg p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 shadow-sm"
            >
              <BookOpen className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-semibold tracking-tight text-slate-900 transition-colors duration-200 hover:text-indigo-600">
                Story Writer
              </span>
              <span className="hidden rounded bg-indigo-50 px-1.5 py-0.5 text-[0.625rem] font-bold tracking-wider text-indigo-700 sm:inline-block border border-indigo-200/60">
                AI
              </span>
            </div>
          </Link>

          {/* Voni AI Style Workspace Selector Dropdown Pill */}
          {user && (
            <div className="hidden items-center md:flex">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition-colors hover:border-slate-300">
                <span className="text-slate-500">Workspace:</span>
                <span className="max-w-[160px] truncate font-medium text-slate-900">
                  {user.name}&apos;s Studio
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          )}

          {/* Primary Nav links */}
          <div className="hidden items-center gap-1 xl:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Center: Omnisearch / Command Palette Trigger */}
        {user && (
          <div className="mx-2 max-w-md flex-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Search className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                <span className="truncate">Search stories, characters, chapters, logs...</span>
              </div>
              <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[0.625rem] text-slate-500 sm:inline-block shadow-xs">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Right: Language Pill, Notifications, Dark mode, Profile, Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* US English Pill from Voni AI */}
          <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 md:flex">
            <span aria-hidden="true">🇺🇸</span>
            <span className="font-medium">US English</span>
          </div>

          {/* Notification bell with indicator */}
          {user && (
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-lg p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <Bell className="h-4.5 w-4.5" aria-hidden="true" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            </button>
          )}

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-lg p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {darkMode ? (
              <Sun className="h-4.5 w-4.5" aria-hidden="true" />
            ) : (
              <Moon className="h-4.5 w-4.5" aria-hidden="true" />
            )}
          </button>

          {/* User Profile Badge */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 sm:pl-2">
              <span
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-1.5 pr-2.5 text-xs text-slate-700"
                data-testid="user-name"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-xs font-semibold text-white shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div className="hidden flex-col text-left sm:flex">
                  <span className="max-w-[120px] truncate font-medium text-slate-900">
                    {user.name}
                  </span>
                  <span className="text-[0.625rem] text-slate-500">Workspace Owner</span>
                </div>
              </span>

              {onLogout && (
                <button
                  onClick={onLogout}
                  aria-label="Logout"
                  className="rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  title="Log out"
                >
                  <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <Link
              to="/auth/login"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
