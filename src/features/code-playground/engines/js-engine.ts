import type { CodeEngine, CodeResult, EngineType } from '@/db-engines/types';

const TIMEOUT_MS = 10_000;
const MAX_LINES = 500;

// Runs inside a Web Worker — no DOM access, isolated from the main thread.
const WORKER_SOURCE = `
const MAX = ${MAX_LINES};

self.onmessage = async function(e) {
  const { code } = e.data;
  const out = [];
  const err = [];
  const t0 = Date.now();

  const fmt = (...args) => args.map(a => {
    if (a === null) return 'null';
    if (a === undefined) return 'undefined';
    if (typeof a === 'object') { try { return JSON.stringify(a, null, 2); } catch { return String(a); } }
    return String(a);
  }).join(' ');

  const push = (arr, msg) => {
    if (arr.length < MAX) arr.push(msg);
    else if (arr.length === MAX) arr.push('... output truncated at ${MAX_LINES} lines');
  };

  const fakeConsole = {
    log:   (...a) => push(out, fmt(...a)),
    info:  (...a) => push(out, fmt(...a)),
    warn:  (...a) => push(err, '[warn] ' + fmt(...a)),
    error: (...a) => push(err, fmt(...a)),
    table: (v)    => push(out, typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)),
    clear: ()     => { out.length = 0; },
  };

  let exitCode = 0;
  try {
    // AsyncFunction lets user code use await at top level
    const Fn = Object.getPrototypeOf(async function(){}).constructor;
    await new Fn('console', code)(fakeConsole);
  } catch(e) {
    const msg = (e instanceof Error)
      ? e.message + (e.stack ? '\\n' + e.stack.split('\\n').slice(1, 4).join('\\n') : '')
      : String(e);
    push(err, msg);
    exitCode = 1;
  }

  self.postMessage({ stdout: out.join('\\n'), stderr: err.join('\\n'), exitCode, durationMs: Date.now() - t0 });
};
`;

export class JavaScriptEngine implements CodeEngine {
  readonly type = 'javascript' as EngineType;

  async init(): Promise<void> { /* worker is ephemeral per execution, nothing to pre-init */ }

  execute(code: string): Promise<CodeResult> {
    return new Promise((resolve) => {
      const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);

      const timer = setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(url);
        resolve({ stdout: '', stderr: 'Execution timed out (10 s).', exitCode: 124, durationMs: TIMEOUT_MS });
      }, TIMEOUT_MS);

      worker.onmessage = (e) => {
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        resolve(e.data as CodeResult);
      };

      worker.onerror = (e) => {
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        resolve({ stdout: '', stderr: e.message ?? 'Worker error', exitCode: 1, durationMs: 0 });
      };

      worker.postMessage({ code });
    });
  }
}
