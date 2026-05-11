import type { AnalysisOptions, AnalysisResults, SwingStats } from '@shared/schema';

export type Provider = 'claude' | 'gemini';

export interface StatsChatResult {
  response: string;
  stats?: SwingStats;
}

export interface SwingAnalyzer {
  analyzeSwing(
    videoUrl: string | null,
    imageUrls: string[] | null,
    stats: SwingStats,
    options: AnalysisOptions,
  ): Promise<AnalysisResults>;

  analyzeImage(
    imagePath: string,
    prompt: string,
    isSimpleMode: boolean,
  ): Promise<string>;

  analyzeStatsChat(message: string): Promise<StatsChatResult>;

  answerAnalysisQuestion(message: string): Promise<string>;
}

export class ProviderAuthError extends Error {
  constructor(message: string, public readonly provider: Provider) {
    super(message);
    this.name = 'ProviderAuthError';
  }
}

export class ProviderResponseError extends Error {
  constructor(message: string, public readonly provider: Provider) {
    super(message);
    this.name = 'ProviderResponseError';
  }
}

export class ProviderInputError extends Error {
  constructor(message: string, public readonly provider: Provider) {
    super(message);
    this.name = 'ProviderInputError';
  }
}
