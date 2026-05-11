import { describe, it, expect } from 'vitest';
import { getAnalyzer } from '../index';
import { ClaudeAnalyzer } from '../claude';
import { GeminiAnalyzer } from '../gemini';

describe('getAnalyzer', () => {
  it("returns ClaudeAnalyzer for 'claude'", () => {
    expect(getAnalyzer('claude')).toBeInstanceOf(ClaudeAnalyzer);
  });

  it("returns GeminiAnalyzer for 'gemini'", () => {
    expect(getAnalyzer('gemini')).toBeInstanceOf(GeminiAnalyzer);
  });

  it('throws for unknown provider strings', () => {
    expect(() => getAnalyzer('bogus' as any)).toThrow(/unknown provider/i);
  });
});
