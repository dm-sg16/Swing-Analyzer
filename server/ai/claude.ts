import path from 'path';
import {
  analysisResultsSchema,
  type AnalysisOptions,
  type AnalysisResults,
  type SwingStats,
} from '@shared/schema';
import {
  ProviderResponseError,
  type StatsChatResult,
  type SwingAnalyzer,
} from './types';
import {
  swingAnalysisSystemPrompt,
  swingAnalysisUserPrompt,
} from './prompts';
import { runClaudeCli } from './claudeCli';

const DEFAULT_MODEL = 'opus';

const ANALYSIS_JSON_INSTRUCTION =
  '\n\nReturn ONLY a JSON object inside a ```json code fence matching this schema:\n' +
  '{ "score": <1-10>, "strengths": [string, ...], "improvements": [string, ...], ' +
  '"keyFrames": [{ "time": <number>, "description": <string>, "annotations": [...] }], ' +
  '"recommendedDrills": [{ "title": <string>, "description": <string> }] }\n' +
  'Include at least 5 entries in recommendedDrills. Do not include any text outside the JSON fence.';

function resolveImagePath(uploadPath: string): string {
  // Route layer stores image URLs like "/uploads/foo.jpg" relative to project root.
  const cleaned = uploadPath.startsWith('/') ? uploadPath.slice(1) : uploadPath;
  return path.resolve(process.cwd(), cleaned);
}

export class ClaudeAnalyzer implements SwingAnalyzer {
  async analyzeSwing(
    videoUrl: string | null,
    imageUrls: string[] | null,
    stats: SwingStats,
    options: AnalysisOptions,
  ): Promise<AnalysisResults> {
    const isSimpleMode = (options as any).simpleMode === true;
    let userPrompt = swingAnalysisUserPrompt(stats, options, videoUrl, imageUrls?.length ?? 0);

    let allowedTools = '';
    let addDir: string | undefined;
    if (imageUrls && imageUrls.length > 0) {
      const absPaths = imageUrls.map(resolveImagePath);
      addDir = path.dirname(absPaths[0]);
      allowedTools = 'Read';
      userPrompt += '\n\nImages to analyze (use the Read tool to access them):\n' +
        absPaths.map((p) => `- ${p}`).join('\n');
    }

    userPrompt += ANALYSIS_JSON_INSTRUCTION;

    const text = await runClaudeCli({
      prompt: userPrompt,
      systemPrompt: swingAnalysisSystemPrompt(isSimpleMode),
      model: DEFAULT_MODEL,
      allowedTools,
      addDir,
    });

    const fenceMatch = text.match(/```json\n([\s\S]*?)\n```/);
    const looseMatch = text.match(/{[\s\S]*}/);
    const jsonStr = fenceMatch ? fenceMatch[1] : looseMatch ? looseMatch[0] : null;
    if (!jsonStr) {
      throw new ProviderResponseError('Claude returned no parseable JSON.', 'claude');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new ProviderResponseError(`Claude returned invalid JSON: ${(e as Error).message}`, 'claude');
    }
    const validation = analysisResultsSchema.safeParse(parsed);
    if (!validation.success) {
      throw new ProviderResponseError(`Claude returned malformed analysis: ${validation.error.message}`, 'claude');
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
