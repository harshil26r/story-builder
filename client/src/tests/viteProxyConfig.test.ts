import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Vite Proxy Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.VITE_API_TARGET;
    delete process.env.PORT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const getViteConfig = async () => {
    const mod = await import('../../vite.config');
    const config = mod.default;
    if (typeof config === 'function') {
      return config({ mode: 'development', command: 'serve' });
    }
    return config;
  };

  it('defines server.port as 5173', async () => {
    const config = await getViteConfig();
    expect(config.server?.port).toBe(5173);
  });

  it('resolves default target to http://localhost:5000', async () => {
    const config = await getViteConfig();
    const proxy = config.server?.proxy as Record<string, { target?: string; ws?: boolean; changeOrigin?: boolean; secure?: boolean; bypass?: any }> | undefined;
    expect(proxy?.['/api'].target).toBe('http://localhost:5000');
    expect(proxy?.['^/s/.*'].target).toBe('http://localhost:5000');
    expect(proxy?.['/s']).toBeUndefined();
    expect(proxy?.['/uploads'].target).toBe('http://localhost:5000');
  });

  it('respects PORT override', async () => {
    process.env.PORT = '5002';
    const config = await getViteConfig();
    const proxy = config.server?.proxy as Record<string, { target?: string; ws?: boolean; changeOrigin?: boolean; secure?: boolean; bypass?: any }> | undefined;
    expect(proxy?.['/api'].target).toBe('http://localhost:5002');
    expect(proxy?.['^/s/.*'].target).toBe('http://localhost:5002');
  });

  it('respects VITE_API_TARGET override over PORT', async () => {
    process.env.PORT = '5002';
    process.env.VITE_API_TARGET = 'http://localhost:5001';
    const config = await getViteConfig();
    const proxy = config.server?.proxy as Record<string, { target?: string; ws?: boolean; changeOrigin?: boolean; secure?: boolean; bypass?: any }> | undefined;
    expect(proxy?.['/api'].target).toBe('http://localhost:5001');
    expect(proxy?.['^/s/.*'].target).toBe('http://localhost:5001');
  });

  it('validates exact proxy configuration options for /api, ^/s/.*, /uploads', async () => {
    const config = await getViteConfig();
    const proxy = config.server?.proxy as Record<string, { target?: string; ws?: boolean; changeOrigin?: boolean; secure?: boolean; bypass?: any }> | undefined;
    
    expect(proxy?.['/api']).toMatchObject({
      changeOrigin: true,
      secure: false,
      ws: true
    });
    
    expect(proxy?.['^/s/.*']).toMatchObject({
      changeOrigin: true,
      secure: false,
    });
    expect(proxy?.['^/s/.*'].ws).toBeUndefined();

    expect(proxy?.['/uploads']).toMatchObject({
      changeOrigin: true,
      secure: false,
    });
    expect(proxy?.['/uploads'].ws).toBeUndefined();
  });

  it('bypasses proxy to /index.html when request accepts text/html', async () => {
    const config = await getViteConfig();
    const proxy = config.server?.proxy as any;
    const bypassFn = proxy?.['^/s/.*']?.bypass;
    
    expect(bypassFn).toBeDefined();
    expect(bypassFn({ headers: { accept: 'text/html,application/xhtml+xml' } })).toBe('/index.html');
  });

  it('does not bypass proxy for API requests', async () => {
    const config = await getViteConfig();
    const proxy = config.server?.proxy as any;
    const bypassFn = proxy?.['^/s/.*']?.bypass;
    
    expect(bypassFn).toBeDefined();
    expect(bypassFn({ headers: { accept: 'application/json' } })).toBeUndefined();
    expect(bypassFn({ headers: {} })).toBeUndefined();
  });
});
