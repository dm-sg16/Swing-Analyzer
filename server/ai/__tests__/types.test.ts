import { describe, it, expect } from 'vitest';
import {
  ProviderAuthError,
  ProviderResponseError,
  ProviderInputError,
} from '../types';

describe('error classes', () => {
  it('ProviderAuthError carries provider tag', () => {
    const err = new ProviderAuthError('login required', 'claude');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ProviderAuthError);
    expect(err.name).toBe('ProviderAuthError');
    expect(err.message).toBe('login required');
    expect(err.provider).toBe('claude');
  });

  it('ProviderResponseError carries provider tag', () => {
    const err = new ProviderResponseError('bad json', 'gemini');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ProviderResponseError);
    expect(err.provider).toBe('gemini');
  });

  it('ProviderInputError carries provider tag', () => {
    const err = new ProviderInputError('image too large', 'claude');
    expect(err).toBeInstanceOf(ProviderInputError);
    expect(err.provider).toBe('claude');
  });
});
