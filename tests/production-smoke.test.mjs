import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { test, before, after } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let serverProcess;
let baseUrl;
let output = '';

before(async () => {
  const portServer = createServer();
  await new Promise((resolveListen, reject) => {
    portServer.once('error', reject);
    portServer.listen(0, '127.0.0.1', resolveListen);
  });
  const address = portServer.address();
  if (!address || typeof address === 'string') throw new Error('Could not allocate a local port.');
  await new Promise((resolveClose, reject) => {
    portServer.close(error => error ? reject(error) : resolveClose());
  });

  baseUrl = `http://127.0.0.1:${address.port}`;
  serverProcess = spawn(
    process.execPath,
    [resolve(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-H', '127.0.0.1', '-p', String(address.port)],
    { cwd: projectRoot, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  serverProcess.stdout.setEncoding('utf8').on('data', chunk => { output = `${output}${chunk}`.slice(-4000); });
  serverProcess.stderr.setEncoding('utf8').on('data', chunk => { output = `${output}${chunk}`.slice(-4000); });

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Next.js production server exited with code ${serverProcess.exitCode}.\n${output}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      await delay(500);
    }
  }
  throw new Error(`Next.js production server did not become ready.\n${output}`);
}, { timeout: 90_000 });

after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  serverProcess.kill();
  await Promise.race([
    new Promise(resolveExit => serverProcess.once('exit', resolveExit)),
    delay(5000),
  ]);
});

test('production health endpoint responds with a valid status', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json().then(({ status, service }) => ({ status, service })), {
    status: 'ok',
    service: 'socialsphere',
  });
});
