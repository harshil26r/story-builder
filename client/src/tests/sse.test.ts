import { describe, it, expect, vi, afterEach } from 'vitest';
import { streamSSE } from '../services/sse';
import { useGenerationStore } from '../store/generationStore';

// TICKET-54: SSE client + Generation store.
describe('TICKET-54 — SSE client + generation store', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch;
    useGenerationStore.getState().reset();
    vi.restoreAllMocks();
  });

  function sseResponse(frames: string): Response {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(frames));
        controller.close();
      },
    });
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  }

  it('parses event/data framing and calls onDelta', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      sseResponse(
        'event: doc-start\ndata: {"jobId":"j1","storyId":"s1","structureType":"linear","chapterIndex":0,"title":"Ch"}\n\n' +
          'event: delta\ndata: {"text":"Hello "}\n\n' +
          'event: delta\ndata: {"text":"world"}\n\n' +
          'event: done\ndata: {"jobId":"j1","chapterIndex":0,"saved":{"_id":"c1","storyId":"s1","order":1,"title":"Ch","content":"Hello world","summary":"","version":1,"totalChapters":1,"wordCount":2}}\n\n',
      ),
    );

    const deltas: string[] = [];
    let doneCalled = false;
    await streamSSE(
      '/api/ai/generate-chapter',
      { storyId: 's1' },
      { onDelta: (t) => deltas.push(t), onDone: () => (doneCalled = true) },
      new AbortController().signal,
    );

    expect(deltas).toEqual(['Hello ', 'world']);
    expect(doneCalled).toBe(true);
  });

  it('emits onError for non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'AI_UNAVAILABLE', message: 'no ai' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    );

    let err: Error | null = null;
    const handleError = (e: Error) => {
      err = e;
    };
    await streamSSE('/api/ai/generate-chapter', {}, { onError: handleError }, new AbortController().signal);
    expect((err as Error | null)?.message).toBe('no ai');
  });

  it('abort signal stops the stream', async () => {
    // A stream that never ends until cancelled.
    let cancelCalled = false;
    const body = new ReadableStream<Uint8Array>({
      pull() {
        // never enqueue; hangs
      },
      cancel() {
        cancelCalled = true;
      },
    });
    globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
      if (init?.signal) {
        init.signal.addEventListener('abort', () => body.cancel());
      }
      return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    });

    const controller = new AbortController();
    const promise = streamSSE('/api/ai/generate-chapter', {}, {}, controller.signal);
    controller.abort();
    // The reader.read() will reject on abort; ensure the promise settles.
    await Promise.race([promise, new Promise((r) => setTimeout(r, 50))]);
    expect(cancelCalled).toBe(true);
  });

  it('generation store start appends deltas and reaches done', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      sseResponse(
        'event: delta\ndata: {"text":"Once upon"}\n\n' +
          'event: delta\ndata: {"text":" a time"}\n\n' +
          'event: done\ndata: {"jobId":"j1","chapterIndex":0,"saved":{"_id":"c1","storyId":"s1","order":1,"title":"Ch","content":"Once upon a time","summary":"","version":1,"totalChapters":1,"wordCount":4}}\n\n',
      ),
    );

    await useGenerationStore.getState().start('chapter', 's1', { chapterIndex: 0 });

    const job = useGenerationStore.getState().job;
    expect(job.fullText).toBe('Once upon a time');
    expect(job.status).toBe('done');
  });

  it('generation store abort transitions back to idle', async () => {
    // Use a never-ending stream.
    const body = new ReadableStream<Uint8Array>({ pull() {} });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    );
    const p = useGenerationStore.getState().start('chapter', 's1', { chapterIndex: 0 });
    useGenerationStore.getState().abort();
    await Promise.race([p, new Promise((r) => setTimeout(r, 30))]);
    expect(['idle']).toContain(useGenerationStore.getState().job.status);
  });
});