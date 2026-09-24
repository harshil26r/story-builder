import { useState } from 'react';
import { X, Sliders, Sparkles, CreditCard, Key, CheckCircle2, BookOpen } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from './Button';

export function StudioSettingsModal() {
  const open = useUiStore((s) => s.settingsOpen);
  const setOpen = useUiStore((s) => s.setSettingsOpen);
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'plans' | 'api'>('general');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [creativity, setCreativity] = useState('0.7');

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Studio settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex h-[580px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/80 md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Settings Sidebar */}
        <div className="w-full border-b border-slate-800 bg-slate-950/70 p-4 md:w-56 md:border-b-0 md:border-r">
          <div className="mb-4 flex items-center gap-2 px-2">
            <Sliders className="h-4 w-4 text-indigo-400" />
            <h2 className="font-display text-base font-semibold text-slate-100">Studio Settings</h2>
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'general'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              General & AI Model
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Author Profile
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'plans'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Plans & Quota
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'api'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Key className="h-4 w-4" />
              API & Integrations
            </button>
          </nav>
        </div>

        {/* Right Settings Content */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto p-6">
          <div>
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  {activeTab === 'general' && 'General AI Studio Preferences'}
                  {activeTab === 'profile' && 'Author & Manuscript Profile'}
                  {activeTab === 'plans' && 'Manuscript Generation Plans'}
                  {activeTab === 'api' && 'API Keys & Storage Config'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure creative generation behavior and publishing workspace settings.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {activeTab === 'general' && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Primary AI Storytelling Model
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="gemini-2.5-flash">
                      Gemini 2.5 Flash (Ultra-fast chapter generation)
                    </option>
                    <option value="gemini-2.5-pro">
                      Gemini 2.5 Pro (Deep literary analysis & complex prose)
                    </option>
                    <option value="claude-3-5-sonnet">
                      Claude 3.5 Sonnet (Narrative nuance & dialogue)
                    </option>
                  </select>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-slate-400">
                    <span className="font-semibold uppercase tracking-wider">
                      Creativity & Temperature
                    </span>
                    <span>{creativity}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={creativity}
                    onChange={(e) => setCreativity(e.target.value)}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-indigo-500"
                  />
                  <div className="mt-1 flex justify-between text-[0.6875rem] text-slate-500">
                    <span>Grounded & Consistent</span>
                    <span>Wild & Unpredictable</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Author Display Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.name || 'Author'}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Workspace Identifier
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${user?.email || 'author@studio.com'} (Personal Studio)`}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'plans' && (
              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                <div className="rounded-xl border border-indigo-500/50 bg-indigo-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">Creative Pro</span>
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[0.625rem] font-bold text-indigo-300">
                      CURRENT
                    </span>
                  </div>
                  <p className="mt-1 font-display text-2xl font-bold text-slate-100">
                    10,000 <span className="text-xs font-normal text-slate-400">words/mo</span>
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Branching Plot Editor
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      AI Character Casting
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      EPUB & PDF Export
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">Enterprise Studio</span>
                  </div>
                  <p className="mt-1 font-display text-2xl font-bold text-slate-100">
                    Unlimited <span className="text-xs font-normal text-slate-400">words</span>
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Custom Fine-Tuned Voice
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Multi-Author Collaboration
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Dedicated GPU Priority
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-4 pt-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Server Side API Status
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Server AI provider handles rate limits, caching, and token quotas automatically.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setOpen(false);
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
