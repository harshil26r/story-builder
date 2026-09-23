import { FileText, GitBranch, Layers } from 'lucide-react';
import type { StructureType, Pov, GenerationMode } from '../../../types/domain';

export interface SettingsStepValues {
  structureType: StructureType;
  genre: string;
  tone: string;
  targetAudience: string;
  lengthTarget: string;
  pov: Pov;
  generationMode: GenerationMode;
}

export interface StructureOption {
  value: StructureType;
  label: string;
  description: string;
  icon: typeof FileText;
}

export interface SettingsStepProps {
  value: SettingsStepValues;
  onChange: (next: SettingsStepValues) => void;
  structureOptions?: StructureOption[];
}

const DEFAULT_STRUCTURE_OPTIONS: StructureOption[] = [
  {
    value: 'single',
    label: 'Single',
    description: 'One complete, self-contained story in a single chapter.',
    icon: FileText,
  },
  {
    value: 'linear',
    label: 'Linear',
    description: 'A continuous multi-chapter arc with hooks between chapters.',
    icon: Layers,
  },
  {
    value: 'branching',
    label: 'Branching',
    description: 'Non-linear, choose-your-path scenes the reader navigates.',
    icon: GitBranch,
  },
];

export function SettingsStep({
  value,
  onChange,
  structureOptions = DEFAULT_STRUCTURE_OPTIONS,
}: SettingsStepProps) {
  const set = <K extends keyof SettingsStepValues>(key: K, v: SettingsStepValues[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
          Story structure
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="structure-options">
          {structureOptions.map((opt) => {
            const Icon = opt.icon;
            const active = value.structureType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('structureType', opt.value)}
                aria-pressed={active}
                className={`rounded-xl border p-3.5 text-left transition-all duration-200 ease-out focus:ring-2 focus:ring-indigo-500/30 focus:outline-none ${
                  active
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-600/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                }`}
                data-testid={`structure-${opt.value}`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? 'text-indigo-600' : 'text-slate-500'}`}
                  aria-hidden="true"
                />
                <p
                  className={`mt-2 text-sm font-semibold ${active ? 'text-indigo-950' : 'text-slate-900'}`}
                >
                  {opt.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="genre"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            Genre
          </label>
          <input
            id="genre"
            type="text"
            value={value.genre}
            onChange={(e) => set('genre', e.target.value)}
            placeholder="e.g. fantasy, noir, sci-fi"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none shadow-xs"
          />
        </div>
        <div>
          <label
            htmlFor="tone"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            Tone
          </label>
          <input
            id="tone"
            type="text"
            value={value.tone}
            onChange={(e) => set('tone', e.target.value)}
            placeholder="e.g. dark, hopeful, wry"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none shadow-xs"
          />
        </div>
        <div>
          <label
            htmlFor="audience"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            Target audience
          </label>
          <input
            id="audience"
            type="text"
            value={value.targetAudience}
            onChange={(e) => set('targetAudience', e.target.value)}
            placeholder="e.g. adult, young adult"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none shadow-xs"
          />
        </div>
        <div>
          <label
            htmlFor="length"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            Length
          </label>
          <input
            id="length"
            type="text"
            value={value.lengthTarget}
            onChange={(e) => set('lengthTarget', e.target.value)}
            placeholder="e.g. short, 5 chapters"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none shadow-xs"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
          Point of view
        </p>
        <div className="flex gap-2">
          {(['1st', '2nd', '3rd'] as Pov[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set('pov', p)}
              aria-pressed={value.pov === p}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none ${
                value.pov === p
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p} person
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
          Generation mode
        </p>
        <div className="flex gap-2">
          {[
            { value: 'full-ai' as const, label: 'Full AI' },
            { value: 'ai-enhanced' as const, label: 'AI-enhanced (bring a draft)' },
          ].map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => set('generationMode', m.value)}
              aria-pressed={value.generationMode === m.value}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none ${
                value.generationMode === m.value
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
