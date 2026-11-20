import Database from 'better-sqlite3';
import { chmod, mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const source = resolve(process.env.FANJIN_DB_PATH || 'data/fanjin.sqlite');
const directory = resolve(process.env.FANJIN_BACKUP_DIR || resolve(dirname(source), 'backups'));
await mkdir(directory, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const destination = resolve(directory, `${basename(source)}.${stamp}-${randomBytes(4).toString('hex')}.sqlite`);
const db = new Database(source, { readonly: true, fileMustExist: true });
try {
  await db.backup(destination);
  const copy = new Database(destination, { readonly: true, fileMustExist: true });
  try {
    const integrity = copy.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') throw new Error('Backup integrity check failed. Keep the source database unchanged.');
  } finally { copy.close(); }
  await chmod(destination, 0o600);
  console.log(`Backup verified: ${destination}`);
} finally { db.close(); }
