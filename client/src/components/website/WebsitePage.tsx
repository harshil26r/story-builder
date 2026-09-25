import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Sparkles,
  Feather,
  Layers,
  GitBranch,
  ArrowRight,
  CheckCircle2,
  Star,
  Users,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export function WebsitePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [previewTheme, setPreviewTheme] = useState<'cream' | 'night' | 'indigo'>('cream');
  const [previewChoice, setPreviewChoice] = useState<'A' | 'B'>('A');

  const handleStartWriting = (initialPremise?: string) => {
    if (user) {
      navigate('/stories/new', { state: initialPremise ? { premise: initialPremise } : undefined });
    } else {
      navigate('/auth/login', {
        state: { from: '/stories/new', email: emailInput || undefined },
      });
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      navigate('/stories/new');
    } else {
      navigate('/auth/signup', { state: { email: emailInput } });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* ── Top Notification Banner (Reader X Style from Video) ── */}
      <div className="relative z-50 flex items-center justify-between border-b border-indigo-700/30 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 px-4 py-2 text-xs text-white">
        <div className="mx-auto flex items-center gap-2 text-center">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-indigo-200">READER X</span>
          <span className="text-slate-400">&middot;</span>
          <span className="hidden sm:inline text-slate-200">
            Presenting the ultimate Ebook & AI Storytelling platform with 3D page-turn physics.
          </span>
          <span className="sm:hidden text-slate-200">The ultimate AI Ebook platform</span>
          <button
            onClick={() => handleStartWriting()}
            className="ml-2 inline-flex items-center gap-1 font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200 transition-colors"
          >
            Start writing &rarr;
          </button>
        </div>
      </div>

      {/* ── Sticky Top Navigation (Clean White Reader X Template) ── */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-transform group-hover:scale-105">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold tracking-tight text-slate-900">
                  Reader<span className="text-indigo-600">X</span>
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-indigo-700 border border-indigo-200/60">
                  Story Builder
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#chapters" className="hover:text-indigo-600 transition-colors">
              Chapters
            </a>
            <a href="#reader-preview" className="hover:text-indigo-600 transition-colors">
              Book Reader
            </a>
            <a href="#features" className="hover:text-indigo-600 transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">
              Pricing
            </a>
            <a href="#reviews" className="hover:text-indigo-600 transition-colors">
              Reviews
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  My Shelf
                </Link>
                <Link
                  to="/stories/new"
                  className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-all transform hover:-translate-y-0.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Create Story</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/auth/login"
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  Sign In
                </Link>
                <button
                  onClick={() => handleStartWriting()}
                  className="flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-slate-900/20 hover:bg-indigo-600 hover:shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5"
                >
                  <span>Create Story</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-100 bg-white px-4 py-4 md:hidden space-y-3">
            <a
              href="#chapters"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Chapters
            </a>
            <a
              href="#reader-preview"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Book Reader
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Pricing
            </a>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <Link
                  to="/stories/new"
                  className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white"
                >
                  Create Story / Book
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    className="flex items-center justify-center rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700"
                  >
                    Sign In
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleStartWriting();
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white"
                  >
                    Create Story
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION (Matching Reader X Webflow Template from video) ── */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Subtle background ambient circles */}
        <div className="pointer-events-none absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -left-40 h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Left Hero Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>The Ultimate Ebook & Story Webflow Template</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl leading-[1.12]">
                Get the Ultimate <span className="text-indigo-600">AI Story</span> & Book Builder
              </h1>

              {/* Subtitle */}
              <p className="max-w-xl text-lg text-slate-600 leading-relaxed">
                Design multidimensional characters, architect branching choice-driven narratives, and let AI compose complete, bound books with realistic 3D page-turning reading.
              </p>

              {/* Email Signup & Quick Action Bar (Video Template Match) */}
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email address..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 hover:bg-indigo-600 transition-all whitespace-nowrap transform hover:-translate-y-0.5"
                >
                  Start Reading
                </button>
              </form>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => handleStartWriting()}
                  className="flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all transform hover:-translate-y-0.5"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Create Story / Book</span>
                </button>
                <a
                  href="#chapters"
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <span>Explore Chapters</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100 max-w-md">
                <div>
                  <div className="font-display text-2xl font-bold text-slate-900">160+</div>
                  <div className="text-xs text-slate-500">Chapters & Nodes</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-slate-900">6+</div>
                  <div className="text-xs text-slate-500">Living Characters</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-slate-900">12+</div>
                  <div className="text-xs text-slate-500">Branching Endings</div>
                </div>
              </div>
            </div>

            {/* Right Hero Column: 3D Isometric Book Mockup (From Video) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md">
                {/* Indigo Backing Glow */}
                <div className="absolute -inset-4 rounded-3xl bg-indigo-500/20 blur-2xl" />

                {/* 3D Isometric Book Display Container */}
                <div
                  className="relative mx-auto w-[320px] sm:w-[350px] transition-transform duration-500 hover:scale-105"
                  style={{ perspective: '1200px' }}
                >
                  {/* The Physical Hardcover 3D Book */}
                  <div
                    className="relative rounded-2xl border-4 border-indigo-400/40 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 text-white shadow-[0_30px_70px_-15px_rgba(79,70,229,0.45)]"
                    style={{
                      transform: 'rotateY(-14deg) rotateX(8deg)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Spine highlight on left */}
                    <div className="absolute left-0 top-0 bottom-0 w-3 rounded-l-xl bg-indigo-500/30 border-r border-indigo-400/30" />

                    {/* Book Cover Header */}
                    <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3 text-[0.625rem] font-mono tracking-widest text-indigo-300 uppercase">
                      <span>Original Masterpiece</span>
                      <span>Vol. 1</span>
                    </div>

                    {/* Book Art Illustration */}
                    <div className="my-6 rounded-xl border border-indigo-400/20 bg-indigo-900/40 p-4 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 shadow-inner">
                        <BookOpen className="h-8 w-8" />
                      </div>
                      <div className="mt-4 font-mono text-[0.625rem] uppercase tracking-widest text-indigo-400">
                        The Living Manuscript
                      </div>
                    </div>

                    {/* Book Title */}
                    <div className="space-y-1 text-center">
                      <h3 className="font-display text-xl font-bold tracking-tight text-white">
                        The Citadel of Whispers
                      </h3>
                      <p className="text-xs text-indigo-200">
                        An interactive branching chronicle by Gemini AI
                      </p>
                    </div>

                    {/* Cover Badges at bottom */}
                    <div className="mt-6 flex items-center justify-between border-t border-indigo-500/30 pt-3 text-[0.6875rem] font-medium text-indigo-300">
                      <span>3D Page Flip</span>
                      <span className="flex items-center gap-1 text-amber-300">
                        <Star className="h-3 w-3 fill-amber-300" /> 4.9
                      </span>
                      <span>PDF & EPUB</span>
                    </div>
                  </div>

                  {/* Floating Stat Badges in 3D Space */}
                  <div className="absolute -left-6 top-12 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">100% Complete</div>
                        <div className="text-[0.625rem] text-slate-500">Multi-Chapter AI Book</div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -right-4 bottom-16 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                        <GitBranch className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Branching Graph</div>
                        <div className="text-[0.625rem] text-slate-500">Choice-Driven Paths</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EXPLORE THE CHAPTERS SECTION (Direct match to Reader X in video) ── */}
      <section id="chapters" className="border-t border-slate-100 bg-slate-50/50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="rounded-full bg-indigo-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-indigo-700 border border-indigo-200/50">
              Table of Contents
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Explore the Chapters
            </h2>
            <p className="text-slate-600">
              Everything included in the Reader X blueprint for writing, illustrating, and publishing living literary works.
            </p>
          </div>

          {/* 4 Isometric 3D Chapter Cards (Matching the purple 3D cards from video) */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Chapter 01 */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-200">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users className="h-8 w-8" />
              </div>
              <div className="mt-6 font-mono text-xs font-bold uppercase tracking-wider text-indigo-600">
                Chapter 01
              </div>
              <h3 className="mt-2 font-display text-lg font-bold text-slate-950">
                Character Genesis & Lore
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Craft multifaceted personas with psychological flaws, unique speech styles, and dynamic inter-character relationship webs.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleStartWriting()}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700"
                >
                  <span>Build characters</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Chapter 02 */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-200">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <GitBranch className="h-8 w-8" />
              </div>
              <div className="mt-6 font-mono text-xs font-bold uppercase tracking-wider text-indigo-600">
                Chapter 02
              </div>
              <h3 className="mt-2 font-display text-lg font-bold text-slate-950">
                Branching Narrative Webs
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Design non-linear interactive stories where each reader decision sprouts new scenes, diverging paths, and alternate climaxes.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleStartWriting()}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700"
                >
                  <span>Weave branches</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Chapter 03 */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-200">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Feather className="h-8 w-8" />
              </div>
              <div className="mt-6 font-mono text-xs font-bold uppercase tracking-wider text-indigo-600">
                Chapter 03
              </div>
              <h3 className="mt-2 font-display text-lg font-bold text-slate-950">
                Living AI Prose Streaming
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Stream literary chapters via Gemini with strict consistency chaining. Characters remember secrets and plot arcs across volumes.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleStartWriting()}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700"
                >
                  <span>Stream prose</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Chapter 04 */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-200">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="mt-6 font-mono text-xs font-bold uppercase tracking-wider text-indigo-600">
                Chapter 04
              </div>
              <h3 className="mt-2 font-display text-lg font-bold text-slate-950">
                Realistic Page-Turn Reader
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Read finished manuscripts in authentic 3D page flip physics, cream deckle paper, typography settings, and instant export.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <a
                  href="#reader-preview"
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700"
                >
                  <span>Experience reader</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE READER PREVIEW / SAMPLE CHAPTER (From Video) ── */}
      <section id="reader-preview" className="py-20 lg:py-28 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Excerpt Controls */}
            <div className="lg:col-span-5 space-y-6">
              <span className="rounded-full bg-indigo-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-indigo-700 border border-indigo-200/50">
                Live Interactive Reader
              </span>
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Experience Books Like Holding Physical Paper
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Reader X provides a distraction-free literary sanctuary with authentic 3D page curl, illuminated drop capitals, and branching choice triggers.
              </p>

              {/* Reader Theme Controls */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Interactive Reader Theme:
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewTheme('cream')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      previewTheme === 'cream'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm font-semibold'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Cream Parchment
                  </button>
                  <button
                    onClick={() => setPreviewTheme('night')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      previewTheme === 'night'
                        ? 'bg-slate-900 text-slate-100 border border-slate-700 shadow-sm font-semibold'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Night Mode
                  </button>
                  <button
                    onClick={() => setPreviewTheme('indigo')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      previewTheme === 'indigo'
                        ? 'bg-indigo-900 text-indigo-100 border border-indigo-700 shadow-sm font-semibold'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Atelier Indigo
                  </button>
                </div>
              </div>

              {/* Reading Features Checklist */}
              <div className="space-y-2.5 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>3D Framer-Motion page-turn physics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Illuminated drop-caps and serif typesetting</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Interactive decision nodes for Choose-Your-Own-Adventure</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Export to clean PDF or EPUB in 1 click</span>
                </div>
              </div>

              <div>
                <button
                  onClick={() => handleStartWriting()}
                  className="flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-all"
                >
                  <span>Open Studio & Create Story</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Right Live Book Reader Mockup */}
            <div className="lg:col-span-7">
              <div
                className={`rounded-2xl border p-6 sm:p-8 shadow-2xl transition-all duration-300 ${
                  previewTheme === 'cream'
                    ? 'border-amber-200/80 bg-[#fbf8f1] text-[#1c2233]'
                    : previewTheme === 'night'
                    ? 'border-slate-800 bg-[#0b0f19] text-slate-100'
                    : 'border-indigo-800 bg-[#0f1429] text-indigo-50'
                }`}
              >
                {/* Book Page Header */}
                <div className="flex items-center justify-between border-b pb-3 text-xs font-mono uppercase tracking-widest opacity-60">
                  <span>Ch. I &middot; Funnel Optimization</span>
                  <span>p. 42</span>
                </div>

                {/* Chapter Title & Illuminated Drop-Cap */}
                <div className="mt-6 space-y-4 font-serif">
                  <h3 className="font-display text-2xl font-bold tracking-tight">
                    The Clockwork Spire
                  </h3>
                  <div className="leading-relaxed text-sm sm:text-base">
                    <span
                      className={`float-left mr-3 flex h-12 w-12 items-center justify-center rounded-lg text-2xl font-bold font-serif shadow-sm ${
                        previewTheme === 'cream'
                          ? 'bg-amber-900 text-amber-100'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      I
                    </span>
                    n the heart of the brass citadel, every gear turns with deliberate intention.
                    The archivist looked up from the parchment, eyes reflecting the golden lantern light as the great bells struck twelve.
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed opacity-90">
                    &ldquo;You stand at the precipice of five branching kingdoms,&rdquo; she whispered.
                    &ldquo;Which destiny will you write into the chronicles today?&rdquo;
                  </p>
                </div>

                {/* Interactive Choice Buttons in the Reader */}
                <div className="mt-8 pt-6 border-t border-current/10 space-y-3">
                  <div className="text-xs font-mono uppercase tracking-wider opacity-60">
                    Interactive Branching Choice:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setPreviewChoice('A')}
                      className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-left text-xs transition-all ${
                        previewChoice === 'A'
                          ? 'border-indigo-600 bg-indigo-600/10 font-semibold ring-2 ring-indigo-600/30'
                          : 'border-current/20 hover:bg-current/5'
                      }`}
                    >
                      <span className="font-bold text-indigo-600">A &rarr;</span>
                      <span>Turn the obsidian dial toward the northern stars</span>
                    </button>
                    <button
                      onClick={() => setPreviewChoice('B')}
                      className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-left text-xs transition-all ${
                        previewChoice === 'B'
                          ? 'border-indigo-600 bg-indigo-600/10 font-semibold ring-2 ring-indigo-600/30'
                          : 'border-current/20 hover:bg-current/5'
                      }`}
                    >
                      <span className="font-bold text-indigo-600">B &rarr;</span>
                      <span>Descend into the sunken catacombs with the lantern</span>
                    </button>
                  </div>
                  <div className="text-[0.6875rem] font-mono text-indigo-500 italic">
                    {previewChoice === 'A'
                      ? '✦ Arc Active: The northern stargazers prepare their celestial apparatus...'
                      : '✦ Arc Active: Shadows dance across ancient flooded catacomb walls...'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT IS INCLUDED IN READER X (Direct Match from Video frame 003) ── */}
      <section id="features" className="border-t border-slate-100 bg-slate-50/70 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="rounded-full bg-indigo-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-indigo-700 border border-indigo-200/50">
              Complete Package
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              What is Included in Reader X
            </h2>
            <p className="text-slate-600">
              Reader X includes over 18+ story templates, 26+ pre-tuned narrative styles, and 15+ book designs.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: 18+ Pages / Formats */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Layers className="h-6 w-6" />
                </div>
                <div className="mt-6 font-display text-3xl font-bold text-slate-950">
                  18+ Formats
                </div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Single-shot novellas, multi-chapter epic linear volumes, and complex Choose-Your-Own-Adventure branching trees.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Single Chapter flash fiction</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Multi-chapter linear novels</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Multi-path branching tree nodes</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-indigo-600">Full Structure Engine &rarr;</span>
              </div>
            </div>

            {/* Card 2: 26+ Sections / Genres */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Feather className="h-6 w-6" />
                </div>
                <div className="mt-6 font-display text-3xl font-bold text-slate-950">
                  26+ Genres
                </div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Fine-tuned prompt archetypes for high fantasy, hard sci-fi, gothic horror, cyberpunk, cozy mystery, and historical drama.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Tone & audience calibration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Character speech consistency</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Dynamic plot twist generation</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-indigo-600">Explore Genre Presets &rarr;</span>
              </div>
            </div>

            {/* Card 3: 15+ Styles & Symbols */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="mt-6 font-display text-3xl font-bold text-slate-950">
                  15+ Styles
                </div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  AI Cover Art generation, custom typography palettes, gold filigree ornaments, and PDF/EPUB export pipelines.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>AI Cover Art Generation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Print-ready PDF with drop-caps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Universal EPUB for e-readers</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-indigo-600">View Design Tokens &rarr;</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ── */}
      <section id="reviews" className="py-20 lg:py-28 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="rounded-full bg-indigo-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-indigo-700 border border-indigo-200/50">
              Community Praise
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              What Authors & Readers Say
            </h2>
            <p className="text-slate-600">
              Join thousands of story architects bringing dynamic worlds to life.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm space-y-4">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs leading-relaxed text-slate-700 italic">
                &ldquo;The branching story visualizer combined with the 3D page-flip reader is unbelievable. It feels like holding a real book that breathes with your choices.&rdquo;
              </p>
              <div className="pt-4 border-t border-slate-200/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  EV
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Elena Vance</div>
                  <div className="text-[0.625rem] text-slate-500">Fantasy Novelist</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm space-y-4">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs leading-relaxed text-slate-700 italic">
                &ldquo;I designed 6 cast members with deep secrets, and Gemini respected every single one through all 8 chapters. My readers were hooked on the twist!&rdquo;
              </p>
              <div className="pt-4 border-t border-slate-200/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                  MT
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Marcus Thorne</div>
                  <div className="text-[0.625rem] text-slate-500">Game Narrative Designer</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm space-y-4">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs leading-relaxed text-slate-700 italic">
                &ldquo;Exporting directly to a clean PDF with drop-caps and chapter index saved me hours of manual typesetting. The public share link is awesome too.&rdquo;
              </p>
              <div className="pt-4 border-t border-slate-200/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  AS
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Aria Sterling</div>
                  <div className="text-[0.625rem] text-slate-500">Indie Author & Publisher</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION (Shop / Product from Video frame 014) ── */}
      <section id="pricing" className="border-t border-slate-100 bg-slate-50/60 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="rounded-full bg-indigo-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-indigo-700 border border-indigo-200/50">
              Pricing & Access
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Choose Your Storyteller Edition
            </h2>
            <p className="text-slate-600">
              Start reading and composing for free, or unlock the full power of the AI Atelier.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
                  Digital Reader
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-slate-900">$0</span>
                  <span className="text-xs text-slate-500">/ forever free</span>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Perfect for reading published volumes and exploring interactive paths.
                </p>
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Unlimited public book reading</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Interactive 3D page-flip experience</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>1 active story draft manuscript</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button
                  onClick={() => handleStartWriting()}
                  className="w-full rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  Start Reading Free
                </button>
              </div>
            </div>

            {/* Author Atelier Tier (Featured) */}
            <div className="relative rounded-3xl border-2 border-indigo-600 bg-white p-8 shadow-xl flex flex-col justify-between transform md:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 font-mono text-[0.625rem] font-bold uppercase tracking-wider text-white shadow-md">
                Most Popular &middot; Full Atelier
              </div>
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Author Atelier
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-slate-900">$19</span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Complete AI generation suite for novelists and narrative designers.
                </p>
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    <span>Full Gemini AI prose streaming</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    <span>Up to 50 custom character sheets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    <span>Multi-path branching narrative trees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    <span>AI Cover Art generator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    <span>Full PDF & EPUB exports</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button
                  onClick={() => handleStartWriting()}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 transition-colors"
                >
                  Start Writing Now
                </button>
              </div>
            </div>

            {/* Studio Master Tier */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
                  Studio Master
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-slate-900">$49</span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Uncapped volumes for game developers, studios, and publishing houses.
                </p>
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Unlimited AI chapter generations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Unlimited character relationship graphs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Commercial distribution rights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Priority generation bandwidth</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button
                  onClick={() => handleStartWriting()}
                  className="w-full rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  Join Studio Master
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION BANNER (From Video frame 008: Purple Angular Card) ── */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-800 p-8 sm:p-12 lg:p-16 text-white shadow-2xl">
            {/* Ambient light glow */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 max-w-2xl space-y-6">
              <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-indigo-100 border border-white/20">
                Begin Your Journey
              </span>
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl lg:text-5xl tracking-tight leading-tight">
                Ready to Architect Your Next Masterpiece?
              </h2>
              <p className="text-base sm:text-lg text-indigo-100 leading-relaxed">
                Log in or create your free account now. Build your cast of characters, select your story structure, and let AI write your book.
              </p>

              <div className="pt-2 flex flex-wrap gap-4">
                <button
                  onClick={() => handleStartWriting()}
                  className="rounded-full bg-white px-8 py-4 text-sm font-bold text-indigo-900 shadow-xl hover:bg-indigo-50 transition-all transform hover:-translate-y-0.5"
                >
                  Create Story / Book Now
                </button>
                <Link
                  to="/auth/login"
                  className="rounded-full border border-white/40 bg-white/10 px-8 py-4 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  Sign In to Studio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER (Matching Reader X Footer from Video) ── */}
      <footer className="border-t border-slate-900 bg-[#090d16] text-slate-400 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="font-display text-xl font-bold tracking-tight text-white">
                  Reader<span className="text-indigo-400">X</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
                The premier AI-assisted creative writing atelier. Weave intricate branching plots, manage deep character relationships, and read finished volumes with realistic page-turning reading.
              </p>
              <div className="pt-2 text-xs text-slate-500">
                &copy; {new Date().getFullYear()} Story Builder & Reader X. All rights reserved.
              </div>
            </div>

            {/* Pages Column */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-white">
                Main Pages
              </div>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#chapters" className="hover:text-white transition-colors">
                    Chapters
                  </a>
                </li>
                <li>
                  <a href="#reader-preview" className="hover:text-white transition-colors">
                    Book Reader
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link to="/characters" className="hover:text-white transition-colors">
                    Characters Studio
                  </Link>
                </li>
              </ul>
            </div>

            {/* Formats & Engine Column */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-white">
                Story Formats
              </div>
              <ul className="space-y-2 text-xs">
                <li>
                  <span className="text-slate-400">Single Chapter</span>
                </li>
                <li>
                  <span className="text-slate-400">Linear Epic Multi-Chapter</span>
                </li>
                <li>
                  <span className="text-slate-400">Branching Choice Trees</span>
                </li>
                <li>
                  <span className="text-slate-400">AI Cover Generator</span>
                </li>
                <li>
                  <span className="text-slate-400">PDF & EPUB Export</span>
                </li>
              </ul>
            </div>

            {/* Utility Pages */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-white">
                Account & Atelier
              </div>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/auth/login" className="hover:text-white transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link to="/auth/signup" className="hover:text-white transition-colors">
                    Create Account
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => handleStartWriting()}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    + Create Story / Book
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
