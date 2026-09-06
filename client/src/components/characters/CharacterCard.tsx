import { Link } from 'react-router-dom';
import { Copy, Pencil, Flame, Shield, Sparkles, User as UserIcon } from 'lucide-react';
import type { Character, CharacterRole } from '../../types/domain';
import { useCharacterStore } from '../../store/characterStore';
import { confirm } from '../ui/confirm';

export interface CharacterCardProps {
  character: Character;
  onDelete?: (character: Character) => void;
  onDuplicate?: (character: Character) => void;
}

const ROLE_STYLES: Record<CharacterRole, { label: string; cls: string; icon: typeof Shield; iconCls: string }> = {
  protagonist: { label: 'Protagonist', cls: 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400', icon: Shield, iconCls: 'text-emerald-400' },
  antagonist: { label: 'Antagonist', cls: 'border-rose-500/30 bg-rose-500/20 text-rose-400', icon: Flame, iconCls: 'text-rose-400' },
  supporting: { label: 'Supporting', cls: 'border-amber-500/30 bg-amber-500/20 text-amber-400', icon: Sparkles, iconCls: 'text-amber-400' },
  side: { label: 'Side', cls: 'border-slate-600/40 bg-slate-700/50 text-slate-300', icon: Sparkles, iconCls: 'text-slate-300' },
  mentor: { label: 'Mentor', cls: 'border-sky-500/30 bg-sky-500/20 text-sky-400', icon: Sparkles, iconCls: 'text-sky-400' },
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export function CharacterCard({ character, onDelete, onDuplicate }: CharacterCardProps) {
  const remove = useCharacterStore((s) => s.remove);
  const duplicate = useCharacterStore((s) => s.duplicate);
  const role = ROLE_STYLES[character.role] ?? ROLE_STYLES.supporting;
  const RoleIcon = role.icon;

  const handleDelete = () => {
    void confirm({
      title: 'Delete character?',
      message: `"${character.name}" will be removed. This cannot be undone.`,
      danger: true,
      confirmLabel: 'Delete',
    }).then((ok) => {
      if (!ok) return;
      if (onDelete) onDelete(character);
      else void remove(character._id);
    });
  };

  const handleDuplicate = () => {
    if (onDuplicate) onDuplicate(character);
    else void duplicate(character._id);
  };

  return (
    <article
      className="group rounded-lg border border-slate-800/80 bg-slate-900/60 p-5 transition-all duration-200 ease-out hover:border-slate-600"
      data-testid="character-card"
    >
      <div className="flex items-start gap-3">
        {character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={`${character.name} avatar`}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-slate-700"
            data-testid="character-avatar"
          />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-800 text-base font-semibold text-slate-200 ring-1 ring-slate-700"
            data-testid="character-initials"
          >
            <span aria-hidden="true">{initials(character.name)}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold tracking-tight text-slate-100">{character.name}</h3>
          </div>
          <div className="mt-1">
            <span className={`inline-flex items-center gap-1 rounded-full border py-0.5 pl-1.5 pr-2 text-xs ${role.cls}`}>
              <RoleIcon className="h-3 w-3" aria-hidden="true" />
              {role.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
          <Link
            to={`/characters/${character._id}`}
            aria-label={`Edit ${character.name}`}
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            onClick={handleDuplicate}
            aria-label={`Duplicate ${character.name}`}
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={handleDelete}
            aria-label={`Delete ${character.name}`}
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-slate-400">{character.backstory || character.appearance || 'No description yet.'}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {character.personality.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded bg-slate-800/70 px-1.5 py-0.5 text-xs text-slate-400">
            {tag}
          </span>
        ))}
        {character.personality.length > 3 && (
          <span className="rounded px-1 py-0.5 text-xs text-slate-500">+{character.personality.length - 3}</span>
        )}
      </div>

      {character.secretTrait && (
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-500 italic">
          <UserIcon className="h-3 w-3" aria-hidden="true" />
          Secret: {character.secretTrait}
        </p>
      )}
    </article>
  );
}