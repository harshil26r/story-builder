// ════════════════════════════════════════════════════════════════════════════
// Story Builder — fetch-based SSE reader (SPEC §3.3 / §4.3)
// NOT EventSource (needs POST + x-csrf-token + structured JSON bodies).
// Reads fetch res.body via ReadableStream, parses `event:`/`data:` framing
// (RFC 4009: multiline data supported). Accumulates buffer; multi-byte safe.
// ── WARNING: never decode per-chunk to string for display; a UTF-16 surrogate
//    pair may split across delta frames. Append raw TextEncoder-buffered bytes.
// ════════════════════════════════════════════════════════════════════════════

import { AppError } from '../types/domain';
import { getCookie, CSRF_COOKIE_NAME } from './api';
import type {
  DocStartEvent,
  DeltaEvent,
  SummaryEvent,
  SnapshotEvent,
  DoneEvent,
  ErrorEventBody,
} from '../types/domain';

export interface SSEHandlers {
  onDocStart?(e: DocStartEvent): void;
  onDelta?(text: string): void;
  onSummary?(s: string): void;
  onSnapshot?(s: SnapshotEvent): void;
  onDone?(d: DoneEvent): void;
  onError?(err: AppError): void;
  onClose?(): void;
}

/** 4009-style frame parser for a ReadableStream<Uint8Array>. */
export async function streamSSE(
  path: string,
  body: unknown,
  handlers: SSEHandlers,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'x-csrf-token': getCookie(CSRF_COOKIE_NAME) ?? '',
    },
    credentials: 'same-origin',
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let errBody: ErrorEventBody | undefined;
    try {
      errBody = (await res.json()) as ErrorEventBody;
    } catch {
      errBody = undefined;
    }
    const appErr = new AppError(
      errBody?.code ?? String(res.status),
      errBody?.message ?? res.statusText,
    );
    handlers.onError?.(appErr);
    handlers.onClose?.();
    return;
  }

  if (!res.body) {
    handlers.onError?.(new AppError('NO_BODY', 'Stream has no body.'));
    handlers.onClose?.();
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');

  // RFC 4009 buffer: lines split by \n; data may span multiple `data:` lines.
  let pendingEvent = '';
  const dataLines: string[] = [];
  let buf = '';

  const flushDispatch = () => {
    if (!pendingEvent) {
      dataLines.length = 0;
      return;
    }
    const data = dataLines.join('\n');
    handleFrame({ event: pendingEvent, data }, handlers);
    pendingEvent = '';
    dataLines.length = 0;
  };

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // Split on \n\n (each frame terminator = blank line). RFC 4009 also
      // terminates on `\r\n\r\n`; normalize \r out for simplicity.
      buf = buf.replace(/\r\n/g, '\n');
      let sep: number;
      while ((sep = buf.indexOf('\n\n')) !== -1) {
        const frame = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) pendingEvent = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
          else if (line === '') flushDispatch();
        }
        flushDispatch();
      }
    }
    // flush trailing data
    flushDispatch();
  } catch (e) {
    if (!signal.aborted) {
      handlers.onError?.(
        new AppError('STREAM_ERROR', e instanceof Error ? e.message : 'Stream read failed.'),
      );
    }
  } finally {
    reader.releaseLock();
    if (signal.aborted) handlers.onClose?.();
  }
}

function handleFrame(frame: { event: string; data: string }, handlers: SSEHandlers): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(frame.data);
  } catch {
    parsed = frame.data;
  }
  switch (frame.event) {
    case 'doc-start':
      handlers.onDocStart?.(parsed as DocStartEvent);
      break;
    case 'delta':
      handlers.onDelta?.((parsed as DeltaEvent).text ?? '');
      break;
    case 'summary':
      handlers.onSummary?.((parsed as SummaryEvent).summary ?? '');
      break;
    case 'snapshot':
      handlers.onSnapshot?.(parsed as SnapshotEvent);
      break;
    case 'done':
      handlers.onDone?.(parsed as DoneEvent);
      break;
    case 'error':
      handlers.onError?.(
        new AppError((parsed as ErrorEventBody).code, (parsed as ErrorEventBody).message),
      );
      handlers.onClose?.();
      break;
    default:
      break;
  }
}
