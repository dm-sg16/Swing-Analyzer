import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveProvider } from '../routes-helpers';

describe('resolveProvider', () => {
  let originalEnv: string | undefined;
  beforeEach(() => {
    originalEnv = process.env.AI_PROVIDER;
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalEnv;
  });

  it('uses body.provider when present', () => {
    process.env.AI_PROVIDER = 'gemini';
    expect(resolveProvider({ provider: 'claude' })).toBe('claude');
  });

  it('falls back to env.AI_PROVIDER', () => {
    process.env.AI_PROVIDER = 'gemini';
    expect(resolveProvider({})).toBe('gemini');
  });

  it("falls back to 'claude' when neither body nor env set", () => {
    delete process.env.AI_PROVIDER;
    expect(resolveProvider({})).toBe('claude');
  });

  it('rejects invalid body.provider value', () => {
    expect(() => resolveProvider({ provider: 'openai' as any })).toThrow();
  });
});
