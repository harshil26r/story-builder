import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, Compass } from 'lucide-react';
import { GoogleAuthButton } from './GoogleAuthButton';
import { BookReadingAnimation } from './BookReadingAnimation';

export type AuthMode = 'login' | 'signup' | 'verify';

export interface AuthCardProps {
  mode: AuthMode;
  children: ReactNode;
}

const MODE_COPY: Record<
  AuthMode,
  { title: string; sub: string; linkLabel: string; linkTo: string; linkText: string }
> = {
  login: {
    title: 'Welcome back',
    sub: 'Sign in to continue writing your books.',
    linkLabel: 'New to Story Builder?',
    linkTo: '/auth/signup',
    linkText: 'Create an account',
  },
  signup: {
    title: 'Start writing',
    sub: 'Build your cast of characters and let AI write your book.',
    linkLabel: 'Already have an account?',
    linkTo: '/auth/login',
    linkText: 'Sign in',
  },
  verify: {
    title: 'Verify your email',
    sub: 'Enter the 6-digit code we emailed you.',
    linkLabel: 'Wrong email?',
    linkTo: '/auth/signup',
    linkText: 'Start over',
  },
};

export function AuthCard({ mode, children }: AuthCardProps) {
  const copy = MODE_COPY[mode];

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] text-slate-900">
      {/* ── Left Hero Panel: Ethereal Light Reading Sanctuary ── */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-slate-200/90 bg-gradient-to-br from-[#f8f9ff] via-[#f1f4fd] to-[#eaedfc] p-10 lg:flex xl:p-14">
        {/* Soft Ambient lighting glows */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl animate-ink-glow"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/3 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-purple-500/10 blur-2xl"
          aria-hidden="true"
        />

        {/* Brand header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-transform group-hover:scale-105">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-slate-950">
                Story<span className="text-indigo-600">Builder</span>
              </span>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-indigo-700">
                Reader X
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-white hover:text-slate-900 hover:shadow"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Visit Website</span>
          </Link>
        </div>

        {/* Central 3D Reading Book & Flipping Pages Showcase */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center py-6">
          <BookReadingAnimation />

          {/* Editorial Excerpt Card (Light Glass Aesthetic) */}
          <div className="mt-8 w-full max-w-sm rounded-xl border border-slate-200 bg-white/90 p-4 shadow-xl shadow-indigo-500/5 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
              <span className="font-mono text-[0.625rem] font-semibold tracking-wider text-indigo-700 uppercase">
                Living Book Reader
              </span>
              <Compass className="ml-auto h-3.5 w-3.5 text-indigo-600" />
            </div>
            <p className="mt-2 font-serif text-xs italic leading-relaxed text-slate-700">
              &ldquo;Where stories breathe and readers turn pages. Architect branching narratives, summon characters, and bind your books.&rdquo;
            </p>
          </div>
        </div>

        {/* Literary Studio Footer */}
        <div className="relative z-10 space-y-2">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950">
            Where imagination becomes manuscript
          </h2>
          <p className="max-w-md text-xs leading-relaxed text-slate-600">
            A bespoke creative writing platform. Design deep character webs, weave branching decision trees, and read finished volumes with realistic page-turning reading.
          </p>
        </div>
      </div>

      {/* ── Right Auth Form Panel (Pristine White Card) ── */}
      <div className="flex w-full flex-col justify-between bg-white sm:bg-[#fafafb] p-6 sm:p-10 lg:w-1/2 lg:p-14 xl:p-16">
        {/* Top bar with back to home & atelier badge */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
            <span className="font-medium">Story Builder Home</span>
          </Link>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-slate-600">
              Writer&apos;s Studio
            </span>
          </div>
        </div>

        {/* Center Card Content */}
        <div className="mx-auto my-auto w-full max-w-md py-8">
          <div className="mb-6 text-center lg:text-left">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 lg:hidden">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {copy.title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{copy.sub}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/60 sm:p-8">
            {children}

            {mode !== 'verify' && <GoogleAuthButton />}

            <p className="mt-6 text-center text-xs text-slate-500">
              {copy.linkLabel}{' '}
              <Link
                to={copy.linkTo}
                className="font-semibold text-indigo-600 transition-colors duration-200 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {copy.linkText}
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom subtle copyright */}
        <div className="flex items-center justify-between border-t border-slate-200/80 pt-4 text-[0.6875rem] text-slate-500">
          <span>&copy; {new Date().getFullYear()} Story Builder. All rights reserved.</span>
          <div className="flex gap-3">
            <Link to="/" className="hover:text-slate-800 transition-colors">
              Explore Books
            </Link>
            <span>&middot;</span>
            <Link to="/auth/signup" className="hover:text-slate-800 transition-colors">
              Start Writing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
