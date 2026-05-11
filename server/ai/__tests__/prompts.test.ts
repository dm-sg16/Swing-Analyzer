import { describe, it, expect } from 'vitest';
import {
  swingAnalysisSystemPrompt,
  swingAnalysisUserPrompt,
  statsChatSystemPrompt,
  analysisQuestionPrompt,
} from '../prompts';

describe('prompts', () => {
  it('swingAnalysisSystemPrompt selects simple mode wording', () => {
    const p = swingAnalysisSystemPrompt(true);
    expect(p).toContain('youth baseball coach');
    expect(p).toContain('parents');
  });

  it('swingAnalysisSystemPrompt selects advanced mode wording', () => {
    const p = swingAnalysisSystemPrompt(false);
    expect(p).toContain('professional baseball coach');
    expect(p).toContain('biomechanics');
  });

  it('swingAnalysisUserPrompt embeds knowledge base and stats', () => {
    const p = swingAnalysisUserPrompt(
      { batSpeed: 65, exitVelocity: 88 } as any,
      { analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true },
      'video',
      0,
    );
    expect(p).toContain('Bat Speed: 65');
    expect(p).toContain('Exit Velocity: 88');
    expect(p).toContain('overall technique');
    expect(p).toContain('balance, posture');
    expect(p).toContain('recommendations');
    expect(p).toContain('A video of the swing was provided');
  });

  it('swingAnalysisUserPrompt mentions image count when provided', () => {
    const p = swingAnalysisUserPrompt(
      {} as any,
      { analyzeTechnique: false, analyzeMechanics: false, analyzeRecommendations: false },
      null,
      3,
    );
    expect(p).toContain('3 image(s)');
  });

  it('statsChatSystemPrompt mentions extraction targets', () => {
    const p = statsChatSystemPrompt();
    expect(p).toContain('batSpeed');
    expect(p).toContain('exitVelocity');
    expect(p).toContain('launchAngle');
  });

  it('analysisQuestionPrompt embeds the user message', () => {
    const p = analysisQuestionPrompt('What about hip rotation?');
    expect(p).toContain('What about hip rotation?');
    expect(p).toContain('3-4 sentences maximum');
  });
});
