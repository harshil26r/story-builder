import { describe, it, expect, afterEach, vi } from 'vitest';
import createApp from '../app.js';

// Boot-time configuration guards. These only construct the app (no listen);
// mongod is reachable locally for the session store.
describe('createApp boot guards', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-app-boot';

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses to boot in production without SESSION_SECRET', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', '');
    await expect(createApp(MONGO)).rejects.toThrow(/SESSION_SECRET/);
  });

  it('sets trust proxy when TRUST_PROXY=true', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('TRUST_PROXY', 'true');
    const app = await createApp(MONGO, { disableRateLimits: true });
    expect(app.get('trust proxy')).toBe(1);
  });

  it('honours TRUST_PROXY_HOPS', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('TRUST_PROXY', 'true');
    vi.stubEnv('TRUST_PROXY_HOPS', '2');
    const app = await createApp(MONGO, { disableRateLimits: true });
    expect(app.get('trust proxy')).toBe(2);
  });
});
