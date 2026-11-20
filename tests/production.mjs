import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, access, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';

const root = resolve(import.meta.dirname, '..');
await access(join(root, 'dist', 'index.html')).catch(() => { throw new Error('Build the frontend before running production checks.'); });
const directory = await mkdtemp(join(tmpdir(), 'fanjin-production-'));
const password = randomBytes(24).toString('base64url');
const baseEnv = { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '0', SEED_DEMO: '0', TRUST_PROXY: '0', CORS_ORIGINS: '', FANJIN_DB_PATH: join(directory, 'production.sqlite'), FANJIN_BACKUP_DIR: join(directory, 'backups'), ADMIN_NAME: '生产验收管理员', ADMIN_PASSWORD: password };
const children = new Set();
function start(env, args = ['--import', 'tsx', 'server/index.ts']) {
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  children.add(child); child.once('exit', () => children.delete(child));
  let output = '';
  child.stdout.on('data', (chunk) => { output = (output + chunk).slice(-8000); });
  child.stderr.on('data', (chunk) => { output = (output + chunk).slice(-8000); });
  return { child, output: () => output };
}
async function stopped(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const event = once(child, 'exit'); child.kill('SIGTERM');
  const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
  await event; clearTimeout(timeout);
}
function ready(processHandle) {
  return new Promise((accept, reject) => {
    const timer = setTimeout(() => reject(new Error(`Production start timeout: ${processHandle.output()}`)), 30_000);
    const onExit = () => { clearTimeout(timer); reject(new Error(processHandle.output())); };
    processHandle.child.once('exit', onExit);
    processHandle.child.stdout.on('data', () => {
      const url = processHandle.output().match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (!url) return;
      clearTimeout(timer); processHandle.child.removeListener('exit', onExit); accept(url);
    });
  });
}
try {
  const missing = start({ ...baseEnv, FANJIN_DB_PATH: join(directory, 'no-credentials.sqlite'), ADMIN_NAME: '', ADMIN_PASSWORD: '' });
  const [missingCode] = await once(missing.child, 'exit');
  assert.notEqual(missingCode, 0); assert.match(missing.output(), /ADMIN_NAME/);
  console.log('  PASS first production start refuses missing administrator credentials');

  const server = start(baseEnv);
  const base = await ready(server);
  const health = await fetch(`${base}/api/health`); assert.equal(health.status, 200);
  const index = await fetch(`${base}/`); assert.equal(index.status, 200); assert.match(await index.text(), /<html/);
  assert.match(index.headers.get('content-security-policy'), /default-src 'self'/);
  assert.ok(index.headers.has('strict-transport-security'));
  const deep = await fetch(`${base}/reader/test`, { headers: { Accept: 'text/html' } }); assert.equal(deep.status, 200, `SPA response: ${await deep.clone().text()}`); assert.match(deep.headers.get('content-type'), /text\/html/);
  const unknown = await fetch(`${base}/api/not-a-real-route`); assert.equal(unknown.status, 404); assert.match(unknown.headers.get('content-type'), /application\/json/);
  console.log('  PASS production serves static frontend, SPA links and safe JSON API errors');

  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: baseEnv.ADMIN_NAME, password }) });
  assert.equal(login.status, 200); assert.match(login.headers.get('set-cookie'), /Secure/); assert.match(login.headers.get('set-cookie'), /HttpOnly/);
  const { token } = await login.json();
  const users = await fetch(`${base}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.json());
  assert.equal(users.length, 1); assert.equal(users[0].name, baseEnv.ADMIN_NAME);
  const books = await fetch(`${base}/api/scriptures`).then((response) => response.json()); assert.deepEqual(books, []);
  const defaultLogin = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '法音法师', password: 'fayin123' }) });
  assert.equal(defaultLogin.status, 401);
  console.log('  PASS production initializes only private administrator and sets Secure cookies');

  const backup = start(baseEnv, ['scripts/backup.mjs']);
  const [backupCode] = await once(backup.child, 'exit'); assert.equal(backupCode, 0, backup.output());
  const backups = (await readdir(baseEnv.FANJIN_BACKUP_DIR)).filter((file) => file.endsWith('.sqlite'));
  assert.equal(backups.length, 1);
  const copied = new Database(join(baseEnv.FANJIN_BACKUP_DIR, backups[0]), { readonly: true });
  assert.equal(copied.pragma('integrity_check', { simple: true }), 'ok');
  assert.equal(copied.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1); copied.close();
  console.log('  PASS production backup command verifies a live database snapshot');
  await stopped(server.child);

  const demoPath = join(directory, 'unsafe-demo.sqlite');
  const demo = start({ ...baseEnv, NODE_ENV: 'test', SEED_DEMO: '1', FANJIN_DB_PATH: demoPath });
  await ready(demo); await stopped(demo.child);
  const unsafe = start({ ...baseEnv, FANJIN_DB_PATH: demoPath });
  const [unsafeCode] = await once(unsafe.child, 'exit'); assert.notEqual(unsafeCode, 0); assert.match(unsafe.output(), /示例密码/);
  console.log('  PASS production refuses a development database with known passwords');
  console.log('\nProduction: 5 passed.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await Promise.all([...children].map(stopped));
  await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
