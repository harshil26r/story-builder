import { useLocation, Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  BookPlus,
  GitBranch,
  BarChart3,
  Mic,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useStoryStore } from '../../store/storyStore';

export function SidebarNav() {
  const location = useLocation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const stories = useStoryStore((s) => s.stories);

  const totalWords = stories.reduce((acc, s) => acc + (s.wordCount || 0), 0);
  const totalChapters = stories.reduce((acc, s) => acc + (s.totalChapters || 0), 0);

  const navItems = [
    {
      label: 'Overview',
      to: '/',
      icon: BookOpen,
      active: location.pathname === '/',
      badge: stories.length > 0 ? String(stories.length) : undefined,
    },
    {
      label: 'AI Cast & Characters',
      to: '/characters',
      icon: Users,
      active: location.pathname.startsWith('/characters'),
    },
    {
      label: 'New Story Wizard',
      to: '/stories/new',
      icon: BookPlus,
      active: location.pathname === '/stories/new',
    },
    {
      label: 'Branching Plot Trees',
      to: stories.length > 0 ? `/stories/${stories[0]._id}` : '/stories/new',
      icon: GitBranch,
      active: false,
    },
    {
      label: 'Writing Analytics',
      onClick: () => {
        const el = document.getElementById('analytics-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
      icon: BarChart3,
      active: false,
    },
    {
      label: 'Voice Library',
      onClick: () => {
        const el = document.getElementById('voice-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
      icon: Mic,
      active: false,
    },
    {
      label: 'Studio Settings',
      onClick: () => setSettingsOpen(true),
      icon: Settings,
      active: false,
    },
  ];

  return (
    <aside
      aria-label="Sidebar navigation"
      className={`sticky top-16 z-30 flex h-[calc(100vh-4rem)] flex-col justify-between border-r border-slate-200 bg-white/95 backdrop-blur-md transition-all duration-300 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Nav links */}
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = item.active;

          const content = (
            <div
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                }`}
              />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[0.625rem] font-bold ${
                        isActive ? 'bg-indigo-400/30 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </div>
          );

          if (item.to) {
            return (
              <Link key={idx} to={item.to} className="block">
                {content}
              </Link>
            );
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={item.onClick}
              className="block w-full text-left"
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* Bottom Section: AI Quota & Collapse (Voni AI Match) */}
      <div className="border-t border-slate-200 p-3">
        {/* Token / Word meter card */}
        {!collapsed ? (
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-slate-500">
                  AI WORDS QUOTA
                </span>
              </div>
              <span className="font-mono text-[0.6875rem] text-slate-700 font-medium">
                {Math.min(totalWords, 10000)} / 10,000
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(15, (totalWords / 10000) * 100))}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[0.625rem] text-slate-500">
              <span>{totalChapters} chapters synced</span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Sparkles className="h-2.5 w-2.5" /> Active
              </span>
            </div>
          </div>
        ) : (
          <div
            className="mb-3 flex justify-center py-2"
            title={`Words quota: ${totalWords} / 10,000`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-indigo-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
        )}

        {/* Collapse Sidebar Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
