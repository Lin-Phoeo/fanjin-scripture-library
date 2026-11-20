import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { Converter } from 'opencc-js/t2cn';

const run = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), 'fanjin-catalog-'));
const root = resolve(import.meta.dirname, '..');
const sourceDirectory = join(directory, 'catalog');
const databasePath = join(directory, 'catalog.sqlite');
const env = { ...process.env, NODE_ENV: 'test', SEED_DEMO: '0', FANJIN_DB_PATH: databasePath, FANJIN_BACKUP_DIR: join(directory, 'backups') };
const normalize = Converter({ from: 't', to: 'cn' });
let db;
async function importCatalog(...flags) {
  const { stdout } = await run(process.execPath, ['--import', 'tsx', 'scripts/import-catalog.mjs', `--directory=${sourceDirectory}`, ...flags], { cwd: root, env, timeout: 30_000, windowsHide: true });
  return JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
}
try {
  await mkdir(sourceDirectory);
  const source = JSON.parse(await readFile(join(root, 'data/catalog/heart-sutra.json'), 'utf8'));
  const first = { ...source, slug: 'catalog-first-fixture', title: '隔离测试目录一（不上线）' };
  await writeFile(join(sourceDirectory, 'first.json'), JSON.stringify(first));
  const initial = await importCatalog('--published', '--only-missing');
  assert.equal(initial.imported, 1); assert.equal(initial.skipped, 0);
  db = new Database(databasePath);
  db.function('normalize_text', { deterministic: true }, (value) => normalize(String(value ?? '')));
  assert.equal(db.prepare('SELECT source_header FROM scriptures WHERE slug=?').get(first.slug).source_header, first.sourceHeader.trim());
  console.log('  PASS first catalog import publishes missing books and preserves source header');

  db.prepare("UPDATE scriptures SET summary='管理员已校订的简介',publish_status='changes_requested' WHERE slug=?").run(first.slug);
  db.close(); db = undefined;
  const second = { ...source, slug: 'catalog-second-fixture', title: '隔离测试目录二（不上线）' };
  await writeFile(join(sourceDirectory, 'second.json'), JSON.stringify(second));
  const repeated = await importCatalog('--published', '--only-missing');
  assert.equal(repeated.imported, 1); assert.equal(repeated.skipped, 1);
  db = new Database(databasePath);
  const saved = db.prepare('SELECT summary,publish_status FROM scriptures WHERE slug=?').get(first.slug);
  assert.equal(saved.summary, '管理员已校订的简介'); assert.equal(saved.publish_status, 'changes_requested');
  assert.equal(db.prepare('SELECT publish_status FROM scriptures WHERE slug=?').get(second.slug).publish_status, 'published');
  const reviews = db.prepare('SELECT COUNT(*) AS count FROM review_queue').get().count;
  db.close(); db = undefined;
  console.log('  PASS deployment import preserves edited or withdrawn books while adding new titles');

  const noChanges = await importCatalog('--published', '--only-missing');
  assert.equal(noChanges.imported, 0); assert.equal(noChanges.skipped, 2);
  db = new Database(databasePath);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM review_queue').get().count, reviews);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM scriptures').get().count, 2);
  console.log('  PASS repeated deployment does not rewrite content or append review records');
  console.log('\nCatalog deployment: 3 passed.');
} finally {
  if (db?.open) db.close();
  await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
