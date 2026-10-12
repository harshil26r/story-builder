// StoryBuilder SSE streaming helper (SPEC §3.3, TICKET-53/57).
// Sets the SSE headers once, keeps HTTP at 200, surfaces service errors as an
// `error` event (never an HTML 500), and aborts the in-flight work when the
// client disconnects so orphaned generations are killed.

export function sseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
}

export function sseStream(req, res, work) {
  sseHeaders(res);
  res.flushHeaders?.();

  const io = {
    send(event, data) {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    },
  };

  const ac = new AbortController();
  const onClose = () => ac.abort();
  res.on('close', onClose);
  req.on('close', onClose);

  work({ io, signal: ac.signal })
    .then(() => {
      if (!res.writableEnded) res.end();
    })
    .catch((err) => {
      io.send('error', {
        code: (err && err.code) || 'INTERNAL_ERROR',
        message: (err && err.message) || 'Something went wrong.',
      });
      if (!res.writableEnded) res.end();
    });
}
