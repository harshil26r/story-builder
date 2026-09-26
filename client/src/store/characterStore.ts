import { create } from 'zustand';
import type { Character, CharacterGroup, AsyncStatus, AppError, ID } from '../types/domain';
import { charactersApi, characterGroupsApi } from '../services/api';
import type { CharacterInput } from '../types/api';
import { useToastStore } from './toastStore';

interface CharacterState {
  characters: Character[];
  status: AsyncStatus;
  error: AppError | null;
  groups: CharacterGroup[];
  groupsStatus: AsyncStatus;
  groupsError: AppError | null;
  fetch(): Promise<void>;
  create(input: CharacterInput): Promise<Character>;
  update(id: ID, patch: Partial<CharacterInput>): Promise<void>;
  remove(id: ID): Promise<void>;
  duplicate(id: ID): Promise<void>;
  uploadAvatar(id: ID, file: File): Promise<string>;
  setGroups(id: ID, groupIds: ID[]): Promise<void>;
  fetchGroups(): Promise<void>;
  createGroup(name: string): Promise<CharacterGroup>;
  renameGroup(id: ID, name: string): Promise<void>;
  removeGroup(id: ID): Promise<void>;
  clearError(): void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  characters: [],
  status: 'idle',
  error: null,
  groups: [],
  groupsStatus: 'idle',
  groupsError: null,

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
    set((s) => ({
      characters: s.characters.map((c) => (c._id === id ? character : c)),
      status: 'success',
    }));
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

  setGroups: async (id, groupIds) => {
    const { character } = await charactersApi.setGroups(id, groupIds);
    set((s) => ({ characters: s.characters.map((c) => (c._id === id ? character : c)) }));
  },

  fetchGroups: async () => {
    set({ groupsStatus: 'loading', groupsError: null });
    try {
      const { groups } = await characterGroupsApi.list();
      set({ groups, groupsStatus: groups.length === 0 ? 'empty' : 'success' });
    } catch (e) {
      const err = e as AppError;
      set({ groupsError: err, groupsStatus: 'error' });
    }
  },

  createGroup: async (name) => {
    const { group } = await characterGroupsApi.create(name);
    set((s) => ({ groups: [...s.groups, group], groupsStatus: 'success' }));
    useToastStore.getState().push(`Group "${group.name}" created`, 'success');
    return group;
  },

  renameGroup: async (id, name) => {
    const { group } = await characterGroupsApi.rename(id, name);
    set((s) => ({ groups: s.groups.map((g) => (g._id === id ? group : g)) }));
    useToastStore.getState().push(`Group renamed to "${group.name}"`, 'success');
  },

  removeGroup: async (id) => {
    await characterGroupsApi.remove(id);
    set((s) => ({
      groups: s.groups.filter((g) => g._id !== id),
      characters: s.characters.map((c) => ({
        ...c,
        groupIds: c.groupIds.filter((g) => g !== id),
      })),
    }));
    useToastStore.getState().push('Group deleted', 'info');
  },

  clearError: () => set({ error: null }),
}));

export const selectCharacterById = (characters: Character[], id: ID): Character | undefined =>
  characters.find((c) => c._id === id);
