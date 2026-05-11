import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRunClaudeCli } = vi.hoisted(() => ({
  mockRunClaudeCli: vi.fn(),
}));

vi.mock('../claudeCli', () => ({
  runClaudeCli: mockRunClaudeCli,
}));

import { ClaudeAnalyzer } from '../claude';
import { ProviderResponseError } from '../types';

const validAnalysisJson = JSON.stringify({
  score: 8,
  strengths: ['solid stance'],
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

describe('ClaudeAnalyzer.analyzeSwing', () => {
  beforeEach(() => {
    mockRunClaudeCli.mockReset();
  });

  it('parses JSON-fenced CLI response into AnalysisResults', async () => {
    mockRunClaudeCli.mockResolvedValueOnce('Here you go:\n```json\n' + validAnalysisJson + '\n```');
    const analyzer = new ClaudeAnalyzer();
    const result = await analyzer.analyzeSwing(
      null, null, {} as any,
      { analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true },
    );
    expect(result.score).toBe(8);
    expect(result.strengths).toEqual(['solid stance']);
    expect(result.recommendedDrills).toHaveLength(5);
  });

  it('passes opus model and selects advanced system prompt by default', async () => {
    mockRunClaudeCli.mockResolvedValueOnce('```json\n' + validAnalysisJson + '\n```');
    const analyzer = new ClaudeAnalyzer();
    await analyzer.analyzeSwing(
      null, null, {} as any,
      { analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true },
    );
    const callOpts = mockRunClaudeCli.mock.calls[0][0];
    expect(callOpts.model).toBe('opus');
    expect(callOpts.systemPrompt).toContain('professional baseball coach');
    expect(callOpts.allowedTools).toBe('');
    expect(callOpts.addDir).toBeUndefined();
  });

  it('selects simple-mode system prompt when options.simpleMode is true', async () => {
    mockRunClaudeCli.mockResolvedValueOnce('```json\n' + validAnalysisJson + '\n```');
    const analyzer = new ClaudeAnalyzer();
    await analyzer.analyzeSwing(
      null, null, {} as any,
      { analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true, simpleMode: true } as any,
    );
    const callOpts = mockRunClaudeCli.mock.calls[0][0];
    expect(callOpts.systemPrompt).toContain('youth baseball coach');
  });

  it('enables Read tool, adds image dir, and lists absolute image paths in prompt when imageUrls provided', async () => {
    mockRunClaudeCli.mockResolvedValueOnce('```json\n' + validAnalysisJson + '\n```');
    const analyzer = new ClaudeAnalyzer();
    await analyzer.analyzeSwing(
      null,
      ['/uploads/swing-a.jpg', '/uploads/swing-b.jpg'],
      {} as any,
      { analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true },
    );
    const callOpts = mockRunClaudeCli.mock.calls[0][0];
    expect(callOpts.allowedTools).toBe('Read');
    expect(callOpts.addDir).toBeTruthy();
    expect(callOpts.addDir).toMatch(/uploads$/);
    expect(callOpts.prompt).toContain('Images to analyze');
    expect(callOpts.prompt).toContain('swing-a.jpg');
    expect(callOpts.prompt).toContain('swing-b.jpg');
  });

  it('throws ProviderResponseError when CLI response has no JSON', async () => {
    mockRunClaudeCli.mockResolvedValueOnce('I cannot analyze this swing right now.');
    const analyzer = new ClaudeAnalyzer();
    await expect(
      analyzer.analyzeSwing(null, null, {} as any, {
        analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true,
      }),
    ).rejects.toBeInstanceOf(ProviderResponseError);
  });

  it('throws ProviderResponseError when JSON fails analysisResultsSchema validation', async () => {
    mockRunClaudeCli.mockResolvedValueOnce('```json\n{"score":"not a number"}\n```');
    const analyzer = new ClaudeAnalyzer();
    await expect(
      analyzer.analyzeSwing(null, null, {} as any, {
        analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true,
      }),
    ).rejects.toBeInstanceOf(ProviderResponseError);
  });

  it('propagates errors from runClaudeCli (e.g. ProviderAuthError)', async () => {
    const { ProviderAuthError } = await import('../types');
    mockRunClaudeCli.mockRejectedValueOnce(new ProviderAuthError('auth required', 'claude'));
    const analyzer = new ClaudeAnalyzer();
    await expect(
      analyzer.analyzeSwing(null, null, {} as any, {
        analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true,
      }),
    ).rejects.toBeInstanceOf(ProviderAuthError);
  });
});

describe('ClaudeAnalyzer.analyzeImage', () => {
  beforeEach(() => {
    mockRunClaudeCli.mockReset();
  });

  it('returns the raw CLI text response', async () => {
    mockRunClaudeCli.mockResolvedValueOnce('STRENGTHS:\n- good stance\nIMPROVEMENTS:\n- hip rotation');
    const analyzer = new ClaudeAnalyzer();
    const result = await analyzer.analyzeImage('/uploads/frame.jpg', 'analyze this frame', true);
    expect(result).toContain('STRENGTHS');
  });

  it('configures Read tool, addDir, and image path in prompt', async () => {
    mockRunClaudeCli.mockResolvedValueOnce('ok');
    const analyzer = new ClaudeAnalyzer();
    await analyzer.analyzeImage('/uploads/frame.jpg', 'analyze this frame', false);
    const callOpts = mockRunClaudeCli.mock.calls[0][0];
    expect(callOpts.allowedTools).toBe('Read');
    expect(callOpts.addDir).toMatch(/uploads$/);
    expect(callOpts.prompt).toMatch(/Image to analyze.*frame\.jpg/);
    expect(callOpts.prompt).toContain('professional baseball coach');
  });

  it('selects simple-mode preamble when isSimpleMode is true', async () => {
    mockRunClaudeCli.mockResolvedValueOnce('ok');
    const analyzer = new ClaudeAnalyzer();
    await analyzer.analyzeImage('/uploads/frame.jpg', 'analyze', true);
    const callOpts = mockRunClaudeCli.mock.calls[0][0];
    expect(callOpts.prompt).toContain('youth baseball coach');
  });
});
