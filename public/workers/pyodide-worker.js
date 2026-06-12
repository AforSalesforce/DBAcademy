// Pyodide web worker — loads once and stays alive for the session.
// Imported via new Worker('/workers/pyodide-worker.js') from python-engine.ts.
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');

let pyodide = null;

loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' })
  .then(py => {
    pyodide = py;
    self.postMessage({ type: 'ready' });
  })
  .catch(err => {
    self.postMessage({ type: 'init-error', message: String(err) });
  });

self.onmessage = async function (e) {
  const { type, id, code } = e.data;
  if (type !== 'execute') return;

  if (!pyodide) {
    self.postMessage({
      type: 'result', id,
      stdout: '', stderr: 'Python runtime not ready.', exitCode: 1, durationMs: 0,
    });
    return;
  }

  const t0 = Date.now();
  const out = [];
  const err = [];

  pyodide.setStdout({ batched: line => out.push(line) });
  pyodide.setStderr({ batched: line => err.push(line) });

  let exitCode = 0;
  try {
    await pyodide.runPythonAsync(code);
  } catch (e2) {
    err.push(String(e2));
    exitCode = 1;
  }

  self.postMessage({
    type: 'result', id,
    stdout: out.join('\n'),
    stderr: err.join('\n'),
    exitCode,
    durationMs: Date.now() - t0,
  });
};
