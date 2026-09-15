import { describe, it, expect } from 'vitest';
import { expect as chaiExpect } from 'chai';

describe('raw chai assertThrows', () => {
  it('chai .to.throw("msg") on throwing fn', () => {
    chaiExpect(() => { throw new Error('nope2'); }).to.throw('nope2');
  });

  it('rejects.toThrow with message object', async () => {
    const err = new Error('nope');
    err.name = 'AppError';
    (err as { code?: string }).code = 'UNKNOWN';
    await expect(Promise.reject(err)).rejects.toThrow('nope');
  });

  it('rejects.toThrow with plain AppError-like', async () => {
    await expect(Promise.reject(Object.assign(new Error('nope'), { code: 'UNKNOWN' }))).rejects.toThrow('nope');
  });
});