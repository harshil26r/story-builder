import { create } from 'zustand';
import type { Character, AsyncStatus, AppError, ID } from '../types/domain';
import { charactersApi } from '../services/api';
import type { CharacterInput } from '../types/api';
import { useToastStore } from './toastStore';

interface CharacterState {
  characters: Character[];
  status: AsyncStatus;
  error: AppError | null;
  fetch(): Promise<void>;
  create(input: CharacterInput): Promise<Character>;
  update(id: ID, patch: Partial<CharacterInput>): Promise<void>;
  remove(id: ID): Promise<void>;
  duplicate(id: ID): Promise<void>;
  uploadAvatar(id: ID, file: File): Promise<string>;
  clearError(): void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  characters: [],
  status: 'idle',
  error: null,

  fetch: async () => {
    set({ status: 'loading', error: null });
    try {
      const { characters } = await charactersApi.list();
      set({ characters, status: characters.length === 0 ? 'empty' : 'success' });
    } catch (e) {
      const err = e as AppError;
      set({ error: err, status: 'error' });
    }
  },

  create: async (input) => {
    const { character } = await charactersApi.create(input);
    set((s) => ({ characters: [character, ...s.characters], status: 'success' }));
    useToastStore.getState().push(`Character "${character.name}" created`, 'success');
    return character;
  },

  update: async (id, patch) => {
    const { character } = await charactersApi.update(id, patch);
    set((s) => ({ characters: s.characters.map((c) => (c._id === id ? character : c)), status: 'success' }));
    useToastStore.getState().push(`Character "${character.name}" updated`, 'success');
  },

  remove: async (id) => {
    await charactersApi.remove(id);
    set((s) => ({ characters: s.characters.filter((c) => c._id !== id) }));
    useToastStore.getState().push('Character deleted', 'info');
  },

  duplicate: async (id) => {
    const { character } = await charactersApi.duplicate(id);
    set((s) => ({ characters: [character, ...s.characters] }));
    useToastStore.getState().push(`Duplicated "${character.name}"`, 'success');
  },

  uploadAvatar: async (id, file) => {
    const { avatarUrl } = await charactersApi.uploadAvatar(id, file);
    set((s) => ({ characters: s.characters.map((c) => (c._id === id ? { ...c, avatarUrl } : c)) }));
    return avatarUrl;
  },

  clearError: () => set({ error: null }),
}));

export const selectCharacterById = (characters: Character[], id: ID): Character | undefined =>
  characters.find((c) => c._id === id);