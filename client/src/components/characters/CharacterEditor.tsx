import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCharacterStore } from '../../store/characterStore';
import { useToastStore } from '../../store/toastStore';
import type { Character } from '../../types/domain';
import { CharacterForm } from './CharacterForm';
import { CharacterRelationshipsEditor } from './CharacterRelationshipsEditor';
import { CharacterGroupsEditor } from './CharacterGroupsEditor';
import { AvatarUploader } from './AvatarUploader';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import type { CharacterInput } from '../../types/api';

export function CharacterEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const characters = useCharacterStore((s) => s.characters);
  const status = useCharacterStore((s) => s.status);
  const fetch = useCharacterStore((s) => s.fetch);
  const create = useCharacterStore((s) => s.create);
  const update = useCharacterStore((s) => s.update);
  const uploadAvatar = useCharacterStore((s) => s.uploadAvatar);
  const pushToast = useToastStore((s) => s.push);

  const [saving, setSaving] = useState(false);
  const isNew = id === 'new';

  useEffect(() => {
    if (characters.length === 0) void fetch();
  }, [characters.length, fetch]);

  const character: Character | undefined = isNew ? undefined : characters.find((c) => c._id === id);

  const handleSave = async (draft: CharacterInput) => {
    setSaving(true);
    try {
      if (isNew) {
        const created = await create(draft);
        navigate(`/characters/${created._id}`);
      } else if (id) {
        await update(id, draft);
        pushToast('Character saved', 'success');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && !character && status !== 'loading') {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <h1 className="text-xl font-semibold text-slate-100">Character not found</h1>
        <p className="text-sm text-slate-400">
          We couldn't find that character. It may have been deleted or you don't have access to it.
        </p>
        <Button variant="secondary" onClick={() => navigate('/characters')}>
          Back to characters
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
        {isNew ? 'New character' : character ? character.name : '...'}
      </h1>

      {!isNew && character && (
        <AvatarUploader
          currentUrl={character.avatarUrl}
          characterName={character.name}
          onUpload={(file) => uploadAvatar(character._id, file)}
        />
      )}

      {!isNew && !character ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-5">
          <CharacterForm
            initial={character ?? null}
            onSave={handleSave}
            onCancel={() => navigate('/characters')}
            saving={saving}
          />
          {character && (
            <div className="mt-6 border-t border-slate-800/80 pt-5">
              <CharacterRelationshipsEditor
                characterId={character._id}
                available={characters}
                value={character.relationships}
                onChange={(rels) => {
                  void update(character._id, { relationships: rels });
                }}
                lookup={(cid) => characters.find((c) => c._id === cid)}
              />
            </div>
          )}
          {character && (
            <div className="mt-6 border-t border-slate-800/80 pt-5">
              <CharacterGroupsEditor characterId={character._id} groupIds={character.groupIds} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
