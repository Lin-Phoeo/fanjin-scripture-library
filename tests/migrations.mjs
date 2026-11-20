import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { runMigrations } from '../server/migrations.ts';

const directory = await mkdtemp(join(tmpdir(), 'fanjin-migration-'));
const databasePath = join(directory, 'migration.sqlite');
process.env.FANJIN_BACKUP_DIR = join(directory, 'backups');
const db = new Database(databasePath);
try {
  db.pragma('journal_mode = WAL');
  db.exec("CREATE TABLE original (value TEXT); INSERT INTO original VALUES ('committed WAL data')");
  const first = { id: 'test-v1', up() { db.exec('CREATE TABLE added (value TEXT)'); } };
  const result = await runMigrations(db, databasePath, [first]);
  assert.deepEqual(result.applied, ['test-v1']); assert.ok(result.backupPath);
  const backup = new Database(result.backupPath, { readonly: true });
  assert.equal(backup.prepare('SELECT value FROM original').get().value, 'committed WAL data');
  assert.equal(backup.prepare("SELECT name FROM sqlite_master WHERE name='added'").get(), undefined);
  backup.close();
  console.log('  PASS online backup includes committed WAL data before migration');
  const repeat = await runMigrations(db, databasePath, [first]);
  assert.deepEqual(repeat.applied, []); assert.equal(repeat.backupPath, null);
  assert.equal((await readdir(process.env.FANJIN_BACKUP_DIR)).filter((file) => file.endsWith('.sqlite')).length, 1);
  console.log('  PASS applied migrations do not rerun or create duplicate backups');
  await assert.rejects(runMigrations(db, databasePath, [first, {
    id: 'test-v2', up() { db.exec("CREATE TABLE broken (value TEXT); INSERT INTO original VALUES ('must roll back')"); throw new Error('deliberate failure'); },
  }]), /deliberate failure/);
  assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='broken'").get(), undefined);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM original').get().count, 1);
  assert.equal(db.prepare("SELECT id FROM schema_migrations WHERE id='test-v2'").get(), undefined);
  console.log('  PASS failed migration rolls back DDL, data and ledger atomically');
  await assert.rejects(runMigrations(db, databasePath, [first, first]), /迁移编号/);
  console.log('  PASS duplicate migration IDs are rejected');
  console.log('\nMigrations: 4 passed.');
} finally {
  db.close();
  await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
