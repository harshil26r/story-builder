import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// The .env contract lives at the repo root; load it explicitly because
// `npm -w server run dev` starts this file with server/ as CWD.
// NOTE: dynamic import so mailer.js & co. (which read env at module scope)
// are evaluated *after* env vars are set.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const { default: createApp } = await import('./app.js');
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1/story-builder';

async function main() {
  await connectDB(MONGO_URI);
  const app = await createApp(MONGO_URI);
  app.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] fatal:', err);
  process.exit(1);
});
