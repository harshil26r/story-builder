import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer as createViteServer } from 'vite';
import type { ViteDevServer } from 'vite';
import http from 'http';
import path from 'path';

describe('Vite Proxy Routing Integration', () => {
  let backendServer: http.Server;
  let viteServer: ViteDevServer;
  let backendPort: number;
  let vitePort: number;
  const originalEnv = process.env;

  beforeAll(async () => {
    // 1. Start mock backend server
    backendServer = http.createServer((req, res) => {
      if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else if (req.url?.startsWith('/s/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ shareId: req.url.split('/')[2] }));
      } else if (req.url?.startsWith('/uploads/')) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end('fake-image-bytes');
      } else if (req.url === '/api/ai/stream') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        
        // Write chunks immediately and with delays to simulate stream
        res.write('event: chunk\ndata: {"text":"part1"}\n\n');
        setTimeout(() => {
          res.write('event: chunk\ndata: {"text":"part2"}\n\n');
        }, 10);
        setTimeout(() => {
          res.end('event: chunk\ndata: [DONE]\n\n');
        }, 30);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => {
      backendServer.listen(0, '127.0.0.1', () => {
        backendPort = (backendServer.address() as any).port;
        resolve();
      });
    });

    // 2. Set environment to override proxy target
    process.env = { ...originalEnv };
    process.env.VITE_API_TARGET = `http://localhost:${backendPort}`;

    // 3. Start Vite dev server with actual config
    viteServer = await createViteServer({
      configFile: path.resolve(__dirname, '../../vite.config.ts'),
      server: { 
        port: 0, // random port
        host: '127.0.0.1' 
      },
    });
    await viteServer.listen();
    vitePort = viteServer.config.server.port!;
  });

  afterAll(async () => {
    process.env = originalEnv;
    await viteServer?.close();
    await new Promise<void>((resolve) => {
      backendServer?.close(() => resolve());
    });
  });

  it('routes /api/health to mock backend', async () => {
    const res = await fetch(`http://127.0.0.1:${vitePort}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });

  it('serves /src/main.tsx from Vite and not intercepted by proxy', async () => {
    const res = await fetch(`http://127.0.0.1:${vitePort}/src/main.tsx`);
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') || '';
    expect(contentType).toContain('javascript');
    const text = await res.text();
    expect(text).toContain('import');
  });

  it('routes /s/* to mock backend when Accept is application/json', async () => {
    const res = await fetch(`http://127.0.0.1:${vitePort}/s/share-xyz`, {
      headers: { Accept: 'application/json' }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.shareId).toBe('share-xyz');
  });

  it('returns index.html for /s/* when Accept is text/html (SPA fallback)', async () => {
    const res = await fetch(`http://127.0.0.1:${vitePort}/s/share-xyz`, {
      headers: { Accept: 'text/html' }
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<div id="root">');
    expect(text).toContain('/src/main.tsx');
  });

  it('returns index.html for unknown routes like /dashboard (SPA fallback)', async () => {
    const res = await fetch(`http://127.0.0.1:${vitePort}/dashboard`, {
      headers: { Accept: 'text/html' }
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<div id="root">');
  });

  it('routes /uploads/* to mock backend', async () => {
    const res = await fetch(`http://127.0.0.1:${vitePort}/uploads/sample.png`);
    expect(res.status).toBe(200);
    const data = await res.text();
    expect(data).toBe('fake-image-bytes');
  });

  it('streams SSE correctly through the proxy', async () => {
    const res = await fetch(`http://127.0.0.1:${vitePort}/api/ai/stream`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const reader = res.body?.getReader();
    expect(reader).toBeDefined();
    
    let receivedText = '';
    const decoder = new TextDecoder();
    
    // Read stream until done
    while (true) {
      const { done, value } = await reader!.read();
      if (value) {
        receivedText += decoder.decode(value, { stream: true });
      }
      if (done) {
        receivedText += decoder.decode();
        break;
      }
    }

    expect(receivedText).toContain('event: chunk\ndata: {"text":"part1"}\n\n');
    expect(receivedText).toContain('event: chunk\ndata: {"text":"part2"}\n\n');
    expect(receivedText).toContain('event: chunk\ndata: [DONE]\n\n');
  });
});
