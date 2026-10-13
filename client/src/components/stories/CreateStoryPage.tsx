import { Link } from 'react-router-dom';
import {
  BookOpen,
  Compass,
  Feather,
  GitBranch,
  Sparkles,
  Wand2,
  ArrowRight,
} from 'lucide-react';
import type { GenerationMode, StructureType } from '../../types/domain';

interface CreateOption {
  key: string;
  title: string;
  description: string;
  icon: typeof Wand2;
  tone: string;
  to?: string;
  preset?: {
    structureType: StructureType;
    generationMode: GenerationMode;
  };
}

// Multiple ways to make a story. Each preset pre-fills the wizard's Settings
// step so the author lands on the right format immediately.
const OPTIONS: CreateOption[] = [
  {
    key: 'full-ai',
    title: 'Full AI book',
    description:
      'Describe a premise and let AI draft the whole manuscript — chapters, characters, and all.',
    icon: Wand2,
    tone: 'border-indigo-200 bg-indigo-50 text-indigo-600',
    to: '/stories/new',
    preset: { structureType: 'linear', generationMode: 'full-ai' },
  },
  {
    key: 'ai-assisted',
    title: 'Write it yourself (AI-assisted)',
    description:
      'Stay in the driver’s seat. Draft each chapter by hand with AI polishing and suggestions.',
    icon: Feather,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    to: '/stories/new',
    preset: { structureType: 'linear', generationMode: 'ai-enhanced' },
  },
  {
    key: 'short-story',
    title: 'Single short story',
    description: 'One self-contained piece — perfect for an idea you can tell in a sitting.',
    icon: BookOpen,
    tone: 'border-amber-200 bg-amber-50 text-amber-600',
    to: '/stories/new',
    preset: { structureType: 'single', generationMode: 'full-ai' },
  },
  {
    key: 'branching',
    title: 'Branching adventure',
    description:
      'A choose-your-own-path book where readers make decisions that change the ending.',
    icon: GitBranch,
    tone: 'border-cyan-200 bg-cyan-50 text-cyan-600',
    to: '/stories/new',
    preset: { structureType: 'branching', generationMode: 'full-ai' },
  },
  {
    key: 'remix',
    title: 'Remix an idea from Explore',
    description: 'Browse published books, borrow a premise you love, and make it your own.',
    icon: Compass,
    tone: 'border-violet-200 bg-violet-50 text-violet-600',
    to: '/explore',
  },
];

export function CreateStoryPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div>
        <p className="eyebrow">New manuscript</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          How do you want to write?
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a starting point — you can change any of it later.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="create-options">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const inner = (
            <>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${option.tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-bold text-slate-900">
                    {option.title}
                  </h2>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{option.description}</p>
              </div>
            </>
          );

          const className =
            'group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition-all duration-200 ease-out hover:border-indigo-300 hover:shadow-md focus:ring-2 focus:ring-indigo-500/50 focus:outline-none';

          return (
            <Link
              key={option.key}
              to={option.to!}
              state={option.preset ? { preset: option.preset } : undefined}
              className={className}
              data-testid={`create-option-${option.key}`}
            >
              {inner}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <Sparkles className="h-4 w-4 text-indigo-500" aria-hidden="true" />
        Not sure yet? Start with a premise — Story Builder will suggest a structure that fits.
      </div>
    </div>
  );
}
