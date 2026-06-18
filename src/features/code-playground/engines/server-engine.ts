import type { CodeEngine, CodeResult, EngineType } from '@/db-engines/types';

/** Executes code via /api/code/execute → self-hosted Piston instance. */
export class ServerCodeEngine implements CodeEngine {
  readonly type: EngineType;
  private lang: string;

  constructor(lang: string) {
    this.type = lang as EngineType;
    this.lang = lang;
  }

  async init(): Promise<void> { /* no local setup needed */ }

  async execute(code: string, stdin?: string): Promise<CodeResult> {
    const t0 = Date.now();
    try {
      const res = await fetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: this.lang, code, stdin: stdin ?? '' }),
      });

      const data = await res.json() as {
        stdout?: string;
        stderr?: string;
        exitCode?: number;
        error?: string;
      };

      if (!res.ok) {
        return {
          stdout: '',
          stderr: data.error ?? `Server error (${res.status})`,
          exitCode: 1,
          durationMs: Date.now() - t0,
        };
      }

      return {
        stdout: data.stdout ?? '',
        stderr: data.stderr ?? '',
        exitCode: data.exitCode ?? 0,
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      return {
        stdout: '',
        stderr: `Network error: ${err instanceof Error ? err.message : String(err)}`,
        exitCode: 1,
        durationMs: Date.now() - t0,
      };
    }
  }
}
