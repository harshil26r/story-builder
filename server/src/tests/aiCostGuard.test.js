import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { aiCostGuard, recordAiUsage } from '../middleware/rateLimit.js';

// TICKET-51: AI cost guard — per-user window units (1 for generate,
// 1 + chapters for regenerate), day token budget, window pruning. ACR-B-16.

function fakeReq(overrides = {}) {
  return { session: { userId: 'u1' }, body: {}, ...overrides };
}
function fakeRes() {
  const res = {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    setHeader() {
      return this;
    },
  };
  return res;
}

function callGuard(req, res) {
  const next = vi.fn();
  return aiCostGuard(req, res, next).then(() => ({ res, next }));
}

describe('AI cost guard (TICKET-51)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-ai-cost-guard';
  let user;

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await User.syncIndexes();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    user = await User.create({
      name: 'Aria',
      email: `aria-${Date.now()}@example.com`,
      passwordHash: '$2b$12$XXXXX',
      isEmailVerified: true,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  it('reserves 1 unit for a plain generate request and records it on the user', async () => {
    const req = fakeReq({ session: { userId: String(user._id) } });
    const { res, next } = await callGuard(req, fakeRes());
    expect(next).toHaveBeenCalledWith();
    expect(res.statusCode).toBe(200);

    const fresh = await User.findById(user._id);
    expect(fresh.aiUsage.calls).toHaveLength(1);
    expect(fresh.aiUsage.calls[0].units).toBe(1);
  });

  it('weights regenerate as 1 + chapters (body.units)', async () => {
    const req = fakeReq({ session: { userId: String(user._id) }, body: { units: 6 } });
    const { next } = await callGuard(req, fakeRes());
    expect(next).toHaveBeenCalledWith();

    const fresh = await User.findById(user._id);
    expect(fresh.aiUsage.calls[0].units).toBe(6);
  });

  it('returns 429 RATE_LIMITED when the window units would be exceeded', async () => {
    // Seed 15 units already used in the window.
    const calls = Array.from({ length: 15 }, (_, i) => ({
      at: new Date(Date.now() - i * 60_000),
      units: 1,
      storyId: null,
    }));
    await User.updateOne({ _id: user._id }, { 'aiUsage.calls': calls });

    const req = fakeReq({ session: { userId: String(user._id) }, body: { units: 1 } });
    const { res } = await callGuard(req, fakeRes());
    expect(res.statusCode).toBe(429);
    expect(res.payload.code).toBe('RATE_LIMITED');
    expect(res.payload.retryAfterSec).toBeTruthy();
  });

  it('prunes calls outside the window before counting', async () => {
    // Only an old call remains — should be pruned, so a new request passes.
    await User.updateOne(
      { _id: user._id },
      { 'aiUsage.calls': [{ at: new Date(Date.now() - 90 * 60_000), units: 15, storyId: null }] },
    );

    const req = fakeReq({ session: { userId: String(user._id) } });
    const { res, next } = await callGuard(req, fakeRes());
    expect(next).toHaveBeenCalledWith();
    expect(res.statusCode).toBe(200);

    const fresh = await User.findById(user._id);
    expect(fresh.aiUsage.calls).toHaveLength(1);
  });

  it('resets dayTokens when the UTC day rolls over', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await User.updateOne(
      { _id: user._id },
      { 'aiUsage.dayKey': yesterday, 'aiUsage.dayTokens': 500_000 },
    );

    const req = fakeReq({ session: { userId: String(user._id) } });
    const { next } = await callGuard(req, fakeRes());
    expect(next).toHaveBeenCalledWith();

    const fresh = await User.findById(user._id);
    expect(fresh.aiUsage.dayTokens).toBe(0);
    expect(fresh.aiUsage.dayKey).toBe(new Date().toISOString().slice(0, 10));
  });

  it('returns 429 DAY_BUDGET_EXCEEDED when dayTokens exceed the budget', async () => {
    await User.updateOne(
      { _id: user._id },
      {
        'aiUsage.dayKey': new Date().toISOString().slice(0, 10),
        'aiUsage.dayTokens': 1_000_001,
        'aiUsage.dayBudgetExceededAt': new Date(),
      },
    );

    const req = fakeReq({ session: { userId: String(user._id) } });
    const { res } = await callGuard(req, fakeRes());
    expect(res.statusCode).toBe(429);
    expect(res.payload.code).toBe('DAY_BUDGET_EXCEEDED');
  });

  it('rejects unsigned requests with UNAUTHORIZED', async () => {
    const { res, next } = await callGuard(fakeReq({ session: {} }), fakeRes());
    expect(res.statusCode).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].code).toBe('UNAUTHORIZED');
  });

  it('recordAiUsage appends tokens to dayTokens via updateOne', async () => {
    await recordAiUsage(String(user._id), 1200);
    const fresh = await User.findById(user._id);
    expect(fresh.aiUsage.dayTokens).toBe(1200);
  });
});
