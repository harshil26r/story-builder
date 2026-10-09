import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const mConnect = vi.spyOn(mongoose, 'connect').mockImplementation(() => Promise.resolve());

// Mock process.exit so a failure doesn't kill the test runner.
const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined);

beforeEach(() => {
  mConnect.mockClear();
  exitSpy.mockClear();
  delete process.env.MONGO_URI;
});

describe('connectDB', () => {
  it('calls mongoose.connect with the provided MONGO_URI env var', async () => {
    process.env.MONGO_URI = 'mongodb://test:27017/story';
    const { default: connectDB } = await import('../config/db.js');
    await connectDB();
    expect(mConnect).toHaveBeenCalledWith('mongodb://test:27017/story');
  });

  it('defaults to mongodb://127.0.0.1/story-builder when MONGO_URI is unset', async () => {
    const { default: connectDB } = await import('../config/db.js');
    await connectDB();
    expect(mConnect).toHaveBeenCalledWith('mongodb://127.0.0.1/story-builder');
  });

  it('logs an error and calls process.exit(1) on connection failure', async () => {
    const err = new Error('connection refused');
    mConnect.mockImplementationOnce(() => Promise.reject(err));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { default: connectDB } = await import('../config/db.js');
    await connectDB();
    expect(consoleError).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    consoleError.mockRestore();
  });
});
