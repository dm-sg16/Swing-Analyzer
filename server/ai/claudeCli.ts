import { spawn } from 'child_process';
import { ProviderAuthError, ProviderResponseError } from './types';

export interface ClaudeCliOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  /** Empty string disables all built-in tools. Comma- or space-separated tool list otherwise (e.g. 'Read'). */
  allowedTools?: string;
  /** Additional directory the CLI is allowed to access (for image reads). */
  addDir?: string;
}

interface ClaudeJsonEnvelope {
  type: string;
  subtype?: string;
  is_error: boolean;
  result?: string;
  api_error_status?: string | null;
}

const AUTH_ERROR_PATTERN = /not logged in|please run \/login|unauthor|authenticat/i;

export async function runClaudeCli(opts: ClaudeCliOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const args: string[] = ['--print', '--output-format', 'json'];
    if (opts.model) {
      args.push('--model', opts.model);
    }
    if (opts.systemPrompt) {
      args.push('--system-prompt', opts.systemPrompt);
    }
    args.push('--tools', opts.allowedTools ?? '');
    if (opts.addDir) {
      args.push('--add-dir', opts.addDir);
    }
    args.push('-p', opts.prompt);

    const proc = spawn('claude', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => {
      reject(new ProviderResponseError(`Failed to spawn 'claude' CLI: ${err.message}`, 'claude'));
    });
    proc.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new ProviderResponseError(`'claude' exited ${code}: ${stderr.trim()}`, 'claude'));
        return;
      }
      let env: ClaudeJsonEnvelope;
      try {
        env = JSON.parse(stdout);
      } catch (e) {
        reject(new ProviderResponseError(`Failed to parse 'claude' JSON output: ${(e as Error).message}`, 'claude'));
        return;
      }
      const text = env.result ?? '';
      if (env.is_error) {
        if (AUTH_ERROR_PATTERN.test(text)) {
          reject(new ProviderAuthError(
            `Claude authentication required. Run 'claude login' to sign in to your Pro/Max account. (CLI said: ${text})`,
            'claude',
          ));
        } else {
          reject(new ProviderResponseError(`'claude' returned error: ${text}`, 'claude'));
        }
        return;
      }
      if (typeof env.result !== 'string') {
        reject(new ProviderResponseError(`'claude' envelope had non-string result`, 'claude'));
        return;
      }
      resolve(env.result);
    });
  });
}
