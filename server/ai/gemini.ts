import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fs from 'fs';
import {
  analysisResultsSchema,
  type AnalysisOptions,
  type AnalysisResults,
  type SwingStats,
} from '@shared/schema';
import {
  ProviderAuthError,
  ProviderResponseError,
  type StatsChatResult,
  type SwingAnalyzer,
} from './types';
import { swingAnalysisUserPrompt } from './prompts';

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

const MODEL_NAME = 'gemini-1.5-pro-latest';

export class GeminiAnalyzer implements SwingAnalyzer {
  private getClient(): GoogleGenerativeAI {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new ProviderAuthError(
        'Gemini API key not configured. Set GEMINI_API_KEY in your environment.',
        'gemini',
      );
    }
    return new GoogleGenerativeAI(key);
  }

  async analyzeSwing(
    videoUrl: string | null,
    imageUrls: string[] | null,
    stats: SwingStats,
    options: AnalysisOptions,
  ): Promise<AnalysisResults> {
    const isSimpleMode = (options as any).simpleMode === true;
    const userPrompt = swingAnalysisUserPrompt(stats, options, videoUrl, imageUrls?.length ?? 0);

    const systemPreamble = isSimpleMode
      ? 'You are a youth baseball coach who explains swing mechanics to parents in plain language. '
      : 'You are a professional baseball swing analysis expert. Use technical baseball terminology. ';

    const fullPrompt =
      systemPreamble +
      userPrompt +
      '\n\nProvide the analysis in the following JSON format inside a ```json code fence:\n' +
      '{ "score": <1-10>, "strengths": [...], "improvements": [...], ' +
      '"keyFrames": [{ "time": <number>, "description": "...", "annotations": [...] }], ' +
      '"recommendedDrills": [{ "title": "...", "description": "..." }] }';

    const client = this.getClient();
    const model = client.getGenerativeModel({ model: MODEL_NAME, safetySettings: SAFETY_SETTINGS });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: { temperature: 0.4, topK: 32, topP: 0.95, maxOutputTokens: 4096 },
    });
    const text = result.response.text();

    const fenceMatch = text.match(/```json\n([\s\S]*?)\n```/);
    const looseMatch = text.match(/{[\s\S]*}/);
    const jsonStr = fenceMatch ? fenceMatch[1] : looseMatch ? looseMatch[0] : null;
    if (!jsonStr) {
      throw new ProviderResponseError('Gemini returned no parseable JSON.', 'gemini');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      throw new ProviderResponseError(`Gemini returned invalid JSON: ${(err as Error).message}`, 'gemini');
    }

    const validation = analysisResultsSchema.safeParse(parsed);
    if (!validation.success) {
      throw new ProviderResponseError(
        `Gemini returned malformed analysis: ${validation.error.message}`,
        'gemini',
      );
    }
    return validation.data;
  }

  async analyzeImage(_imagePath: string, _prompt: string, _isSimpleMode: boolean): Promise<string> {
    throw new Error('not implemented');
  }

  async analyzeStatsChat(_message: string): Promise<StatsChatResult> {
    throw new Error('not implemented');
  }

  async answerAnalysisQuestion(_message: string): Promise<string> {
    throw new Error('not implemented');
  }
}
