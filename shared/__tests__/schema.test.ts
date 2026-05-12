import { describe, it, expect } from 'vitest';
import { providerSchema } from '../schema';

describe('providerSchema', () => {
  it("accepts 'claude'", () => {
    expect(providerSchema.parse('claude')).toBe('claude');
  });

  it("accepts 'gemini'", () => {
    expect(providerSchema.parse('gemini')).toBe('gemini');
  });

  it('rejects unknown values', () => {
    expect(() => providerSchema.parse('openai')).toThrow();
  });

  it('is optional in compatible parent schemas', () => {
    expect(providerSchema.optional().parse(undefined)).toBeUndefined();
  });
});
