import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'DANGEROUS_CONTENT',
    },
    HarmBlockThreshold: { BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH' },
  };
});

import { GeminiAnalyzer } from '../gemini';
import { ProviderAuthError, ProviderResponseError } from '../types';

const validAnalysisJson = JSON.stringify({
  score: 8,
  strengths: ['good stance'],
  improvements: ['hip rotation'],
  keyFrames: [{ time: 0.5, description: 'contact', annotations: [] }],
  recommendedDrills: [
    { title: 'Drill 1', description: 'Do X' },
    { title: 'Drill 2', description: 'Do Y' },
    { title: 'Drill 3', description: 'Do Z' },
    { title: 'Drill 4', description: 'Do W' },
    { title: 'Drill 5', description: 'Do V' },
  ],
});

describe('GeminiAnalyzer.analyzeSwing', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('parses JSON-fence response into AnalysisResults', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => '```json\n' + validAnalysisJson + '\n```' },
    });
    const analyzer = new GeminiAnalyzer();
    const result = await analyzer.analyzeSwing(
      null,
      null,
      {} as any,
      { analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true },
    );
    expect(result.score).toBe(8);
    expect(result.strengths).toEqual(['good stance']);
    expect(result.recommendedDrills).toHaveLength(5);
  });

  it('throws ProviderAuthError when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const analyzer = new GeminiAnalyzer();
    await expect(
      analyzer.analyzeSwing(null, null, {} as any, {
        analyzeTechnique: true,
        analyzeMechanics: true,
        analyzeRecommendations: true,
      }),
    ).rejects.toBeInstanceOf(ProviderAuthError);
  });

  it('throws ProviderResponseError when no JSON found in response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'I cannot analyze this swing.' },
    });
    const analyzer = new GeminiAnalyzer();
    await expect(
      analyzer.analyzeSwing(null, null, {} as any, {
        analyzeTechnique: true,
        analyzeMechanics: true,
        analyzeRecommendations: true,
      }),
    ).rejects.toBeInstanceOf(ProviderResponseError);
  });
});
