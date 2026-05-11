# Claude / Gemini Provider Abstraction — Design

**Date:** 2026-05-11
**Status:** Approved (ready for implementation plan)

## Goal

Let swing-analyzer perform AI inference through either Anthropic's Claude or Google's Gemini, with the active provider selectable per-request from the UI and falling back to a server-configured default. The motivating use case is leveraging the developer's Claude.ai Pro/Max subscription tokens (via the Claude Agent SDK) instead of paying separately for Gemini API tokens, while keeping Gemini available for comparison and as a manual alternative.

## Context

Today the project performs four kinds of AI calls, all hard-wired to Gemini:

1. `server/gemini.ts:analyzeSwing` — main analysis from video / images / stats, returns structured JSON (`AnalysisResults`). Called from `server/routes.ts:159`.
2. `server/gemini.ts:analyzeImageWithGemini` — single-image vision pass. Called from `server/routes.ts:484`.
3. `server/chatAnalysis.ts:analyzeStatsChat` — extracts swing statistics from a natural-language chat message. Called from `server/routes.ts:569`.
4. Inline Gemini call in `server/routes.ts:540-566` — answers free-form questions about an existing analysis.

`server/openai.ts` exists as an alternate `analyzeSwing` implementation but no route ever calls it (dead code). `@anthropic-ai/sdk` is in `package.json` but never imported (dead dep).

**Deployment target:** local-only. The user runs the dev server on their PC; the app is not deployed to a shared host. This is what makes Claude.ai subscription auth viable — OAuth tokens live on the host machine.

## Decisions

| Decision | Choice |
|---|---|
| Auth source for Claude | Claude.ai Pro/Max subscription tokens via Claude Agent SDK (OAuth, not API key) |
| Default Claude model | `claude-opus-4-7` for all four call types |
| Default Gemini model | Unchanged (`gemini-1.5-pro-latest`) |
| Provider selection | `req.body.provider` overrides `process.env.AI_PROVIDER`, which defaults to `'claude'` |
| UI surface | Provider dropdown on the analysis form sends `provider` in the request body |
| Failure mode | No silent fallback. If the chosen provider fails, return a clear error including the provider name; user re-submits with the other provider via the dropdown. |
| Structured JSON output (Claude) | Tool-use with forced `tool_choice`, schema derived from existing `analysisResultsSchema` |
| Structured JSON output (Gemini) | Existing JSON-fence + regex-extract path, preserved during refactor |
| Video frame extraction | Out of scope. Current `extractKeyFrames` stub remains; both providers operate on directly-uploaded images, not extracted video frames. |

## Architecture

### Provider interface

A new `SwingAnalyzer` interface defines the four operations:

```ts
interface SwingAnalyzer {
  analyzeSwing(
    videoUrl: string | null,
    imageUrls: string[] | null,
    stats: SwingStats,
    options: AnalysisOptions,
  ): Promise<AnalysisResults>

  analyzeImage(
    imagePath: string,
    prompt: string,
    isSimpleMode: boolean,
  ): Promise<string>

  analyzeStatsChat(message: string): Promise<{
    response: string
    stats?: SwingStats
  }>

  answerAnalysisQuestion(message: string): Promise<string>
}
```

Two implementations:

- `GeminiAnalyzer` — refactored from existing `gemini.ts` + `chatAnalysis.ts` + the inline route handler logic.
- `ClaudeAnalyzer` — new, backed by the Claude Agent SDK with subscription OAuth.

A factory resolves the right one:

```ts
function getAnalyzer(provider: 'claude' | 'gemini'): SwingAnalyzer
```

### Provider resolution

In each route handler that performs analysis:

```ts
const provider =
  req.body.provider ??
  (process.env.AI_PROVIDER as 'claude' | 'gemini' | undefined) ??
  'claude'
const analyzer = getAnalyzer(provider)
```

The resolved provider name is included in the JSON response so the UI can label results (e.g. "Analyzed by Claude Opus 4.7"), which matters when the env default and the UI selection diverge.

### Why the Agent SDK (not CLI subprocess or direct OAuth-token reads)

The Claude Agent SDK is the only officially supported way to use Claude.ai subscription tokens programmatically from Node. It handles OAuth refresh, supports vision via image content blocks, and supports tool-use for forced structured output. The two alternatives considered and rejected:

- **`claude` CLI subprocess** — brittle for structured output, awkward for vision (file paths through CLI args), per-request process startup cost.
- **Reading OAuth tokens directly and calling `@anthropic-ai/sdk`** — unsupported, fragile across token rotation, breaks on SDK auth changes.

**Implementation note:** the package name for the Agent SDK is expected to be `@anthropic-ai/claude-agent-sdk`. Verify the exact package name and current API shape against published docs when adding the dependency.

## File layout

### New files (under `server/ai/`)

| File | Purpose |
|---|---|
| `server/ai/types.ts` | `SwingAnalyzer` interface; custom error classes (`ProviderAuthError`, `ProviderResponseError`, `ProviderInputError`); `Provider` union type. |
| `server/ai/prompts.ts` | Shared prompt templates (system messages for simple/advanced modes, knowledge-base injection, JSON-schema instructions). Lifted verbatim from current `gemini.ts` so both implementations use identical wording. |
| `server/ai/gemini.ts` | `GeminiAnalyzer` class implementing `SwingAnalyzer`. Refactored from existing `server/gemini.ts` + `server/chatAnalysis.ts` + the inline call in `routes.ts`. |
| `server/ai/claude.ts` | `ClaudeAnalyzer` class implementing `SwingAnalyzer`. Uses the Claude Agent SDK with subscription auth. |
| `server/ai/index.ts` | Exports `getAnalyzer(provider)` factory and re-exports public types. |

### Modified files

| File | Change |
|---|---|
| `server/routes.ts` | Replace `./gemini` and `./chatAnalysis` imports with `./ai`. Resolve provider from request body / env. Delete the inline Gemini block at lines 540-566; replace with `analyzer.answerAnalysisQuestion(message)`. |
| `shared/schema.ts` | Add `provider: z.enum(['claude', 'gemini']).optional()` to the analyze-swing request schema and to the chat-analysis request schema. |
| `client/src/lib/types.ts` | Add `provider?: 'claude' \| 'gemini'` to analysis-request payload types. |
| Client analysis form (likely `client/src/components/media/MediaUploader.tsx` or `client/src/components/analysis/AnalysisActions.tsx` — exact location confirmed during implementation) | Add a provider dropdown / toggle. Default value: client-side default of `'claude'`. |
| `package.json` | **Add:** `@anthropic-ai/claude-agent-sdk`, `vitest`, `@vitest/ui`. **Remove:** `openai`, `@anthropic-ai/sdk`. **Keep:** `@google/generative-ai`. Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts. |
| `README.md` | Document `AI_PROVIDER` env var. Note that Claude requires `claude` CLI to be logged into a Pro/Max account on the host machine (`claude login`). |

### Deleted files

- `server/gemini.ts` — moves into `server/ai/gemini.ts`.
- `server/chatAnalysis.ts` — merges into the analyzer implementations.
- `server/openai.ts` — dead code, never called.

## Data flow

### Main analysis (`POST /api/analyze`)

```
Client form (with provider dropdown)
   |  POST { videoUrl, imageUrls, stats, options, provider?: 'claude'|'gemini' }
   v
routes.ts handler
   |  zod-validate; resolve provider = body.provider ?? env.AI_PROVIDER ?? 'claude'
   v
getAnalyzer(provider) -> ClaudeAnalyzer | GeminiAnalyzer
   |
   v
analyzer.analyzeSwing(videoUrl, imageUrls, stats, options)
   |  -> AnalysisResults (existing zod schema, unchanged)
   v
routes.ts responds { success: true, analysis, provider }
```

The other three call sites follow the same pattern with their respective interface methods.

### Structured output (Claude)

`ClaudeAnalyzer.analyzeSwing` defines one tool whose input schema mirrors `analysisResultsSchema` and forces its use:

```ts
const response = await client.messages.create({
  model: 'claude-opus-4-7',
  system: prompts.swingAnalysisSystem(isSimpleMode),
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: prompts.swingAnalysisUserPrompt(stats, options) },
      ...imageContentBlocks,
    ],
  }],
  tools: [{
    name: 'submit_swing_analysis',
    description: 'Return the structured swing analysis.',
    input_schema: analysisJsonSchema,
  }],
  tool_choice: { type: 'tool', name: 'submit_swing_analysis' },
})
const toolUse = response.content.find(b => b.type === 'tool_use')
if (!toolUse) throw new ProviderResponseError('Claude did not return a tool call.')
return analysisResultsSchema.parse(toolUse.input)
```

This replaces the current Gemini approach of asking for JSON inside a markdown fence and regex-extracting it (`gemini.ts:316`). With tool-use the model either returns schema-valid args or zod throws — no fence-parsing fallbacks, no silent default-filling.

### Structured output for the other Claude methods

| Method | Returns | Strategy |
|---|---|---|
| `analyzeImage(path, prompt, simple)` | `string` | Plain message with text + base64 image content block. No tool-use. |
| `analyzeStatsChat(message)` | `{ response, stats? }` | One tool `extract_swing_stats` with `statsSchema` as input schema, plus a normal text response in the same turn. Both extracted from the response content. |
| `answerAnalysisQuestion(message)` | `string` | Plain message, 3-4 sentence answer per the existing prompt at `routes.ts:556`. No tool-use. |

### Vision content

Claude Messages API takes `{ type: 'image', source: { type: 'base64', media_type, data } }` content blocks. The implementation reads the image file, base64-encodes it, and attaches one block per image — same shape as the existing OpenAI dead-code path uses.

**Video behavior matches current Gemini:** text-only fallback. The `extractKeyFrames` stub is not addressed in this work.

### Subscription auth

The Claude Agent SDK reads OAuth tokens from `~/.claude/` (populated by `claude login`). No env variables are needed for Claude credentials. The user must have run `claude login` against their Pro/Max account on the host machine before starting the server with `AI_PROVIDER=claude`. If tokens are missing or refresh fails, the SDK throws an auth error which we surface as `ProviderAuthError`.

## Error handling

### Per-provider failure modes

| Source | Failure | Handling |
|---|---|---|
| ClaudeAnalyzer | OAuth tokens missing / expired / refresh failed | Throw `ProviderAuthError("Claude authentication required. Run 'claude login' to sign in to your Pro/Max account.")` |
| ClaudeAnalyzer | Rate limit / quota | `ProviderResponseError("Claude rate limit reached. Try again or switch to Gemini.")` |
| ClaudeAnalyzer | Tool-use args fail `analysisResultsSchema.parse(...)` | `ProviderResponseError("Claude returned malformed analysis: <zod issues>")` |
| ClaudeAnalyzer | Response has no `tool_use` block (defensive — shouldn't happen with forced `tool_choice`) | `ProviderResponseError("Claude did not return a tool call.")` |
| ClaudeAnalyzer | Image > 5 MB (Claude limit) | Validate before send; throw `ProviderInputError("Image exceeds 5MB Claude limit: <filename>")` |
| GeminiAnalyzer | Anything | Preserve existing handling. Refactor must not regress current error paths. |
| Route handler | Invalid `provider` value in body | zod rejects at validation; 400. |
| Route handler | Any `ProviderAuthError` | 503 with `{ error, provider, suggestedAction: 'switch_provider' }`. |
| Route handler | Any `ProviderResponseError` / `ProviderInputError` | 422 with `{ error, provider }`. |
| Route handler | Other exceptions | 500, log with provider tag. |

### Cross-cutting principles

1. **No silent fallback.** Env-default + UI-override was chosen over primary+fallback. If Claude fails, the server returns a clear error; the user decides whether to switch via the UI dropdown.
2. **Every error includes the provider name** in the JSON response and in log lines.
3. **No defensive defaulting on AI output.** Drop the current `score: parsedData.score || 5` and `strengths: parsedData.strengths || []` patterns at `gemini.ts:336`. Silent defaults mean the user sees a nominally-successful analysis with score 5 and no strengths and never realizes the model misbehaved.
4. **Custom error classes** live in `server/ai/types.ts` so route handlers can `instanceof`-check and pick the right HTTP status.

## Testing

### Setup

- **Vitest.** Vite is already the build tool. New: `vitest.config.ts`, `npm run test` and `npm run test:watch` scripts, dev deps `vitest` + `@vitest/ui`.
- Tests live in `__tests__/` subdirs next to the code they cover.
- **Mock the SDKs** (`@anthropic-ai/claude-agent-sdk`, `@google/generative-ai`). Tests cover request assembly, response parsing, and error mapping — not the SDKs themselves. Fast, no credentials needed.

### Test files

| File | Tests (count) |
|---|---|
| `server/ai/__tests__/factory.test.ts` | (3) Factory returns ClaudeAnalyzer for `'claude'`. Returns GeminiAnalyzer for `'gemini'`. Throws for unknown provider strings. |
| `server/ai/__tests__/claude.test.ts` | (~7) `analyzeSwing` sends `tool_choice: { type: 'tool', name: 'submit_swing_analysis' }`; attaches base64 image content blocks when `imageUrls` provided; picks simple-vs-advanced system prompt from `options.simpleMode`. Parses `tool_use.input` through `analysisResultsSchema` and returns the parsed value. Throws `ProviderResponseError` when tool args fail validation. Throws `ProviderResponseError` when no `tool_use` block in response. Throws `ProviderAuthError` when SDK surfaces an auth error. `analyzeImage`, `analyzeStatsChat`, and `answerAnalysisQuestion` covered with one assembly + happy-path test each. |
| `server/ai/__tests__/gemini.test.ts` | (~4) Smoke test per refactored method confirming the existing JSON-fence parse path still works. Not retroactively covering every Gemini quirk. |
| `server/__tests__/routes.test.ts` | (~5) Provider resolution: `body.provider` wins; falls back to `env.AI_PROVIDER`; falls back to `'claude'` when neither set. `ProviderAuthError` -> 503 with `provider` in body. `ProviderResponseError` -> 422 with `provider` in body. |

Total: ~19 tests.

### Out of scope for the test suite

- React component tests for the new provider toggle. The repo has no client-side test setup; adding jsdom + RTL for one dropdown is scope creep. Manual UI verification is enough.
- Live integration tests against real Claude / Gemini APIs. Out of automated suite (credentials, slow, flaky).

### Manual smoke-test checklist (run before merging the implementation PR)

1. With `AI_PROVIDER=claude` and `claude` CLI logged in: upload a swing image, verify analysis returns and response includes `provider: 'claude'`.
2. With `AI_PROVIDER=gemini` and `GEMINI_API_KEY` set: same, response includes `provider: 'gemini'`.
3. With `AI_PROVIDER=claude` set, override to `gemini` via the UI dropdown: response uses Gemini.
4. With Claude not logged in: 503 response with auth instructions, no silent fallback to Gemini.
5. Stats chat works under both providers.
6. Analysis Q&A chat works under both providers.

## Out of scope

- **Real video frame extraction.** The current `extractKeyFrames` stub at `gemini.ts:25` returns `[videoPath]`; "video analysis" is text-only today. Fixing this requires ffmpeg integration and is its own design.
- **A `/api/providers/status` endpoint** that pre-checks each provider's auth so the UI can gray out unavailable options. Nice-to-have; defer.
- **Streaming responses.** Current code is fully synchronous request/response; the swap doesn't change that.
- **Deployment hardening.** This is local-only by design (subscription auth requires the user's OAuth tokens on the host). Hosting on a shared server would require switching Claude back to API-key auth and is not addressed here.
- **Client-side provider-toggle tests.** See "Out of scope for the test suite" above.

## Open questions

None — all design questions resolved during brainstorming.
