import { Link } from 'react-router-dom';
import { Home, FileQuestion } from 'lucide-react';
import { Button } from '../ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[color:var(--bg-canvas)] px-4 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/60 ring-1 ring-slate-700/60">
        <FileQuestion className="h-10 w-10 text-indigo-400" aria-hidden="true" />
        <div
          className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl"
          aria-hidden="true"
        />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100">Page not found</h1>
        <p className="text-sm text-slate-400">The page you are looking for does not exist.</p>
      </div>
      <Link to="/">
        <Button variant="primary" aria-label="Return to home">
          <Home className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Button>
      </Link>
    </div>
  );
}
