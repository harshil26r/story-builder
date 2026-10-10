import { describe, it, expect, vi, beforeEach } from 'vitest';

// TICKET-49: AI config (Gemini client). Env-gated GoogleGenAI client behind the
// Anthropic-shaped { messages: { create, stream } } seam that aiService consumes,
// plus the adapter converting Gemini stream chunks back into Anthropic-style
// events ('content_block_delta' text deltas → 'message_delta' stop_reason →
// 'message_stop') so aiService.consumeStream keeps working unchanged.

const GenAIMock = vi.fn();
const fakeModels = {};
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(...args) {
      GenAIMock(...args);
      this.models = fakeModels;
    }
  },
}));

describe('gemini config (TICKET-49)', () => {
  beforeEach(() => {
    GenAIMock.mockReset();
    Object.keys(fakeModels).forEach((k) => delete fakeModels[k]);
    vi.resetModules();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_BASE_URL;
    delete process.env.AI_MODEL;
    delete process.env.AI_MAX_TOKENS_PER_CHAPTER;
  });

  it('with GEMINI_API_KEY set, initializes GoogleGenAI with apiKey + baseUrl', async () => {
    process.env.GEMINI_API_KEY = 'AIza-test-key';
    process.env.GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';

    const { default: gemini } = await import('../config/gemini.js');

    expect(GenAIMock).toHaveBeenCalledTimes(1);
    expect(GenAIMock.mock.calls[0][0]).toEqual({
      apiKey: 'AIza-test-key',
      baseUrl: 'https://generativelanguage.googleapis.com',
    });
    expect(gemini.client).toBeTruthy();
    expect(gemini.available).toBe(true);
  });

  it('falls back to GOOGLE_API_KEY when GEMINI_API_KEY is absent', async () => {
    process.env.GOOGLE_API_KEY = 'AIza-fallback';

    const { default: gemini } = await import('../config/gemini.js');

    expect(GenAIMock).toHaveBeenCalledTimes(1);
    expect(GenAIMock.mock.calls[0][0].apiKey).toBe('AIza-fallback');
    expect(gemini.available).toBe(true);
  });

  it('with no key, exports a null client and logs a warning without crashing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { default: gemini } = await import('../config/gemini.js');

    expect(GenAIMock).not.toHaveBeenCalled();
    expect(gemini.client).toBeNull();
    expect(gemini.available).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('AI_MODEL + AI_MAX_TOKENS_PER_CHAPTER override defaults', async () => {
    process.env.GEMINI_API_KEY = 'AIza-test-key';
    process.env.AI_MODEL = 'gemini-3.6-pro';
    process.env.AI_MAX_TOKENS_PER_CHAPTER = '8000';

    const { default: gemini } = await import('../config/gemini.js');

    expect(gemini.model).toBe('gemini-3.6-pro');
    expect(gemini.maxTokensPerChapter).toBe(8000);
  });

  it('defaults model to gemini-3.6-flash and maxTokensPerChapter to 6000', async () => {
    process.env.GEMINI_API_KEY = 'AIza-test-key';

    const { default: gemini } = await import('../config/gemini.js');

    expect(gemini.model).toBe('gemini-3.6-flash');
    expect(gemini.maxTokensPerChapter).toBe(6000);
  });
});

describe('gemini adapter (Anthropic-shaped seam)', () => {
  beforeEach(() => {
    GenAIMock.mockReset();
    Object.keys(fakeModels).forEach((k) => delete fakeModels[k]);
    vi.resetModules();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_BASE_URL;
    delete process.env.AI_MODEL;
    delete process.env.AI_MAX_TOKENS_PER_CHAPTER;
    process.env.GEMINI_API_KEY = 'AIza-test-key';
  });

  it('messages.create returns Anthropic-shaped content from generateContent', async () => {
    fakeModels.generateContent = vi.fn(async () => ({
      candidates: [{ content: { parts: [{ text: 'Chapter summary.' }] } }],
    }));
    const { default: gemini } = await import('../config/gemini.js');

    const res = await gemini.client.messages.create({
      model: 'gemini-3.6-flash',
      max_tokens: 300,
      system: [{ type: 'text', text: 'Be consistent.' }],
      messages: [{ role: 'user', content: 'Summarize.' }],
    });

    expect(fakeModels.generateContent).toHaveBeenCalledWith({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: 'Summarize.' }] }],
      config: { maxOutputTokens: 300, systemInstruction: 'Be consistent.' },
    });
    expect(res.content).toEqual([{ type: 'text', text: 'Chapter summary.' }]);
  });

  it('maps assistant turns to the model role and joins system blocks for the stream', async () => {
    fakeModels.generateContentStream = vi.fn(async () => {
      async function* gen() {
        yield { text: 'Chapter one.', candidates: [{ finishReason: 'STOP' }] };
      }
      return gen();
    });
    const { default: gemini } = await import('../config/gemini.js');

    const stream = await gemini.client.messages.stream(
      {
        model: 'gemini-3.6-flash',
        max_tokens: 6000,
        system: [
          { type: 'text', text: 'Rules.' },
          { type: 'text', text: 'More rules.' },
        ],
        messages: [
          { role: 'user', content: 'Write.' },
          { role: 'assistant', content: 'Draft.' },
          { role: 'user', content: 'Continue.' },
        ],
      },
      {},
    );
    const events = [];
    for await (const event of stream) events.push(event);

    const streamArg = fakeModels.generateContentStream.mock.calls[0][0];
    expect(streamArg.contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(streamArg.config.systemInstruction).toBe('Rules.\n\nMore rules.');
    expect(events).toEqual([
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'Chapter one.' },
      },
      { type: 'message_delta', delta: { stop_reason: 'end_turn', usage: { output_tokens: 0 } } },
      { type: 'message_stop' },
    ]);
  });

  it('turns cumulative stream text into deltas and maps MAX_TOKENS → max_tokens', async () => {
    fakeModels.generateContentStream = vi.fn(async () => {
      async function* gen() {
        yield { text: 'Hello', candidates: [] };
        yield { text: 'Hello world', candidates: [] };
        yield {
          text: 'Hello world!',
          candidates: [{ finishReason: 'MAX_TOKENS' }],
          usageMetadata: { candidatesTokenCount: 42 },
        };
      }
      return gen();
    });
    const { default: gemini } = await import('../config/gemini.js');

    const stream = await gemini.client.messages.stream(
      { model: 'gemini-3.6-flash', max_tokens: 50, messages: [{ role: 'user', content: 'Go.' }] },
      {},
    );
    const texts = [];
    let stopReason = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta') texts.push(event.delta.text);
      if (event.type === 'message_delta') stopReason = event.delta.stop_reason;
    }
    expect(texts).toEqual(['Hello', ' world', '!']);
    expect(stopReason).toBe('max_tokens');
  });

  it('composes the caller abort signal into the request and stops emitting once aborted', async () => {
    fakeModels.generateContentStream = vi.fn(async () => {
      async function* gen() {
        yield { text: 'A', candidates: [] };
        yield { text: 'AB', candidates: [] };
      }
      return gen();
    });
    const { default: gemini } = await import('../config/gemini.js');

    const controller = new AbortController();
    const stream = await gemini.client.messages.stream(
      { model: 'gemini-3.6-flash', max_tokens: 50, messages: [{ role: 'user', content: 'Go.' }] },
      { signal: controller.signal },
    );
    const callConfig = fakeModels.generateContentStream.mock.calls[0][0].config;
    expect(callConfig.abortSignal).toBeTruthy();
    expect(callConfig.abortSignal).not.toBe(controller.signal);
    const events = [];
    for await (const event of stream) {
      events.push(event);
      controller.abort();
    }
    expect(events).toHaveLength(1);
  });

  it('aborts a provider request that hangs past the request timeout', async () => {
    fakeModels.generateContentStream = vi.fn(
      ({ config }) =>
        new Promise((_, reject) => {
          config.abortSignal.addEventListener(
            'abort',
            () => reject(Object.assign(new Error('provider aborted'), { code: 'ABORTED' })),
            { once: true },
          );
        }),
    );
    const { default: gemini } = await import('../config/gemini.js');

    await expect(
      gemini.client.messages.stream(
        { model: 'gemini-3.6-flash', max_tokens: 50, messages: [{ role: 'user', content: 'Go.' }] },
        { timeoutMs: 25 },
      ),
    ).rejects.toThrow('provider aborted');
    expect(fakeModels.generateContentStream).toHaveBeenCalledTimes(1);
  });

  it('emits an error event when a stream finishes with a finish reason but no text', async () => {
    fakeModels.generateContentStream = vi.fn(async () => {
      async function* gen() {
        yield {
          text: '',
          candidates: [{ finishReason: 'MAX_TOKENS' }],
          usageMetadata: { candidatesTokenCount: 0 },
        };
      }
      return gen();
    });
    const { default: gemini } = await import('../config/gemini.js');

    const stream = await gemini.client.messages.stream(
      { model: 'gemini-3.6-flash', max_tokens: 50, messages: [{ role: 'user', content: 'Go.' }] },
      {},
    );
    const events = [];
    for await (const event of stream) events.push(event);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: 'error',
      error: { message: expect.stringContaining('empty') },
    });
  });

  it('emits an error event when the stream ends without a finish reason', async () => {
    fakeModels.generateContentStream = vi.fn(async () => {
      async function* gen() {
        yield { text: 'Unfinished', candidates: [] };
      }
      return gen();
    });
    const { default: gemini } = await import('../config/gemini.js');

    const stream = await gemini.client.messages.stream(
      { model: 'gemini-3.6-flash', max_tokens: 50, messages: [{ role: 'user', content: 'Go.' }] },
      {},
    );
    const events = [];
    for await (const event of stream) events.push(event);
    expect(events.at(-1)).toEqual({ type: 'error', error: { message: expect.any(String) } });
  });
});
