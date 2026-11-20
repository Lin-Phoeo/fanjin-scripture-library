import { mkdirSync } from 'node:fs';
import { dirname, basename, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';

export type Migration = { id: string; up: () => void };

/** Back up the live WAL database before applying pending, transaction-bound migrations. */
export async function runMigrations(db: Database.Database, databasePath: string, migrations: Migration[]) {
  const ids = migrations.map((migration) => migration.id);
  if (new Set(ids).size !== ids.length || ids.some((id) => !/^[a-z0-9][a-z0-9-]{1,99}$/.test(id))) {
    throw new Error('迁移编号重复或格式不正确。');
  }
  const hasLedger = Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get());
  const applied = new Set(hasLedger ? (db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]).map((row) => row.id) : []);
  const pending = migrations.filter((migration) => !applied.has(migration.id));
  if (!pending.length) return { applied: [] as string[], backupPath: null as string | null };

  const hasDataTables = Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' LIMIT 1").get());
  let backupPath: string | null = null;
  if (hasDataTables) {
    const directory = resolve(process.env.FANJIN_BACKUP_DIR || resolve(dirname(databasePath), 'backups'));
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
    backupPath = resolve(directory, `${basename(databasePath)}.before-migration-${stamp}-${randomBytes(4).toString('hex')}.sqlite`);
    // SQLite's online backup includes committed WAL pages; copying the main file would not.
    await db.backup(backupPath);
  }

  const completed: string[] = [];
  db.transaction(() => {
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const exists = db.prepare('SELECT id FROM schema_migrations WHERE id = ?');
    const record = db.prepare('INSERT INTO schema_migrations (id) VALUES (?)');
    for (const migration of pending) {
      // Recheck under the write lock in case another process finished the same migration.
      if (exists.get(migration.id)) continue;
      migration.up();
      record.run(migration.id);
      completed.push(migration.id);
    }
  }).immediate();
  return { applied: completed, backupPath };
}
