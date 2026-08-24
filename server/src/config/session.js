import MongoStore from 'connect-mongo';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_S = Math.floor(SEVEN_DAYS_MS / 1000);

export default function createSessionMiddleware(uri) {
  const mongoUrl = uri || process.env.MONGO_URI || 'mongodb://127.0.0.1/story-builder';
  return {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    name: 'connect.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SEVEN_DAYS_MS,
    },
    store: MongoStore.create({
      mongoUrl,
      ttl: SEVEN_DAYS_S,
      collectionName: 'sessions',
      autoRemove: 'native',
    }),
  };
}