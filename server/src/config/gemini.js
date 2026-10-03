import { GoogleGenAI } from '@google/genai';

// StoryBuilder AI config (SPEC §7.1, ACR-B-16, ACR-X-04) — Gemini provider.
// GoogleGenAI is wrapped behind an Anthropic-shaped { messages: { create,
// stream } } adapter so aiService's streaming/SSE event protocol and prompt
// code stay provider-agnostic. Env-gated: with a key the client is
// initialized; without one we export a null client and the AI endpoints answer
// 503 AI_UNAVAILABLE. The module must never throw on import.

const DEFAULT_MODEL = 'gemini-3.6-flash';
const DEFAULT_MAX_TOKENS = 6000;

function readApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  return null;
}

// Gemini roles are 'user'/'model'; Anthropic messages use 'assistant'.
function toGeminiContents(messages = []) {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : String(m.content ?? '') }],
  }));
}

// Accepts an Anthropic-style system array (or string) and flattens the block
// texts into the single string Gemini takes in config.systemInstruction.
// Prompt-caching markers (cache_control) are provider-specific and ignored.
function toSystemInstruction(system) {
  if (!system) return undefined;
  const blocks = Array.isArray(system) ? system : [system];
  const text = blocks
    .map((b) => (typeof b === 'string' ? b : b && typeof b.text === 'string' ? b.text : ''))
    .filter(Boolean)
    .join('\n\n');
  return text || undefined;
}

// Gemini FinishReason → the StopReason strings aiService switches on: only
// MAX_TOKENS continues the overflow rounds (SPEC §3.4, ACR-B-15). Everything
// else (STOP, SAFETY, RECITATION, …) ends the turn.
function mapFinishReason(reason) {
  return reason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn';
}

// Guards a provider request so a hung Gemini call can never stall generation
// forever. The caller's signal and an internal deadline are folded into one
// AbortSignal passed to the SDK; the deadline timer is cleared when the stream
// terminates so tests leave no dangling handles.
const DEFAULT_TIMEOUT_MS = Number(process.env.AI_PROVIDER_TIMEOUT_MS) || 90000;

function makeRequestSignal(opts) {
  const timeoutMs = Number.isFinite(opts && opts.timeoutMs) ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const cleanups = [];
  if (opts && opts.signal) {
    if (opts.signal.aborted) {
      controller.abort();
    } else {
      const onAbort = () => controller.abort();
      opts.signal.addEventListener('abort', onAbort, { once: true });
      cleanups.push(() => opts.signal.removeEventListener('abort', onAbort));
    }
  }
  if (timeoutMs > 0 && !controller.signal.aborted) {
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    cleanups.push(() => clearTimeout(timer));
  }
  return { requestSignal: controller.signal, cleanup: () => cleanups.forEach((fn) => fn()) };
}

function makeMessagesAdapter(genai) {
  async function create(body) {
    const systemInstruction = toSystemInstruction(body.system);
    const res = await genai.models.generateContent({
      model: body.model,
      contents: toGeminiContents(body.messages),
      config: {
        ...(body.max_tokens ? { maxOutputTokens: body.max_tokens } : {}),
        ...(systemInstruction ? { systemInstruction } : {}),
      },
    });
    const content = (res.candidates || [])
      .flatMap((c) => c.content?.parts || [])
      .filter((p) => p && typeof p.text === 'string')
      .map((p) => ({ type: 'text', text: p.text }));
    return { content };
  }

  async function stream(body, opts = {}) {
    const systemInstruction = toSystemInstruction(body.system);
    const { requestSignal, cleanup } = makeRequestSignal(opts);
    let response;
    try {
      response = await genai.models.generateContentStream({
        model: body.model,
        contents: toGeminiContents(body.messages),
        config: {
          ...(body.max_tokens ? { maxOutputTokens: body.max_tokens } : {}),
          ...(systemInstruction ? { systemInstruction } : {}),
          abortSignal: requestSignal,
        },
      });
    } catch (err) {
      cleanup();
      throw err;
    }

    // Gemini chunks carry the CUMULATIVE candidate text; emit only the delta
    // since the previous chunk so consumers get Anthropic-style text_deltas.
    async function* toAnthropicEvents() {
      let emittedLen = 0;
      let finished = false;
      try {
        for await (const chunk of response) {
          if (requestSignal.aborted) return;
          const text = chunk.text || '';
          if (text.length > emittedLen) {
            yield {
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: text.slice(emittedLen) },
            };
            emittedLen = text.length;
          }
          const finishReason = chunk.candidates?.[0]?.finishReason;
          if (finishReason) {
            finished = true;
            if (emittedLen === 0) {
              // Degenerate throttled completion (finish reason but no text —
              // seen live as MAX_TOKENS with an empty body under load). Surface
              // it so aiService never commits an empty chapter.
              yield { type: 'error', error: { message: 'Gemini returned an empty response.' } };
              return;
            }
            yield {
              type: 'message_delta',
              delta: {
                stop_reason: mapFinishReason(finishReason),
                usage: { output_tokens: chunk.usageMetadata?.candidatesTokenCount ?? 0 },
              },
            };
            yield { type: 'message_stop' };
            return;
          }
        }
        if (!finished) {
          yield {
            type: 'error',
            error: { message: 'Gemini stream ended without a finish reason.' },
          };
        }
      } catch (err) {
        if (requestSignal.aborted) return;
        yield {
          type: 'error',
          error: { message: err && err.message ? err.message : 'Gemini stream error.' },
        };
      } finally {
        cleanup();
      }
    }
    return toAnthropicEvents();
  }

  return { messages: { create, stream } };
}

let client = null;
const apiKey = readApiKey();
if (apiKey) {
  const options = { apiKey };
  if (process.env.GEMINI_BASE_URL) options.baseUrl = process.env.GEMINI_BASE_URL;
  const genai = new GoogleGenAI(options);
  client = makeMessagesAdapter(genai);
} else {
  // eslint-disable-next-line no-console
  console.warn(
    '[gemini] GEMINI_API_KEY / GOOGLE_API_KEY absent — AI endpoints will return 503 AI_UNAVAILABLE',
  );
}

const model = process.env.AI_MODEL || DEFAULT_MODEL;
const maxTokensPerChapter = Number(process.env.AI_MAX_TOKENS_PER_CHAPTER) || DEFAULT_MAX_TOKENS;

export default { client, model, maxTokensPerChapter, available: Boolean(client) };
export { client, model, maxTokensPerChapter };
