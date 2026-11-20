import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';

// Always owns its API and database. No URL override can target a real installation.
const directory = await mkdtemp(join(tmpdir(), 'fanjin-test-'));
const root = resolve(import.meta.dirname, '..');
const childEnv = {
  ...process.env, NODE_ENV: 'test', SEED_DEMO: '1', PORT: '0', HOST: '127.0.0.1',
  FANJIN_DB_PATH: join(directory, 'test.sqlite'), FANJIN_BACKUP_DIR: join(directory, 'backups'),
  CORS_ORIGINS: '', TRUST_PROXY: '0',
};
const children = new Set();
function child(args, env, stdio = 'inherit') {
  const handle = spawn(process.execPath, args, { cwd: root, env, stdio, windowsHide: true });
  children.add(handle);
  handle.once('exit', () => children.delete(handle));
  return handle;
}
async function stop(handle) {
  if (handle.exitCode !== null || handle.signalCode !== null) return;
  const stopped = once(handle, 'exit');
  handle.kill('SIGTERM');
  const timeout = setTimeout(() => handle.kill('SIGKILL'), 5000);
  await stopped;
  clearTimeout(timeout);
}
async function run(args, env) {
  const handle = child(args, env);
  const [code] = await once(handle, 'exit');
  if (code !== 0) throw new Error(`${args.at(-1)} failed (${code})`);
}
function awaitReady(server) {
  return new Promise((accept, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`API start timed out. ${output}`)), 30_000);
    const exit = (code) => { clearTimeout(timeout); reject(new Error(`API exited (${code}). ${output}`)); };
    server.once('exit', exit);
    server.on('error', reject);
    server.stdout.on('data', (chunk) => {
      output = (output + chunk).slice(-8000);
      const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (!url) return;
      clearTimeout(timeout);
      server.removeListener('exit', exit);
      accept(url);
    });
    server.stderr.on('data', (chunk) => { output = (output + chunk).slice(-8000); });
  });
}
let exitCode = 0;
try {
  const server = child(['--import', 'tsx', 'server/index.ts'], childEnv, ['ignore', 'pipe', 'pipe']);
  const base = await awaitReady(server);
  console.log('Testing a temporary database and an isolated API process.');
  await run(['tests/run.mjs'], { ...childEnv, TEST_API_BASE: base, FANJIN_TEST_ISOLATED: '1' });
  await stop(server);
  await run(['--import', 'tsx', 'tests/migrations.mjs'], childEnv);
  await run(['--import', 'tsx', 'tests/upgrade.mjs'], childEnv);
} catch (error) {
  console.error(error.message);
  exitCode = 1;
} finally {
  await Promise.all([...children].map(stop));
  await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
process.exitCode = exitCode;
