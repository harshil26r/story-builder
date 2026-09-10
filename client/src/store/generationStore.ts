import { create } from 'zustand';
import type { AppError, ID } from '../types/domain';
import type { SnapshotEvent } from '../types/domain';
import { streamSSE } from '../services/sse';
import { useToastStore } from './toastStore';

type RowStatus = 'idle' | 'streaming' | 'done' | 'error';

interface GenerationState {
  job: {
    status: RowStatus;
    storyId: ID | null;
    chapterIndex: number | null;
    fullText: string;
    latestSummary: string | null;
    snapshot: { jobId: string; fullTextSoFar: string } | null;
    error: AppError | null;
  };
  start(route: 'chapter' | 'node' | 'polish' | 'regenerate' | 'continue', storyId: ID, payload: unknown): Promise<void>;
  resume(): Promise<void>;
  abort(): void;
  reset(): void;
}

const ROUTE_PATHS: Record<string, string> = {
  chapter: '/api/ai/generate-chapter',
  node: '/api/ai/generate-node',
  polish: '/api/ai/polish-draft',
  regenerate: '/api/ai/regenerate',
  continue: '/api/ai/continue',
};

let controller: AbortController | null = null;

export const useGenerationStore = create<GenerationState>((set, get) => ({
  job: {
    status: 'idle',
    storyId: null,
    chapterIndex: null,
    fullText: '',
    latestSummary: null,
    snapshot: null,
    error: null,
  },

  start: async (route, storyId, payload) => {
    get().abort();
    controller = new AbortController();
    set({
      job: {
        status: 'streaming',
        storyId,
        chapterIndex: (payload as { chapterIndex?: number })?.chapterIndex ?? null,
        fullText: '',
        latestSummary: null,
        snapshot: null,
        error: null,
      },
    });

    const path = ROUTE_PATHS[route];
    try {
      await streamSSE(
        path,
        payload,
        {
          onDocStart: () => set({}),
          onDelta: (text) =>
            set((s) => ({ job: { ...s.job, fullText: s.job.fullText + text } })),
          onSummary: (summary) => set((s) => ({ job: { ...s.job, latestSummary: summary } })),
          onSnapshot: (snap: SnapshotEvent) =>
            set((s) => ({ job: { ...s.job, snapshot: { jobId: snap.jobId, fullTextSoFar: snap.fullTextSoFar } } })),
          onDone: () => {
            set((s) => ({ job: { ...s.job, status: 'done' } }));
            useToastStore.getState().push('Generation complete', 'success');
          },
          onError: (err: AppError) => {
            set((s) => ({ job: { ...s.job, status: 'error', error: err } }));
          },
          onClose: () => {
            // no-op — already handled by onDone/onError
          },
        },
        controller.signal,
      );
    } catch (e) {
      if (!controller.signal.aborted) {
        const err = e as AppError;
        set((s) => ({ job: { ...s.job, status: 'error', error: err } }));
      }
    }
  },

  resume: async () => {
    const { job } = get();
    if (!job.snapshot || !job.storyId) return;
    const payload = {
      storyId: job.storyId,
      chapterIndex: job.chapterIndex,
      resumeGenerationId: job.snapshot.jobId,
    };
    await get().start('chapter', job.storyId, payload);
  },

  abort: () => {
    if (controller) {
      controller.abort();
      controller = null;
    }
    set((s) => ({ job: { ...s.job, status: s.job.status === 'streaming' ? 'idle' : s.job.status } }));
  },

  reset: () => {
    if (controller) {
      controller.abort();
      controller = null;
    }
    set({
      job: {
        status: 'idle',
        storyId: null,
        chapterIndex: null,
        fullText: '',
        latestSummary: null,
        snapshot: null,
        error: null,
      },
    });
  },
}));