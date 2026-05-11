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

function resolveImagePath(p: string): string {
  if (path.isAbsolute(p)) return p;
  const cleaned = p.startsWith('/') ? p.slice(1) : p;
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

  async analyzeImage(imagePath: string, prompt: string, isSimpleMode: boolean): Promise<string> {
    const absPath = resolveImagePath(imagePath);
    const audiencePreamble = isSimpleMode
      ? 'You are a youth baseball coach explaining swing mechanics to parents in plain language. '
      : 'You are a professional baseball coach with deep technical knowledge. ';
    const fullPrompt = audiencePreamble + prompt +
      `\n\nImage to analyze (use the Read tool): ${absPath}`;

    return runClaudeCli({
      prompt: fullPrompt,
      model: DEFAULT_MODEL,
      allowedTools: 'Read',
      addDir: path.dirname(absPath),
    });
  }

  async analyzeStatsChat(_message: string): Promise<StatsChatResult> {
    throw new Error('not implemented');
  }

  async answerAnalysisQuestion(_message: string): Promise<string> {
    throw new Error('not implemented');
  }
}
