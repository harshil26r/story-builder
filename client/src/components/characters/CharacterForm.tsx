import { useEffect, useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import type { Character, CharacterRole } from '../../types/domain';
import type { CharacterInput } from '../../types/api';
import { Button } from '../ui/Button';

export interface CharacterFormProps {
  initial?: Character | null;
  onSave: (draft: CharacterInput) => Promise<void> | void;
  onCancel?: () => void;
  saving?: boolean;
}

const ROLES: { value: CharacterRole; label: string }[] = [
  { value: 'protagonist', label: 'Protagonist' },
  { value: 'antagonist', label: 'Antagonist' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'side', label: 'Side' },
  { value: 'supporting', label: 'Supporting' },
];

const requiredField = 'Required';

function TagArrayInput({
  label,
  value,
  onChange,
  maxCount = 12,
  maxLen = 100,
}: {
  label: string;
  value: string[];
  onChange: (arr: string[]) => void;
  maxCount?: number;
  maxLen?: number;
}) {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim();
    if (!v || value.length >= maxCount || v.length > maxLen) return;
    onChange([...value, v]);
    setText('');
  };
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={text}
          maxLength={maxLen}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Type and press Enter"
          aria-label={`Add ${label}`}
          className="flex-1 rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-sm text-slate-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={add}
          aria-label={`Add ${label}`}
          disabled={value.length >= maxCount}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {value.map((tag, i) => (
            <span
              key={tag + i}
              className="inline-flex items-center gap-1 rounded bg-indigo-500/15 px-1.5 py-0.5 text-xs text-indigo-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`Remove ${tag}`}
                className="text-indigo-400 hover:text-indigo-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="mt-0.5 text-xs text-slate-500">
        {value.length}/{maxCount}
      </p>
    </div>
  );
}

export function CharacterForm({ initial, onSave, onCancel, saving }: CharacterFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState<CharacterRole>(initial?.role ?? 'protagonist');
  const [age, setAge] = useState(initial?.age?.toString() ?? '');
  const [gender, setGender] = useState(initial?.gender ?? '');
  const [appearance, setAppearance] = useState(initial?.appearance ?? '');
  const [backstory, setBackstory] = useState(initial?.backstory ?? '');
  const [personality, setPersonality] = useState<string[]>(initial?.personality ?? []);
  const [likes, setLikes] = useState<string[]>(initial?.likes ?? []);
  const [dislikes, setDislikes] = useState<string[]>(initial?.dislikes ?? []);
  const [catchphrases, setCatchphrases] = useState<string[]>(initial?.catchphrases ?? []);
  const [voiceStyle, setVoiceStyle] = useState(initial?.voiceStyle ?? '');
  const [arc, setArc] = useState(initial?.arc ?? '');
  const [secretTrait, setSecretTrait] = useState(initial?.secretTrait ?? '');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setRole(initial.role);
      setAge(initial.age?.toString() ?? '');
      setGender(initial.gender);
      setAppearance(initial.appearance);
      setBackstory(initial.backstory);
      setPersonality(initial.personality);
      setLikes(initial.likes);
      setDislikes(initial.dislikes);
      setCatchphrases(initial.catchphrases);
      setVoiceStyle(initial.voiceStyle);
      setArc(initial.arc);
      setSecretTrait(initial.secretTrait);
    }
  }, [initial]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(requiredField);
      return;
    }
    const draft: CharacterInput = {
      name: name.trim(),
      role,
      age: age ? Number(age) : null,
      gender,
      appearance,
      backstory,
      personality,
      likes,
      dislikes,
      catchphrases,
      voiceStyle,
      arc,
      secretTrait,
      secretRevealChapter: null,
      relationships: initial?.relationships ?? [],
    };
    void onSave(draft);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="Character form">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="char-name"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Name <span className="text-rose-400">*</span>
          </label>
          <input
            id="char-name"
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError('');
            }}
            className={`w-full rounded-md border ${nameError ? 'border-rose-500/60' : 'border-slate-700/60'} bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none`}
            placeholder="Character name"
          />
          {nameError && <p className="mt-0.5 text-xs text-rose-400">{nameError}</p>}
        </div>
        <div>
          <label
            htmlFor="char-role"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Role <span className="text-rose-400">*</span>
          </label>
          <select
            id="char-role"
            value={role}
            onChange={(e) => setRole(e.target.value as CharacterRole)}
            className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label
            htmlFor="char-age"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Age
          </label>
          <input
            id="char-age"
            type="number"
            min={0}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="char-gender"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Gender
          </label>
          <input
            id="char-gender"
            type="text"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
            placeholder="e.g. woman, non-binary"
          />
        </div>
        <div>
          <label
            htmlFor="char-voice"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Voice style
          </label>
          <input
            id="char-voice"
            type="text"
            value={voiceStyle}
            onChange={(e) => setVoiceStyle(e.target.value)}
            className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
            placeholder="e.g. formal, clipped"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="char-appearance"
          className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Appearance
        </label>
        <textarea
          id="char-appearance"
          value={appearance}
          onChange={(e) => setAppearance(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          placeholder="Physical description"
        />
      </div>
      <TagArrayInput label="Personality" value={personality} onChange={setPersonality} />
      <TagArrayInput label="Likes" value={likes} onChange={setLikes} />
      <TagArrayInput label="Dislikes" value={dislikes} onChange={setDislikes} />
      <TagArrayInput
        label="Catchphrases"
        value={catchphrases}
        onChange={setCatchphrases}
        maxCount={6}
      />
      <div>
        <label
          htmlFor="char-backstory"
          className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Backstory
        </label>
        <textarea
          id="char-backstory"
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="char-arc"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Arc
          </label>
          <textarea
            id="char-arc"
            value={arc}
            onChange={(e) => setArc(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="char-secret"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Secret trait
          </label>
          <textarea
            id="char-secret"
            value={secretTrait}
            onChange={(e) => setSecretTrait(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving}>
          {initial ? 'Save changes' : 'Create character'}
        </Button>
      </div>
    </form>
  );
}
