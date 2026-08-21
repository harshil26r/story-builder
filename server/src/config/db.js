import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://127.0.0.1/story-builder';

export default async function connectDB(uriOverride) {
  const uri = uriOverride || process.env.MONGO_URI || DEFAULT_URI;
  try {
    await mongoose.connect(uri);
    return true;
  } catch (err) {
    console.error(`[db] Failed to connect to ${uri.replace(/\/\/.*@/, '://***@')}:`, err.message);
    process.exit(1);
  }
}
