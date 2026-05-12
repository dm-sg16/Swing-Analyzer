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

describe('GeminiAnalyzer.analyzeImage', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('returns the model text response with image data attached', async () => {
    const fs = await import('fs');
    const os = await import('os');
    const path = await import('path');
    const tmpFile = path.join(os.tmpdir(), `gemini-test-${Date.now()}.jpg`);
    fs.writeFileSync(tmpFile, Buffer.from('fake-image-bytes'));

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'STRENGTHS: ...\nIMPROVEMENTS: ...' },
    });
    const analyzer = new GeminiAnalyzer();
    const result = await analyzer.analyzeImage(tmpFile, 'analyze this frame', true);
    expect(result).toContain('STRENGTHS');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const parts = callArgs.contents[0].parts;
    expect(parts.some((p: any) => p.inlineData?.mimeType === 'image/jpeg')).toBe(true);
    expect(parts.some((p: any) => /youth baseball coach/.test(p.text ?? ''))).toBe(true);

    fs.unlinkSync(tmpFile);
  });

  it('throws ProviderAuthError when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const analyzer = new GeminiAnalyzer();
    await expect(
      analyzer.analyzeImage('/tmp/foo.jpg', 'prompt', false),
    ).rejects.toBeInstanceOf(ProviderAuthError);
  });
});

describe('GeminiAnalyzer.analyzeStatsChat', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('extracts stats and returns response text', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({
        response: { text: () => '{"batSpeed":65,"exitVelocity":88,"launchAngle":15,"attackAngle":10,"timeToContact":0.18,"rotationalAccel":1500}' },
      })
      .mockResolvedValueOnce({
        response: { text: () => 'I see your bat speed is 65 mph and exit velocity 88 mph. Nice swing!' },
      });
    const analyzer = new GeminiAnalyzer();
    const result = await analyzer.analyzeStatsChat('My bat speed is 65 and EV is 88');
    expect(result.stats?.batSpeed).toBe(65);
    expect(result.stats?.exitVelocity).toBe(88);
    expect(result.response).toContain('65');
  });

  it('throws ProviderAuthError when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const analyzer = new GeminiAnalyzer();
    await expect(analyzer.analyzeStatsChat('whatever')).rejects.toBeInstanceOf(ProviderAuthError);
  });
});

describe('GeminiAnalyzer.answerAnalysisQuestion', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('returns the answer text', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Your hip rotation is the main issue. Work on torque drills.' },
    });
    const analyzer = new GeminiAnalyzer();
    const result = await analyzer.answerAnalysisQuestion('What about hip rotation?');
    expect(result).toContain('hip rotation');
  });

  it('throws ProviderAuthError when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const analyzer = new GeminiAnalyzer();
    await expect(analyzer.answerAnalysisQuestion('q?')).rejects.toBeInstanceOf(ProviderAuthError);
  });
});
