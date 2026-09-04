import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GoogleAuthButton } from './GoogleAuthButton';

export type AuthMode = 'login' | 'signup' | 'verify';

export interface AuthCardProps {
  mode: AuthMode;
  children: ReactNode;
}

const MODE_COPY: Record<AuthMode, { title: string; sub: string; linkLabel: string; linkTo: string; linkText: string }> = {
  login: {
    title: 'Welcome back',
    sub: 'Sign in to continue writing.',
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
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg-canvas)] px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-800/80 bg-slate-900/90 p-8 shadow-2xl shadow-black/40">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15 ring-1 ring-indigo-500/30">
            <BookOpen className="h-6 w-6 text-indigo-400" aria-hidden="true" />
          </div>
          <h1 className="font-semibold tracking-tight text-slate-100">{copy.title}</h1>
          <p className="text-sm text-slate-400">{copy.sub}</p>
        </div>

        {children}

        {mode !== 'verify' && <GoogleAuthButton />}

        <p className="mt-6 text-center text-xs text-slate-500">
          {copy.linkLabel}{' '}
          <Link
            to={copy.linkTo}
            className="text-indigo-400 transition-colors duration-200 hover:text-indigo-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          >
            {copy.linkText}
          </Link>
        </p>
      </div>
    </div>
  );
}