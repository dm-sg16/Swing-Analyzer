import { ClaudeAnalyzer } from './claude';
import { GeminiAnalyzer } from './gemini';
import type { Provider, SwingAnalyzer } from './types';

export function getAnalyzer(provider: Provider): SwingAnalyzer {
  switch (provider) {
    case 'claude':
      return new ClaudeAnalyzer();
    case 'gemini':
      return new GeminiAnalyzer();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export * from './types';
