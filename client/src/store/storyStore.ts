import { create } from 'zustand';
import type { Story, StorySummary, AsyncStatus, AppError, ID } from '../types/domain';
import type {
  StoryCreateRequest,
  StoryUpdateRequest,
  RegenerateChapterRequest,
  ContinueRequest,
} from '../types/api';
import { storiesApi } from '../services/api';
import { useToastStore } from './toastStore';

export type ConflictState = { storyId: ID; version: number } | null;

interface StoryState {
  stories: StorySummary[];
  current: Story | null;
  status: AsyncStatus;
  error: AppError | null;
  conflict: ConflictState;
  fetchList(): Promise<void>;
  fetchOne(id: ID, opts?: { withVersions?: boolean }): Promise<void>;
  create(req: StoryCreateRequest): Promise<ID>;
  update(id: ID, patch: StoryUpdateRequest, opts?: { silent?: boolean }): Promise<void>;
  remove(id: ID): Promise<void>;
  publish(id: ID, isPublic: boolean): Promise<string>;
  regenerate(id: ID, req: RegenerateChapterRequest): Promise<void>;
  continue_(id: ID, req: ContinueRequest): Promise<void>;
  clearError(): void;
  clearConflict(): void;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: [],
  current: null,
  status: 'idle',
  error: null,
  conflict: null,

  fetchList: async () => {
    set({ status: 'loading', error: null });
    try {
      const { stories } = await storiesApi.list();
      set({ stories, status: stories.length === 0 ? 'empty' : 'success' });
    } catch (e) {
      const err = e as AppError;
      set({ error: err, status: 'error' });
    }
  },

  fetchOne: async (id, opts) => {
    set({ status: 'loading', error: null });
    try {
      const story = await storiesApi.get(id, opts);
      set({ current: story, status: 'success' });
    } catch (e) {
      const err = e as AppError;
      set({ error: err, status: 'error' });
    }
  },

  create: async (req) => {
    set({ status: 'loading', error: null });
    try {
      const { story } = await storiesApi.create(req);
      set((s) => ({ stories: [summaryOf(story), ...s.stories], status: 'success' }));
      useToastStore.getState().push(`Story "${story.title}" created`, 'success');
      return story._id;
    } catch (e) {
      const err = e as AppError;
      set({ error: err, status: 'error' });
      throw err;
    }
  },

  update: async (id, patch, opts) => {
    if (patch.baseVersion === undefined && get().current) {
      patch = { ...patch, baseVersion: get().current?.version ?? 1 };
    }
    try {
      const { story } = await storiesApi.update(id, patch);
      set((s) => ({
        current: s.current && s.current._id === id ? story : s.current,
        stories: s.stories.map((st) => (st._id === id ? summaryOf(story) : st)),
        status: 'success',
      }));
      if (!opts?.silent) {
        useToastStore.getState().push('Story updated', 'success');
      }
    } catch (e) {
      const err = e as AppError;
      if (err.code === 'CONFLICT') {
        set({
          conflict: { storyId: id, version: patch.baseVersion ?? -1 },
          error: err,
          status: 'error',
        });
      } else {
        set({ error: err, status: 'error' });
      }
      if (!opts?.silent) {
        useToastStore.getState().push(err.message, 'error');
      }
      throw err;
    }
  },

  remove: async (id) => {
    await storiesApi.remove(id);
    set((s) => ({
      stories: s.stories.filter((st) => st._id !== id),
      current: s.current?._id === id ? null : s.current,
    }));
    useToastStore.getState().push('Story deleted', 'info');
  },

  publish: async (id, isPublic) => {
    const { shareToken } = await storiesApi.publish(id, isPublic);
    set((s) => ({
      stories: s.stories.map((st) => (st._id === id ? { ...st, isPublic } : st)),
      current:
        s.current && s.current._id === id ? { ...s.current, isPublic, shareToken } : s.current,
    }));
    useToastStore.getState().push(isPublic ? 'Story published' : 'Story unpublished', 'success');
    return shareToken;
  },

  regenerate: async (id, req) => {
    await storiesApi.regenerateChapter(id, req);
  },

  continue_: async (id, req) => {
    await storiesApi.continue_(id, req);
  },

  clearError: () => set({ error: null }),
  clearConflict: () => set({ conflict: null }),
}));

function summaryOf(story: Story): StorySummary {
  return {
    _id: story._id,
    title: story.title,
    structureType: story.structureType,
    status: story.status,
    totalChapters: story.totalChapters,
    wordCount: story.wordCount,
    coverImageUrl: story.coverImageUrl,
    updatedAt: story.updatedAt,
    isPublic: story.isPublic,
  };
}
