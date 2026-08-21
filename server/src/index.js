import dotenv from 'dotenv';
dotenv.config();

import createApp from './app.js';
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
