import type { CodeEngine, CodeResult, EngineType } from '@/db-engines/types';

export class PythonEngine implements CodeEngine {
  readonly type = 'python' as EngineType;
  private worker: Worker | null = null;
  private ready = false;
  private readyRes: Array<() => void> = [];
  private readyRej: Array<(e: Error) => void> = [];
  private pending = new Map<number, (r: CodeResult) => void>();
  private nextId = 0;

  async init(): Promise<void> {
    if (this.ready) return;

    if (this.worker) {
      return new Promise((res, rej) => {
        this.readyRes.push(res);
        this.readyRej.push(rej);
      });
    }

    this.worker = new Worker('/workers/pyodide-worker.js');

    this.worker.onmessage = (e) => {
      const { type, id, ...data } = e.data as {
        type: string; id?: number;
        stdout?: string; stderr?: string; exitCode?: number; durationMs?: number; message?: string;
      };

      if (type === 'ready') {
        this.ready = true;
        this.readyRes.forEach(r => r());
        this.readyRes = [];
        this.readyRej = [];
      } else if (type === 'init-error') {
        const err = new Error(data.message ?? 'Python runtime failed to load');
        this.readyRej.forEach(r => r(err));
        this.readyRes = [];
        this.readyRej = [];
      } else if (type === 'result' && id !== undefined) {
        const resolve = this.pending.get(id);
        if (resolve) {
          this.pending.delete(id);
          resolve({
            stdout: data.stdout ?? '',
            stderr: data.stderr ?? '',
            exitCode: data.exitCode ?? 0,
            durationMs: data.durationMs,
          });
        }
      }
    };

    this.worker.onerror = (e) => {
      const err = new Error(e.message ?? 'Worker startup error');
      this.readyRej.forEach(r => r(err));
      this.readyRes = [];
      this.readyRej = [];
    };

    return new Promise((res, rej) => {
      this.readyRes.push(res);
      this.readyRej.push(rej);
    });
  }

  async execute(code: string): Promise<CodeResult> {
    if (!this.ready) await this.init();

    const id = ++this.nextId;

    return new Promise<CodeResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ stdout: '', stderr: 'Execution timed out (30 s).', exitCode: 124, durationMs: 30_000 });
      }, 30_000);

      this.pending.set(id, (result) => {
        clearTimeout(timer);
        resolve(result);
      });

      this.worker!.postMessage({ type: 'execute', id, code });
    });
  }
}
