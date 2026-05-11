# Claude / Gemini Provider Abstraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor swing-analyzer's four AI call sites behind a `SwingAnalyzer` interface implemented by both `ClaudeAnalyzer` (subscription-auth via Claude Agent SDK) and `GeminiAnalyzer` (refactored from existing code), selectable per-request from the UI with a server-configured default.

**Architecture:** New `server/ai/` directory holding the interface, shared prompts, both implementations, and a factory. Routes resolve provider from `req.body.provider ?? process.env.AI_PROVIDER ?? 'claude'` and delegate to `getAnalyzer(provider)`. Claude uses tool-use with forced `tool_choice` for structured JSON output; Gemini preserves its existing JSON-fence parsing. No silent fallback — errors surface with the provider name.

**Tech Stack:** Node 18+, Express, TypeScript (strict, ESM, `moduleResolution: bundler`), Vitest, `@anthropic-ai/claude-agent-sdk`, `@google/generative-ai`, zod (via `@shared/schema`).

**Reference spec:** `docs/specs/2026-05-11-claude-gemini-provider-design.md`

**Implementation note on Claude Agent SDK API:** This plan assumes the Agent SDK exposes a `messages.create()`-like API similar to `@anthropic-ai/sdk`. If the actual SDK shape differs (e.g., uses `query()` instead), adapt the call assembly — the test contracts and response-parsing logic are unchanged.

---

## Task 1: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add scripts and dev deps)
- Test: `server/__tests__/smoke.test.ts`

- [ ] **Step 1: Add the smoke test**

Create `server/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
});
```

- [ ] **Step 3: Add scripts and dev deps to `package.json`**

In `package.json` under `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

In `"devDependencies"`, add (versions are starting points — `npm install` will resolve):

```json
"vitest": "^2.1.0",
"@vitest/ui": "^2.1.0"
```

Run:

```bash
npm install
```

- [ ] **Step 4: Run the smoke test**

```bash
npm test
```

Expected: 1 test passing in `server/__tests__/smoke.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json server/__tests__/smoke.test.ts
git commit -m "test: set up vitest with node environment and shared alias"
```

---

## Task 2: Add Claude Agent SDK; remove dead deps

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update dependencies**

In `package.json`:
- Add to `"dependencies"`: `"@anthropic-ai/claude-agent-sdk": "^0.1.0"` (use latest; version is a starting point).
- Remove from `"dependencies"`: `"openai"` and `"@anthropic-ai/sdk"`.
- Keep `"@google/generative-ai"`.

Run:

```bash
npm install
```

- [ ] **Step 2: Verify nothing depends on the removed packages**

```bash
npm run check
```

Expected: TypeScript compiles. If `openai` is still referenced (it shouldn't be — `server/openai.ts` is unused), the compile fails and you'll need to delete the offending import. Do not modify other files in this task — if check fails, capture the error, abort the task, and fix in a dedicated commit.

- [ ] **Step 3: Run tests to confirm nothing broke**

```bash
npm test
```

Expected: smoke test still passes.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add claude-agent-sdk; drop openai and anthropic-ai/sdk"
```

---

## Task 3: Define `SwingAnalyzer` interface and error classes

**Files:**
- Create: `server/ai/types.ts`
- Test: `server/ai/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/ai/__tests__/types.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- server/ai/__tests__/types.test.ts
```

Expected: FAIL — module `../types` not found.

- [ ] **Step 3: Implement `server/ai/types.ts`**

Create `server/ai/types.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- server/ai/__tests__/types.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add server/ai/types.ts server/ai/__tests__/types.test.ts
git commit -m "feat(ai): add SwingAnalyzer interface and provider error classes"
```

---

## Task 4: Extract shared prompts to `server/ai/prompts.ts`

**Files:**
- Create: `server/ai/prompts.ts`
- Test: `server/ai/__tests__/prompts.test.ts`

The current Gemini code embeds prompt construction in `server/gemini.ts:127-267`. Extract into pure functions so both implementations use identical wording.

- [ ] **Step 1: Write the failing test**

Create `server/ai/__tests__/prompts.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- server/ai/__tests__/prompts.test.ts
```

Expected: FAIL — module `../prompts` not found.

- [ ] **Step 3: Implement `server/ai/prompts.ts`**

Create `server/ai/prompts.ts`:

```ts
import type { AnalysisOptions, SwingStats } from '@shared/schema';
import { getKnowledgeBase } from '../knowledge/baseball-swing';

export function swingAnalysisSystemPrompt(isSimpleMode: boolean): string {
  if (isSimpleMode) {
    return [
      'You are a youth baseball coach who specializes in explaining swing mechanics to parents with no baseball experience.',
      'Your goal is to analyze the provided baseball swing using simple, everyday language without technical jargon.',
      'Focus on providing clear, actionable advice that a parent can understand and help their child practice.',
      'Use friendly, encouraging language and avoid technical terms when possible.',
    ].join(' ');
  }
  return [
    'You are a professional baseball coach and swing analysis expert with deep technical knowledge.',
    'Analyze the provided baseball swing using proper baseball terminology and biomechanics concepts.',
    'Your analysis should be technical and detailed, suitable for an experienced coach who understands',
    'advanced swing mechanics and baseball-specific terminology.',
  ].join(' ');
}

export function swingAnalysisUserPrompt(
  stats: SwingStats,
  options: AnalysisOptions,
  videoUrl: string | null,
  imageCount: number,
): string {
  const kb = getKnowledgeBase();
  const parts: string[] = [];

  parts.push('Base your analysis on the following information and provide detailed feedback.');
  parts.push('');
  parts.push('Use the following baseball knowledge base to inform your analysis:');
  parts.push('');
  parts.push(kb.baseballSwingGuide);
  parts.push('');
  parts.push(kb.swingPhaseDefinitions);
  parts.push('');
  parts.push(kb.playerEvaluationCriteria);
  parts.push('');
  parts.push(
    'IMPORTANT: Include at least 5 specific, detailed practice drills in your analysis. ' +
    'Each drill should directly address one of the improvement areas you identify. ' +
    'The drills should be age-appropriate, easily performed with minimal equipment, ' +
    'and include clear step-by-step instructions. Add a specific goal for each drill.',
  );

  if (options.analyzeTechnique) {
    parts.push('Focus on overall technique and swing execution.');
  }
  if (options.analyzeMechanics) {
    parts.push('Evaluate swing mechanics including balance, posture, and path.');
  }
  if (options.analyzeRecommendations) {
    parts.push('Provide specific recommendations for improvement.');
  }

  if (videoUrl) {
    parts.push('A video of the swing was provided showing a full motion swing from setup to follow-through.');
  }
  if (imageCount > 0) {
    parts.push(`${imageCount} image(s) of the swing from different angles were provided.`);
  }

  if (stats && Object.keys(stats).length > 0) {
    parts.push('');
    parts.push('Player statistics:');
    if (stats.batSpeed != null) parts.push(`- Bat Speed: ${stats.batSpeed} mph`);
    if (stats.exitVelocity != null) parts.push(`- Exit Velocity: ${stats.exitVelocity} mph`);
    if (stats.launchAngle != null) parts.push(`- Launch Angle: ${stats.launchAngle} degrees`);
    if (stats.attackAngle != null) parts.push(`- Attack Angle: ${stats.attackAngle} degrees`);
    if (stats.timeToContact != null) parts.push(`- Time to Contact: ${stats.timeToContact} seconds`);
    if (stats.pitchType) parts.push(`- Pitch Type: ${stats.pitchType}`);
    if (stats.additionalContext) parts.push(`- Additional Context: ${stats.additionalContext}`);
  }

  return parts.join('\n');
}

export function statsChatSystemPrompt(): string {
  return [
    'You are a baseball swing analysis assistant. Extract the following swing statistics from the user message:',
    '- batSpeed (number, mph)',
    '- exitVelocity (number, mph)',
    '- launchAngle (number, degrees)',
    '- attackAngle (number, degrees)',
    '- timeToContact (number, ms)',
    '- rotationalAccel (number, deg/s^2)',
    '',
    'Return a friendly, helpful response summarizing what you extracted. Convert any provided values into the listed units.',
  ].join('\n');
}

export function analysisQuestionPrompt(message: string): string {
  return [
    'You are a baseball swing analysis expert. Answer the following question about a swing analysis.',
    'Be specific, helpful, and conversational. Provide actionable insights where possible.',
    '',
    message,
    '',
    'Your response should be 3-4 sentences maximum, unless a detailed explanation is required.',
  ].join('\n');
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- server/ai/__tests__/prompts.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add server/ai/prompts.ts server/ai/__tests__/prompts.test.ts
git commit -m "feat(ai): extract shared prompt builders for swing analysis"
```

---

## Task 5: Build `GeminiAnalyzer` with `analyzeSwing`

**Files:**
- Create: `server/ai/gemini.ts`
- Test: `server/ai/__tests__/gemini.test.ts`

Refactor existing `server/gemini.ts:analyzeSwing` into a class method on `GeminiAnalyzer`. Other methods are stubbed to throw `'not implemented'` and filled in by Tasks 6-8.

- [ ] **Step 1: Write the failing test**

Create `server/ai/__tests__/gemini.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- server/ai/__tests__/gemini.test.ts
```

Expected: FAIL — module `../gemini` not found.

- [ ] **Step 3: Implement `server/ai/gemini.ts`**

Create `server/ai/gemini.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- server/ai/__tests__/gemini.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add server/ai/gemini.ts server/ai/__tests__/gemini.test.ts
git commit -m "feat(ai): add GeminiAnalyzer.analyzeSwing with strict JSON validation"
```

---

## Task 6: `GeminiAnalyzer.analyzeImage`

**Files:**
- Modify: `server/ai/gemini.ts`
- Modify: `server/ai/__tests__/gemini.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `server/ai/__tests__/gemini.test.ts`:

```ts
describe('GeminiAnalyzer.analyzeImage', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('returns the model text response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'STRENGTHS: ...\nIMPROVEMENTS: ...' },
    });
    const fs = await import('fs');
    vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('fake-image'));
    const analyzer = new GeminiAnalyzer();
    const result = await analyzer.analyzeImage('/tmp/foo.jpg', 'analyze this frame', true);
    expect(result).toContain('STRENGTHS');
  });

  it('throws ProviderAuthError when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const analyzer = new GeminiAnalyzer();
    await expect(
      analyzer.analyzeImage('/tmp/foo.jpg', 'prompt', false),
    ).rejects.toBeInstanceOf(ProviderAuthError);
  });
});
```

- [ ] **Step 2: Run the tests to confirm the new ones fail**

```bash
npm test -- server/ai/__tests__/gemini.test.ts
```

Expected: 2 new tests fail (analyzeImage throws "not implemented"); previous tests still pass.

- [ ] **Step 3: Implement `analyzeImage` in `server/ai/gemini.ts`**

Replace the stub `analyzeImage` method with:

```ts
async analyzeImage(imagePath: string, prompt: string, isSimpleMode: boolean): Promise<string> {
  const client = this.getClient();
  const model = client.getGenerativeModel({ model: MODEL_NAME, safetySettings: SAFETY_SETTINGS });

  const imageData = fs.readFileSync(imagePath).toString('base64');
  const audiencePreamble = isSimpleMode
    ? 'You are a youth baseball coach explaining swing mechanics to parents in plain language. '
    : 'You are a professional baseball coach with deep technical knowledge. ';

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: audiencePreamble + prompt },
        { inlineData: { mimeType: 'image/jpeg', data: imageData } },
      ],
    }],
    generationConfig: { temperature: 0.4, topK: 32, topP: 0.95, maxOutputTokens: 4096 },
  });

  return result.response.text();
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- server/ai/__tests__/gemini.test.ts
```

Expected: PASS — 5 tests total.

- [ ] **Step 5: Commit**

```bash
git add server/ai/gemini.ts server/ai/__tests__/gemini.test.ts
git commit -m "feat(ai): add GeminiAnalyzer.analyzeImage for single-image vision"
```

---

## Task 7: `GeminiAnalyzer.analyzeStatsChat`

**Files:**
- Modify: `server/ai/gemini.ts`
- Modify: `server/ai/__tests__/gemini.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `server/ai/__tests__/gemini.test.ts`:

```ts
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

  it('returns an auth error response when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const analyzer = new GeminiAnalyzer();
    await expect(analyzer.analyzeStatsChat('whatever')).rejects.toBeInstanceOf(ProviderAuthError);
  });
});
```

- [ ] **Step 2: Run the tests to confirm the new ones fail**

```bash
npm test -- server/ai/__tests__/gemini.test.ts
```

Expected: 2 new tests fail (`analyzeStatsChat` throws "not implemented"); other tests still pass.

- [ ] **Step 3: Implement `analyzeStatsChat` in `server/ai/gemini.ts`**

Add the import for `statsSchema` to the existing import line:

```ts
import {
  analysisResultsSchema,
  statsSchema,
  type AnalysisOptions,
  type AnalysisResults,
  type SwingStats,
} from '@shared/schema';
```

Add to the imports for prompts:

```ts
import { statsChatSystemPrompt, swingAnalysisUserPrompt } from './prompts';
```

Replace the stub `analyzeStatsChat`:

```ts
async analyzeStatsChat(message: string): Promise<StatsChatResult> {
  const client = this.getClient();
  const model = client.getGenerativeModel({ model: MODEL_NAME });

  const systemPrompt = statsChatSystemPrompt();
  const extractionPrompt = `${systemPrompt}\n\nUser message: "${message}"\n\n` +
    'Extract the swing statistics in JSON format:\n' +
    '{ "batSpeed": number|null, "exitVelocity": number|null, "launchAngle": number|null, ' +
    '"attackAngle": number|null, "timeToContact": number|null, "rotationalAccel": number|null }\n\n' +
    'Return ONLY valid JSON, no other text.';

  const extractionResult = await model.generateContent(extractionPrompt);
  const extractionText = extractionResult.response.text();

  let stats: SwingStats | undefined;
  const jsonMatch = extractionText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const raw = JSON.parse(jsonMatch[0]);
      const cleaned: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'number') cleaned[k] = v;
      }
      const validation = statsSchema.safeParse(cleaned);
      if (validation.success) stats = validation.data;
    } catch {
      // fall through with stats undefined
    }
  }

  const responsePrompt = `${systemPrompt}\n\nUser message: "${message}"\n\n` +
    `Extracted stats: ${JSON.stringify(stats ?? {})}\n\n` +
    'Give a friendly, helpful response under 150 words. Mention which stats were extracted.';

  const responseResult = await model.generateContent(responsePrompt);
  return { response: responseResult.response.text(), stats };
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- server/ai/__tests__/gemini.test.ts
```

Expected: PASS — 7 tests total.

- [ ] **Step 5: Commit**

```bash
git add server/ai/gemini.ts server/ai/__tests__/gemini.test.ts
git commit -m "feat(ai): add GeminiAnalyzer.analyzeStatsChat with stats extraction"
```

---

## Task 8: `GeminiAnalyzer.answerAnalysisQuestion`

**Files:**
- Modify: `server/ai/gemini.ts`
- Modify: `server/ai/__tests__/gemini.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `server/ai/__tests__/gemini.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to confirm the new ones fail**

```bash
npm test -- server/ai/__tests__/gemini.test.ts
```

Expected: 2 new tests fail (`answerAnalysisQuestion` throws "not implemented").

- [ ] **Step 3: Implement `answerAnalysisQuestion` in `server/ai/gemini.ts`**

Add to the imports for prompts:

```ts
import { analysisQuestionPrompt, statsChatSystemPrompt, swingAnalysisUserPrompt } from './prompts';
```

Replace the stub `answerAnalysisQuestion`:

```ts
async answerAnalysisQuestion(message: string): Promise<string> {
  const client = this.getClient();
  const model = client.getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContent(analysisQuestionPrompt(message));
  return result.response.text();
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- server/ai/__tests__/gemini.test.ts
```

Expected: PASS — 9 tests total.

- [ ] **Step 5: Commit**

```bash
git add server/ai/gemini.ts server/ai/__tests__/gemini.test.ts
git commit -m "feat(ai): add GeminiAnalyzer.answerAnalysisQuestion"
```

---

## Task 9: Build `ClaudeAnalyzer` with `analyzeSwing` (tool-use)

**Files:**
- Create: `server/ai/claude.ts`
- Test: `server/ai/__tests__/claude.test.ts`

**Implementation note:** This task uses an assumed `messages.create()` API on `@anthropic-ai/claude-agent-sdk`. Verify the actual SDK shape (it may expose a different entry point such as `query()`). The contract the tests assert — forced tool use, schema-validated `tool_use.input` parsing, image content blocks — is what must hold; the exact SDK call may need to be adapted. Build a thin internal wrapper if useful.

- [ ] **Step 1: Write the failing test**

Create `server/ai/__tests__/claude.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/claude-agent-sdk', () => {
  return {
    ClaudeAgent: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

import { ClaudeAnalyzer } from '../claude';
import { ProviderAuthError, ProviderResponseError } from '../types';

const validToolInput = {
  score: 8,
  strengths: ['stance is solid'],
  improvements: ['hip rotation'],
  keyFrames: [{ time: 0.5, description: 'contact', annotations: [] }],
  recommendedDrills: [
    { title: 'Drill 1', description: 'Do X' },
    { title: 'Drill 2', description: 'Do Y' },
    { title: 'Drill 3', description: 'Do Z' },
    { title: 'Drill 4', description: 'Do W' },
    { title: 'Drill 5', description: 'Do V' },
  ],
};

describe('ClaudeAnalyzer.analyzeSwing', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('forces submit_swing_analysis tool and parses the result', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', name: 'submit_swing_analysis', input: validToolInput }],
    });
    const analyzer = new ClaudeAnalyzer();
    const result = await analyzer.analyzeSwing(
      null, null, {} as any,
      { analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true },
    );
    expect(result.score).toBe(8);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe('claude-opus-4-7');
    expect(callArgs.tool_choice).toEqual({ type: 'tool', name: 'submit_swing_analysis' });
    expect(callArgs.tools[0].name).toBe('submit_swing_analysis');
  });

  it('attaches base64 image content blocks when imageUrls provided', async () => {
    const fs = await import('fs');
    vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('fake'));
    vi.spyOn(fs, 'statSync').mockReturnValue({ size: 1000 } as any);
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', name: 'submit_swing_analysis', input: validToolInput }],
    });
    const analyzer = new ClaudeAnalyzer();
    await analyzer.analyzeSwing(
      null, ['/tmp/a.jpg', '/tmp/b.jpg'], {} as any,
      { analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true },
    );
    const callArgs = mockCreate.mock.calls[0][0];
    const userContent = callArgs.messages[0].content;
    const imageBlocks = userContent.filter((b: any) => b.type === 'image');
    expect(imageBlocks).toHaveLength(2);
    expect(imageBlocks[0].source.type).toBe('base64');
    expect(imageBlocks[0].source.media_type).toBe('image/jpeg');
  });

  it('throws ProviderResponseError when no tool_use block in response', async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'I cannot.' }] });
    const analyzer = new ClaudeAnalyzer();
    await expect(
      analyzer.analyzeSwing(null, null, {} as any, {
        analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true,
      }),
    ).rejects.toBeInstanceOf(ProviderResponseError);
  });

  it('throws ProviderResponseError when tool input fails schema validation', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', name: 'submit_swing_analysis', input: { score: 'not a number' } }],
    });
    const analyzer = new ClaudeAnalyzer();
    await expect(
      analyzer.analyzeSwing(null, null, {} as any, {
        analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true,
      }),
    ).rejects.toBeInstanceOf(ProviderResponseError);
  });

  it('throws ProviderAuthError when SDK throws an auth error', async () => {
    mockCreate.mockRejectedValueOnce(Object.assign(new Error('auth failed'), { status: 401 }));
    const analyzer = new ClaudeAnalyzer();
    await expect(
      analyzer.analyzeSwing(null, null, {} as any, {
        analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true,
      }),
    ).rejects.toBeInstanceOf(ProviderAuthError);
  });

  it('throws ProviderInputError when image > 5MB', async () => {
    const fs = await import('fs');
    vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('fake'));
    vi.spyOn(fs, 'statSync').mockReturnValue({ size: 6 * 1024 * 1024 } as any);
    const analyzer = new ClaudeAnalyzer();
    const { ProviderInputError } = await import('../types');
    await expect(
      analyzer.analyzeSwing(null, ['/tmp/big.jpg'], {} as any, {
        analyzeTechnique: true, analyzeMechanics: true, analyzeRecommendations: true,
      }),
    ).rejects.toBeInstanceOf(ProviderInputError);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- server/ai/__tests__/claude.test.ts
```

Expected: FAIL — module `../claude` not found.

- [ ] **Step 3: Implement `server/ai/claude.ts`**

Create `server/ai/claude.ts`:

```ts
import fs from 'fs';
import { ClaudeAgent } from '@anthropic-ai/claude-agent-sdk';
import {
  analysisResultsSchema,
  statsSchema,
  type AnalysisOptions,
  type AnalysisResults,
  type SwingStats,
} from '@shared/schema';
import {
  ProviderAuthError,
  ProviderInputError,
  ProviderResponseError,
  type StatsChatResult,
  type SwingAnalyzer,
} from './types';
import {
  analysisQuestionPrompt,
  statsChatSystemPrompt,
  swingAnalysisSystemPrompt,
  swingAnalysisUserPrompt,
} from './prompts';

const MODEL = 'claude-opus-4-7';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const submitSwingAnalysisTool = {
  name: 'submit_swing_analysis',
  description: 'Return the structured swing analysis as a single tool call.',
  input_schema: {
    type: 'object',
    properties: {
      score: { type: 'number', minimum: 1, maximum: 10 },
      strengths: { type: 'array', items: { type: 'string' } },
      improvements: { type: 'array', items: { type: 'string' } },
      keyFrames: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            time: { type: 'number' },
            description: { type: 'string' },
            annotations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['line', 'angle', 'circle', 'arrow', 'text'] },
                  points: { type: 'array', items: { type: 'number' } },
                  color: { type: 'string' },
                  text: { type: 'string' },
                  thickness: { type: 'number' },
                },
                required: ['type', 'points'],
              },
            },
          },
          required: ['time', 'description'],
        },
      },
      recommendedDrills: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['title', 'description'],
        },
        minItems: 5,
      },
    },
    required: ['score', 'strengths', 'improvements', 'keyFrames', 'recommendedDrills'],
  },
};

const extractStatsTool = {
  name: 'extract_swing_stats',
  description: 'Return any swing statistics extracted from the user message.',
  input_schema: {
    type: 'object',
    properties: {
      batSpeed: { type: 'number' },
      exitVelocity: { type: 'number' },
      launchAngle: { type: 'number' },
      attackAngle: { type: 'number' },
      timeToContact: { type: 'number' },
      rotationalAccel: { type: 'number' },
    },
  },
};

function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = (err as any).status;
  if (status === 401 || status === 403) return true;
  const msg = (err as any).message?.toLowerCase?.() ?? '';
  return msg.includes('unauthor') || msg.includes('auth') || msg.includes('not logged in');
}

function buildImageBlocks(imageUrls: string[] | null): Array<{
  type: 'image';
  source: { type: 'base64'; media_type: 'image/jpeg'; data: string };
}> {
  if (!imageUrls || imageUrls.length === 0) return [];
  return imageUrls.map(p => {
    const stat = fs.statSync(p);
    if (stat.size > MAX_IMAGE_BYTES) {
      throw new ProviderInputError(`Image exceeds 5MB Claude limit: ${p}`, 'claude');
    }
    const data = fs.readFileSync(p).toString('base64');
    return { type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data } };
  });
}

export class ClaudeAnalyzer implements SwingAnalyzer {
  private agent = new ClaudeAgent();

  async analyzeSwing(
    videoUrl: string | null,
    imageUrls: string[] | null,
    stats: SwingStats,
    options: AnalysisOptions,
  ): Promise<AnalysisResults> {
    const isSimpleMode = (options as any).simpleMode === true;
    const imageBlocks = buildImageBlocks(imageUrls);

    const userContent = [
      { type: 'text' as const, text: swingAnalysisUserPrompt(stats, options, videoUrl, imageUrls?.length ?? 0) },
      ...imageBlocks,
    ];

    let response: any;
    try {
      response = await this.agent.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: swingAnalysisSystemPrompt(isSimpleMode),
        messages: [{ role: 'user', content: userContent }],
        tools: [submitSwingAnalysisTool],
        tool_choice: { type: 'tool', name: 'submit_swing_analysis' },
      });
    } catch (err) {
      if (isAuthError(err)) {
        throw new ProviderAuthError(
          "Claude authentication required. Run 'claude login' to sign in to your Pro/Max account.",
          'claude',
        );
      }
      throw err;
    }

    const toolUse = response.content.find((b: any) => b.type === 'tool_use' && b.name === 'submit_swing_analysis');
    if (!toolUse) {
      throw new ProviderResponseError('Claude did not return a submit_swing_analysis tool call.', 'claude');
    }
    const validation = analysisResultsSchema.safeParse(toolUse.input);
    if (!validation.success) {
      throw new ProviderResponseError(
        `Claude returned malformed analysis: ${validation.error.message}`,
        'claude',
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
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- server/ai/__tests__/claude.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add server/ai/claude.ts server/ai/__tests__/claude.test.ts
git commit -m "feat(ai): add ClaudeAnalyzer.analyzeSwing using forced tool-use"
```

---

## Task 10: `ClaudeAnalyzer.analyzeImage`

**Files:**
- Modify: `server/ai/claude.ts`
- Modify: `server/ai/__tests__/claude.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `server/ai/__tests__/claude.test.ts`:

```ts
describe('ClaudeAnalyzer.analyzeImage', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('returns the model text response with image content block attached', async () => {
    const fs = await import('fs');
    vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('fake'));
    vi.spyOn(fs, 'statSync').mockReturnValue({ size: 1000 } as any);
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'STRENGTHS: ...\nIMPROVEMENTS: ...' }],
    });
    const analyzer = new ClaudeAnalyzer();
    const result = await analyzer.analyzeImage('/tmp/foo.jpg', 'analyze this frame', true);
    expect(result).toContain('STRENGTHS');
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.tool_choice).toBeUndefined();
    expect(callArgs.messages[0].content.some((b: any) => b.type === 'image')).toBe(true);
  });

  it('throws ProviderInputError on oversized image', async () => {
    const fs = await import('fs');
    vi.spyOn(fs, 'statSync').mockReturnValue({ size: 6 * 1024 * 1024 } as any);
    const analyzer = new ClaudeAnalyzer();
    const { ProviderInputError } = await import('../types');
    await expect(
      analyzer.analyzeImage('/tmp/big.jpg', 'p', false),
    ).rejects.toBeInstanceOf(ProviderInputError);
  });
});
```

- [ ] **Step 2: Run the tests to confirm the new ones fail**

```bash
npm test -- server/ai/__tests__/claude.test.ts
```

Expected: 2 new tests fail (`analyzeImage` throws "not implemented").

- [ ] **Step 3: Implement `analyzeImage` in `server/ai/claude.ts`**

Replace the stub `analyzeImage` method with:

```ts
async analyzeImage(imagePath: string, prompt: string, isSimpleMode: boolean): Promise<string> {
  const imageBlocks = buildImageBlocks([imagePath]);
  const audiencePreamble = isSimpleMode
    ? 'You are a youth baseball coach explaining swing mechanics to parents in plain language. '
    : 'You are a professional baseball coach with deep technical knowledge. ';

  let response: any;
  try {
    response = await this.agent.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [{ type: 'text', text: audiencePreamble + prompt }, ...imageBlocks],
      }],
    });
  } catch (err) {
    if (isAuthError(err)) {
      throw new ProviderAuthError(
        "Claude authentication required. Run 'claude login' to sign in to your Pro/Max account.",
        'claude',
      );
    }
    throw err;
  }

  const textBlock = response.content.find((b: any) => b.type === 'text');
  if (!textBlock) {
    throw new ProviderResponseError('Claude returned no text content.', 'claude');
  }
  return textBlock.text;
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- server/ai/__tests__/claude.test.ts
```

Expected: PASS — 8 tests total.

- [ ] **Step 5: Commit**

```bash
git add server/ai/claude.ts server/ai/__tests__/claude.test.ts
git commit -m "feat(ai): add ClaudeAnalyzer.analyzeImage with image content block"
```

---

## Task 11: `ClaudeAnalyzer.analyzeStatsChat`

**Files:**
- Modify: `server/ai/claude.ts`
- Modify: `server/ai/__tests__/claude.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `server/ai/__tests__/claude.test.ts`:

```ts
describe('ClaudeAnalyzer.analyzeStatsChat', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('extracts stats via tool call and returns text response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: 'tool_use', name: 'extract_swing_stats', input: { batSpeed: 65, exitVelocity: 88 } },
        { type: 'text', text: 'Got it — bat speed 65 mph, exit velocity 88 mph.' },
      ],
    });
    const analyzer = new ClaudeAnalyzer();
    const result = await analyzer.analyzeStatsChat('My bat speed is 65 and EV is 88');
    expect(result.stats?.batSpeed).toBe(65);
    expect(result.stats?.exitVelocity).toBe(88);
    expect(result.response).toContain('65');
  });

  it('returns response only when no stats extracted', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'I could not find any stats in your message.' }],
    });
    const analyzer = new ClaudeAnalyzer();
    const result = await analyzer.analyzeStatsChat('Hello');
    expect(result.stats).toBeUndefined();
    expect(result.response).toContain('could not find');
  });
});
```

- [ ] **Step 2: Run the tests to confirm the new ones fail**

```bash
npm test -- server/ai/__tests__/claude.test.ts
```

Expected: 2 new tests fail (`analyzeStatsChat` throws "not implemented").

- [ ] **Step 3: Implement `analyzeStatsChat` in `server/ai/claude.ts`**

Replace the stub `analyzeStatsChat`:

```ts
async analyzeStatsChat(message: string): Promise<StatsChatResult> {
  let response: any;
  try {
    response = await this.agent.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: statsChatSystemPrompt(),
      messages: [{
        role: 'user',
        content: [{ type: 'text', text:
          `User message: "${message}"\n\n` +
          'Call extract_swing_stats with any stats you can extract (omit fields you cannot determine), ' +
          'then provide a friendly text response under 150 words mentioning what was extracted.' }],
      }],
      tools: [extractStatsTool],
    });
  } catch (err) {
    if (isAuthError(err)) {
      throw new ProviderAuthError(
        "Claude authentication required. Run 'claude login' to sign in to your Pro/Max account.",
        'claude',
      );
    }
    throw err;
  }

  let stats: SwingStats | undefined;
  const toolUse = response.content.find((b: any) => b.type === 'tool_use' && b.name === 'extract_swing_stats');
  if (toolUse) {
    const validation = statsSchema.safeParse(toolUse.input);
    if (validation.success) stats = validation.data;
  }

  const textBlock = response.content.find((b: any) => b.type === 'text');
  const responseText = textBlock?.text ?? 'Stats extracted.';
  return { response: responseText, stats };
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- server/ai/__tests__/claude.test.ts
```

Expected: PASS — 10 tests total.

- [ ] **Step 5: Commit**

```bash
git add server/ai/claude.ts server/ai/__tests__/claude.test.ts
git commit -m "feat(ai): add ClaudeAnalyzer.analyzeStatsChat with extract_swing_stats tool"
```

---

## Task 12: `ClaudeAnalyzer.answerAnalysisQuestion`

**Files:**
- Modify: `server/ai/claude.ts`
- Modify: `server/ai/__tests__/claude.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `server/ai/__tests__/claude.test.ts`:

```ts
describe('ClaudeAnalyzer.answerAnalysisQuestion', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('returns the answer text', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Your hip rotation is the main issue. Work on torque drills.' }],
    });
    const analyzer = new ClaudeAnalyzer();
    const result = await analyzer.answerAnalysisQuestion('What about hip rotation?');
    expect(result).toContain('hip rotation');
  });

  it('throws ProviderResponseError when no text block in response', async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });
    const analyzer = new ClaudeAnalyzer();
    await expect(analyzer.answerAnalysisQuestion('q?')).rejects.toBeInstanceOf(ProviderResponseError);
  });
});
```

- [ ] **Step 2: Run the tests to confirm the new ones fail**

```bash
npm test -- server/ai/__tests__/claude.test.ts
```

Expected: 2 new tests fail.

- [ ] **Step 3: Implement `answerAnalysisQuestion` in `server/ai/claude.ts`**

Replace the stub `answerAnalysisQuestion`:

```ts
async answerAnalysisQuestion(message: string): Promise<string> {
  let response: any;
  try {
    response = await this.agent.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: [{ type: 'text', text: analysisQuestionPrompt(message) }] }],
    });
  } catch (err) {
    if (isAuthError(err)) {
      throw new ProviderAuthError(
        "Claude authentication required. Run 'claude login' to sign in to your Pro/Max account.",
        'claude',
      );
    }
    throw err;
  }

  const textBlock = response.content.find((b: any) => b.type === 'text');
  if (!textBlock) {
    throw new ProviderResponseError('Claude returned no text content.', 'claude');
  }
  return textBlock.text;
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- server/ai/__tests__/claude.test.ts
```

Expected: PASS — 12 tests total.

- [ ] **Step 5: Commit**

```bash
git add server/ai/claude.ts server/ai/__tests__/claude.test.ts
git commit -m "feat(ai): add ClaudeAnalyzer.answerAnalysisQuestion"
```

---

## Task 13: Build `getAnalyzer` factory

**Files:**
- Create: `server/ai/index.ts`
- Test: `server/ai/__tests__/factory.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/ai/__tests__/factory.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getAnalyzer } from '../index';
import { ClaudeAnalyzer } from '../claude';
import { GeminiAnalyzer } from '../gemini';

describe('getAnalyzer', () => {
  it("returns ClaudeAnalyzer for 'claude'", () => {
    expect(getAnalyzer('claude')).toBeInstanceOf(ClaudeAnalyzer);
  });

  it("returns GeminiAnalyzer for 'gemini'", () => {
    expect(getAnalyzer('gemini')).toBeInstanceOf(GeminiAnalyzer);
  });

  it('throws for unknown provider strings', () => {
    expect(() => getAnalyzer('bogus' as any)).toThrow(/unknown provider/i);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- server/ai/__tests__/factory.test.ts
```

Expected: FAIL — module `../index` not found.

- [ ] **Step 3: Implement `server/ai/index.ts`**

Create `server/ai/index.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- server/ai/__tests__/factory.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add server/ai/index.ts server/ai/__tests__/factory.test.ts
git commit -m "feat(ai): add getAnalyzer factory selecting Claude or Gemini"
```

---

## Task 14: Add `provider` field to shared schemas

**Files:**
- Modify: `shared/schema.ts`
- Test: `shared/__tests__/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/__tests__/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { providerSchema } from '../schema';

describe('providerSchema', () => {
  it("accepts 'claude'", () => {
    expect(providerSchema.parse('claude')).toBe('claude');
  });

  it("accepts 'gemini'", () => {
    expect(providerSchema.parse('gemini')).toBe('gemini');
  });

  it('rejects unknown values', () => {
    expect(() => providerSchema.parse('openai')).toThrow();
  });

  it('is optional in compatible parent schemas', () => {
    expect(providerSchema.optional().parse(undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- shared/__tests__/schema.test.ts
```

Expected: FAIL — `providerSchema` is not exported.

- [ ] **Step 3: Add `providerSchema` to `shared/schema.ts`**

Append to `shared/schema.ts`:

```ts
// AI provider selection — runtime schema. The matching TypeScript union
// `Provider` lives in `server/ai/types.ts`; both resolve to `'claude' | 'gemini'`.
export const providerSchema = z.enum(['claude', 'gemini']);
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- shared/__tests__/schema.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add shared/schema.ts shared/__tests__/schema.test.ts
git commit -m "feat(schema): add providerSchema enum for AI provider selection"
```

---

## Task 15: Update `routes.ts` to use the factory

**Files:**
- Modify: `server/routes.ts`
- Test: `server/__tests__/routes.test.ts`

This task replaces direct Gemini imports in three routes (`/api/analyze`, `/api/analyze-frame`, `/api/chat-stats`), deletes the inline Gemini block at lines 540-566, and adds the provider-resolution helper. **The actual route handlers remain in place** — only their AI-dispatch lines change.

- [ ] **Step 1: Write the failing test**

Create `server/__tests__/routes.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveProvider } from '../routes-helpers';

describe('resolveProvider', () => {
  let originalEnv: string | undefined;
  beforeEach(() => {
    originalEnv = process.env.AI_PROVIDER;
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalEnv;
  });

  it('uses body.provider when present', () => {
    process.env.AI_PROVIDER = 'gemini';
    expect(resolveProvider({ provider: 'claude' })).toBe('claude');
  });

  it('falls back to env.AI_PROVIDER', () => {
    process.env.AI_PROVIDER = 'gemini';
    expect(resolveProvider({})).toBe('gemini');
  });

  it("falls back to 'claude' when neither body nor env set", () => {
    delete process.env.AI_PROVIDER;
    expect(resolveProvider({})).toBe('claude');
  });

  it('rejects invalid body.provider value with ZodError-like behavior', () => {
    expect(() => resolveProvider({ provider: 'openai' as any })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- server/__tests__/routes.test.ts
```

Expected: FAIL — module `../routes-helpers` not found.

- [ ] **Step 3: Create `server/routes-helpers.ts`**

Create `server/routes-helpers.ts`:

```ts
import { providerSchema } from '@shared/schema';
import type { Provider } from './ai';

export function resolveProvider(body: { provider?: unknown }): Provider {
  if (body.provider !== undefined) {
    return providerSchema.parse(body.provider);
  }
  const fromEnv = process.env.AI_PROVIDER;
  if (fromEnv !== undefined) {
    return providerSchema.parse(fromEnv);
  }
  return 'claude';
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- server/__tests__/routes.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Update `server/routes.ts` imports**

In `server/routes.ts` lines 7-9, replace:

```ts
import { statsSchema, analysisOptionsSchema, AnalysisResults, InsertSwing, insertUserSchema } from "@shared/schema";
import { analyzeSwing, isGeminiAvailable, analyzeImageWithGemini } from "./gemini";
import { analyzeStatsChat, isChatAvailable } from "./chatAnalysis";
```

with:

```ts
import { statsSchema, analysisOptionsSchema, AnalysisResults, InsertSwing, insertUserSchema } from "@shared/schema";
import { getAnalyzer, ProviderAuthError, ProviderInputError, ProviderResponseError } from "./ai";
import { resolveProvider } from "./routes-helpers";
```

- [ ] **Step 6: Update `/api/analyze` handler**

Find the `analyzeSwing(...)` call near line 159. Replace:

```ts
console.log("Starting analysis with Gemini AI...");

// Perform the analysis
const analysis = await analyzeSwing(
  processedVideoUrls[0],
  imageUrls,
  stats,
  analysisOptions
);
```

with:

```ts
const provider = resolveProvider(req.body);
console.log(`Starting analysis with ${provider}...`);

const analyzer = getAnalyzer(provider);
const analysis = await analyzer.analyzeSwing(
  processedVideoUrls[0],
  imageUrls,
  stats,
  analysisOptions,
);
```

In the same handler, change the success response from:

```ts
res.status(200).json({
  success: true,
  analysis
});
```

to:

```ts
res.status(200).json({
  success: true,
  analysis,
  provider,
});
```

- [ ] **Step 7: Update `/api/analyze-frame` handler**

Find the `analyzeImageWithGemini(...)` call near line 487. Replace:

```ts
// Import model functions
const { analyzeImageWithGemini } = await import("./gemini");

// Send to Gemini for analysis, passing the simpleMode flag
const analysis = await analyzeImageWithGemini(imagePath, prompt, simpleMode);
```

with:

```ts
const provider = resolveProvider(req.body);
const analyzer = getAnalyzer(provider);
const analysis = await analyzer.analyzeImage(imagePath, prompt, simpleMode);
```

Change its success response from:

```ts
res.json({
  success: true,
  analysis
});
```

to:

```ts
res.json({
  success: true,
  analysis,
  provider,
});
```

- [ ] **Step 8: Update `/api/chat-stats` handler — delete inline Gemini block**

Find lines 522-577 in the original file. Replace the entire body of the `try` block (everything between `try {` and `} catch (err: any) {`) with:

```ts
const { message } = req.body;

if (!message) {
  return res.status(400).json({
    success: false,
    message: "No message provided",
  });
}

const provider = resolveProvider(req.body);
const analyzer = getAnalyzer(provider);

const isAnalysisQuestion = message.includes("Based on this baseball swing analysis data:");

if (isAnalysisQuestion) {
  const responseText = await analyzer.answerAnalysisQuestion(message);
  return res.status(200).json({
    success: true,
    response: responseText,
    message: responseText,
    provider,
  });
}

const { response, stats } = await analyzer.analyzeStatsChat(message);
return res.status(200).json({
  success: true,
  response,
  stats,
  message: response,
  provider,
});
```

- [ ] **Step 9: Add provider-aware error handling**

Find the existing `catch (err: any) {` blocks for the three modified handlers. Wrap each handler's catch block to map provider errors to the right HTTP status. Replace each existing catch with:

```ts
} catch (err: any) {
  console.error("Route error:", err);
  if (err instanceof ProviderAuthError) {
    return res.status(503).json({
      success: false,
      message: err.message,
      provider: err.provider,
      suggestedAction: 'switch_provider',
    });
  }
  if (err instanceof ProviderResponseError || err instanceof ProviderInputError) {
    return res.status(422).json({
      success: false,
      message: err.message,
      provider: err.provider,
    });
  }
  return res.status(500).json({
    success: false,
    message: err.message ?? "Internal error",
  });
}
```

Apply this to the three handlers' catch blocks. (If a handler had additional error-message customization, preserve the customization in the 500 branch only.)

- [ ] **Step 10: Run all tests**

```bash
npm test
```

Expected: all tests pass (smoke + types + prompts + gemini + claude + factory + schema + routes-helpers).

- [ ] **Step 11: Run TypeScript check**

```bash
npm run check
```

Expected: PASS. If `isGeminiAvailable` or `isChatAvailable` references remain elsewhere, remove them — those guard checks are now superseded by `ProviderAuthError`.

- [ ] **Step 12: Commit**

```bash
git add server/routes.ts server/routes-helpers.ts server/__tests__/routes.test.ts
git commit -m "feat(routes): wire all 3 AI routes through getAnalyzer factory"
```

---

## Task 16: Delete dead files

**Files:**
- Delete: `server/gemini.ts`
- Delete: `server/chatAnalysis.ts`
- Delete: `server/openai.ts`

- [ ] **Step 1: Delete the files**

```bash
rm server/gemini.ts server/chatAnalysis.ts server/openai.ts
```

- [ ] **Step 2: Verify no references remain**

```bash
npm run check
```

Expected: PASS. If TypeScript reports unresolved imports, those imports were missed in Task 15 — fix them and re-run.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A server/gemini.ts server/chatAnalysis.ts server/openai.ts
git commit -m "chore: delete server/gemini.ts, chatAnalysis.ts, openai.ts (replaced by server/ai/)"
```

---

## Task 17: Add `provider` to client request payload

**Files:**
- Modify: `client/src/pages/Home.tsx`

The form sends analysis requests via the helper in `client/src/lib/queryClient.ts`. Threading `provider` requires (a) state in `Home.tsx`, (b) passing it to `AnalysisActions` for selection, (c) including it in the request body.

- [ ] **Step 1: Add provider state to `Home.tsx`**

Near the existing `useState` calls in `client/src/pages/Home.tsx` (around lines 38-46), add:

```tsx
const [provider, setProvider] = useState<'claude' | 'gemini'>('claude');
```

- [ ] **Step 2: Pass provider to AnalysisActions**

Find the `<AnalysisActions ... />` JSX in `Home.tsx`. Add the props:

```tsx
<AnalysisActions
  options={analysisOptions}
  onOptionsChange={setAnalysisOptions}
  onGenerateAnalysis={handleGenerateAnalysis}
  isAnalyzing={isAnalyzing}
  provider={provider}
  onProviderChange={setProvider}
/>
```

- [ ] **Step 3: Include provider in the analysis request**

Find the `handleGenerateAnalysis` function in `Home.tsx`. Locate the request that posts to `/api/analyze` (it uses `apiRequest` or `fetch` with a JSON body). In the request body object, add `provider`:

```ts
const body = {
  videoUrl,
  imageUrls,
  stats,
  analysisOptions,
  provider,  // <-- add this
};
```

If the `analyze-frame` and `chat-stats` requests are also made from this file, add `provider` to each of those request bodies as well. The provider field is server-side optional (defaults to env), so omitting it in less-critical paths is acceptable but inconsistent — prefer adding it everywhere for consistency.

- [ ] **Step 4: Run TypeScript check**

```bash
npm run check
```

Expected: PASS once `AnalysisActions` accepts the new props (next task). If check fails here on prop types, that's expected — proceed to Task 18.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Home.tsx
git commit -m "feat(client): thread provider state through analysis request"
```

---

## Task 18: Add provider dropdown to `AnalysisActions`

**Files:**
- Modify: `client/src/components/analysis/AnalysisActions.tsx`

Tests are out of scope (no client-side test setup). Verify manually after this task by running `npm run dev` and confirming the dropdown appears, defaults to "Claude," and changing it changes the response.

- [ ] **Step 1: Add the Select import and update the props interface**

In `client/src/components/analysis/AnalysisActions.tsx`, add this import alongside the other UI imports near the top of the file (the file does not currently import `Select`):

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

Update the `AnalysisActionsProps` interface:

```tsx
interface AnalysisActionsProps {
  options: AnalysisOptions;
  onOptionsChange: (options: AnalysisOptions) => void;
  onGenerateAnalysis: () => void;
  isAnalyzing: boolean;
  provider: 'claude' | 'gemini';
  onProviderChange: (provider: 'claude' | 'gemini') => void;
}
```

Update the default-export function signature to destructure the new props:

```tsx
export default function AnalysisActions({
  options,
  onOptionsChange,
  onGenerateAnalysis,
  isAnalyzing,
  provider,
  onProviderChange,
}: AnalysisActionsProps) {
```

- [ ] **Step 2: Add the dropdown above the Analyze button**

In the JSX, just above the `<Button onClick={onGenerateAnalysis} ... />` (around line 137), add:

```tsx
<div className="mb-4">
  <label className="text-sm font-medium text-slate-700 mb-1 block">AI provider</label>
  <Select value={provider} onValueChange={(v) => onProviderChange(v as 'claude' | 'gemini')}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="claude">Claude (Opus 4.7)</SelectItem>
      <SelectItem value="gemini">Gemini (1.5 Pro)</SelectItem>
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 4: Manual verification**

Start the dev server:

```bash
npm run dev
```

Open the app, upload a sample swing image, verify:
- The "AI provider" dropdown is visible above the Analyze button.
- Default selection is "Claude (Opus 4.7)".
- Changing to Gemini and clicking Analyze sends `provider: "gemini"` in the request (check Network tab).
- The response includes `"provider": "gemini"` in the JSON.

If Claude path errors with `503` because `claude` CLI isn't logged in, the dropdown still works — switch to Gemini to confirm the round-trip.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/analysis/AnalysisActions.tsx
git commit -m "feat(client): add AI provider dropdown to AnalysisActions"
```

---

## Task 19: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the Prerequisites section**

In `README.md`, replace the existing Prerequisites section:

```markdown
### Prerequisites

- Node.js 18 or later
- PostgreSQL database
- Google Gemini API key
```

with:

```markdown
### Prerequisites

- Node.js 18 or later
- PostgreSQL database
- One or both AI providers configured:
  - **Claude** (recommended for local use): the `claude` CLI authenticated to your Pro/Max account (`claude login`). Subscription tokens are used; no API key needed.
  - **Gemini**: a Google Gemini API key set in `GEMINI_API_KEY`.
```

- [ ] **Step 2: Update the environment variables section**

Replace the `.env` block:

```markdown
3. Set up environment variables in `.env` file:
   ```
   DATABASE_URL=your_postgres_database_url
   GEMINI_API_KEY=your_gemini_api_key
   ```
```

with:

```markdown
3. Set up environment variables in `.env` file:
   ```
   DATABASE_URL=your_postgres_database_url
   AI_PROVIDER=claude            # or 'gemini' — server-side default if request omits it
   GEMINI_API_KEY=your_gemini_api_key   # required only if you plan to use Gemini
   ```

   The active AI provider is selected per request via the UI dropdown (defaulting to whatever `AI_PROVIDER` is set to). Claude requires the `claude` CLI to be logged into a Pro/Max account on the host machine.
```

- [ ] **Step 3: Update the Technology Stack section**

Change the AI Services line from:

```markdown
- **AI Services**: Google Gemini AI for visual analysis
```

to:

```markdown
- **AI Services**: Anthropic Claude (via Claude Agent SDK with subscription auth) and/or Google Gemini, selectable per request
```

- [ ] **Step 4: Run all tests one final time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Run the manual smoke-test checklist from the spec**

From `docs/specs/2026-05-11-claude-gemini-provider-design.md`:

1. With `AI_PROVIDER=claude` and `claude` logged in: upload a swing image, verify response includes `provider: 'claude'`.
2. With `AI_PROVIDER=gemini` and `GEMINI_API_KEY` set: same, response includes `provider: 'gemini'`.
3. With `AI_PROVIDER=claude`, override to `gemini` via the UI dropdown: response uses Gemini.
4. With Claude not logged in (`AI_PROVIDER=claude`): get 503 with auth instructions, no silent fallback.
5. Stats chat works under both providers (try both via the chat UI).
6. Analysis Q&A chat works under both providers.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: update README for Claude/Gemini provider selection"
```

---

## After all tasks

1. Push the feature branch on the submodule:

   ```bash
   git push -u origin feat-claude-gemini-provider
   ```

2. Open a PR against the fork's `main`:

   ```bash
   gh pr create --title "feat: add Claude provider with Gemini still selectable" --body "Implements docs/specs/2026-05-11-claude-gemini-provider-design.md per docs/plans/2026-05-11-claude-gemini-provider-plan.md."
   ```

3. After merge, in the **parent monorepo** (`D:\Documents\Danian\Projects\Claude`), bump the submodule pointer to the new SHA on a separate feature branch and PR (per CLAUDE.md: "NEVER commit directly to main"):

   ```bash
   git -C submodules/swing-analyzer fetch origin
   git -C submodules/swing-analyzer checkout main
   git -C submodules/swing-analyzer pull
   git checkout -b chore-bump-swing-analyzer-claude
   git add submodules/swing-analyzer
   git commit -m "chore(submodules): bump swing-analyzer to claude/gemini provider"
   git push -u origin chore-bump-swing-analyzer-claude
   gh pr create --title "chore: bump swing-analyzer to claude/gemini provider"
   ```
