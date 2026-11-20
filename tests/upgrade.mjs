import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scryptSync } from 'node:crypto';
import Database from 'better-sqlite3';

// A pre-migration fixture with private content and customized settings, never a live database.
const directory = await mkdtemp(join(tmpdir(), 'fanjin-upgrade-'));
process.env.NODE_ENV = 'test';
process.env.SEED_DEMO = '0';
process.env.FANJIN_DB_PATH = join(directory, 'legacy.sqlite');
process.env.FANJIN_BACKUP_DIR = join(directory, 'backups');
let connection = new Database(process.env.FANJIN_DB_PATH);
try {
  connection.pragma('journal_mode = WAL');
  connection.exec(`
    CREATE TABLE categories (id INTEGER PRIMARY KEY,slug TEXT UNIQUE,name TEXT,description TEXT,sort_order INTEGER DEFAULT 0);
    CREATE TABLE scriptures (id INTEGER PRIMARY KEY,slug TEXT UNIQUE,title TEXT,category_id INTEGER,dynasty TEXT,translator TEXT,role TEXT,overlay TEXT,summary TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE passages (id INTEGER PRIMARY KEY,scripture_id INTEGER,slug TEXT,title TEXT,order_index INTEGER,original_text TEXT,plain_text TEXT,commentary_text TEXT,audio_url TEXT DEFAULT '',UNIQUE(scripture_id,slug));
    CREATE TABLE users (id INTEGER PRIMARY KEY,name TEXT UNIQUE,password_hash TEXT,role TEXT DEFAULT 'user',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE sessions (token TEXT PRIMARY KEY,user_id INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE notes (id INTEGER PRIMARY KEY,user_id INTEGER,scripture_id INTEGER,passage_id INTEGER,note TEXT,excerpt TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE reading_history (id INTEGER PRIMARY KEY,user_id INTEGER,scripture_id INTEGER,passage_id INTEGER,viewed_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE site_settings (key TEXT PRIMARY KEY,value TEXT);
    CREATE TABLE review_queue (id INTEGER PRIMARY KEY,title TEXT,type TEXT,submitter TEXT,status TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE study_plans (id INTEGER PRIMARY KEY,user_id INTEGER,scripture_id INTEGER,daily_minutes INTEGER,status TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,scripture_id));
    CREATE TABLE study_checkins (id INTEGER PRIMARY KEY,plan_id INTEGER,user_id INTEGER,passage_id INTEGER,day TEXT,minutes INTEGER,note TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(plan_id,passage_id,day));
    INSERT INTO categories VALUES (1,'legacy','旧分类','用户已有分类',0);
    INSERT INTO scriptures (id,slug,title,category_id,dynasty,translator,role,overlay,summary) VALUES (1,'legacy-book','旧经典',1,'古代','旧译者','原定位','用户自定义说明','原简介');
    INSERT INTO passages VALUES (11,1,'one','第一章',1,'學而時習之','未核验旧白话','未核验旧注义',''),(12,1,'two','第二章',2,'有朋自远方来','','','');
    INSERT INTO notes VALUES (91,7,1,11,'私人心得不能丢','保存时的原文快照','2026-01-01 00:00:00');
    INSERT INTO reading_history VALUES (19,7,1,11,'2026-01-01 01:00:00'),(20,7,1,12,'2026-01-02 01:00:00');
    INSERT INTO sessions VALUES ('old-cleartext-token',7,'2026-01-01 00:00:00');
    INSERT INTO site_settings VALUES ('site_name','用户自定义站名'),('site_subtitle','佛教共修公益古籍网');
    INSERT INTO study_plans VALUES (10,7,1,15,'active','2026-01-01 00:00:00');
    INSERT INTO study_checkins VALUES (1,10,7,11,'2026-01-01',10,'第一段心得','2026-01-01 00:00:00'),(2,10,7,12,'2026-01-01',20,'第二段心得','2026-01-01 01:00:00');
  `);
  const salt = '0123456789abcdef0123456789abcdef';
  const passwordHash = `${salt}:${scryptSync('legacy-test-password', salt, 64).toString('hex')}`;
  connection.prepare('INSERT INTO users (id,name,password_hash,role) VALUES (7,?,?,?)').run('旧用户', passwordHash, 'user');
  connection.close();
  const { db, initializeDatabase, verifyPassword } = await import('../server/db.ts');
  connection = db;
  const { personalMigration } = await import('../server/personal.ts');
  const { initializeContent } = await import('../server/content.ts');
  const { initializeStudy } = await import('../server/study.ts');
  const { productMigration } = await import('../server/product-migration.ts');
  const { preferencesMigration } = await import('../server/preferences.ts');
  const { bookshelfMigration } = await import('../server/bookshelf.ts');
  const migrations = [personalMigration, { id: 'study-20261120-v3', up: initializeStudy }, { id: 'content-20261120-v3', up: initializeContent }, productMigration, preferencesMigration, bookshelfMigration];
  await initializeDatabase(migrations);
  const user = db.prepare('SELECT * FROM users WHERE id=7').get();
  assert.equal(user.status, 'active'); assert.ok(verifyPassword('legacy-test-password', user.password_hash));
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sessions').get().count, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
  console.log('  PASS legacy users retain passwords, expire old tokens and gain no sample accounts');

  const note = db.prepare('SELECT * FROM notes WHERE id=91').get();
  assert.equal(note.note, '私人心得不能丢'); assert.equal(note.excerpt, '保存时的原文快照'); assert.equal(note.passage_id, 11);
  assert.equal(db.prepare('SELECT passage_id FROM reading_progress WHERE user_id=7').get().passage_id, 12);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM reading_history').get().count, 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM bookmarks').get().count, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM reading_preferences').get().count, 0);
  console.log('  PASS legacy notes and history survive and latest progress is recovered');

  assert.equal(db.prepare("SELECT value FROM site_settings WHERE key='site_name'").get().value, '用户自定义站名');
  assert.equal(db.prepare("SELECT value FROM site_settings WHERE key='site_subtitle'").get().value, '东方经典个人自修驿站');
  assert.equal(db.prepare('SELECT overlay FROM scriptures WHERE id=1').get().overlay, '用户自定义说明');
  console.log('  PASS product migration replaces exact sample wording and preserves custom settings');

  const passage = db.prepare('SELECT * FROM passages WHERE id=11').get();
  assert.equal(passage.plain_text, '未核验旧白话'); assert.equal(passage.classical_commentary, null);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM scripture_search_v2 WHERE scripture_search_v2 MATCH '学而时习之'").get().count, 1);
  const log = db.prepare('SELECT * FROM study_logs').all();
  assert.equal(log.length, 1); assert.equal(log[0].minutes, 30); assert.match(log[0].note, /第一段心得/); assert.match(log[0].note, /第二段心得/);
  console.log('  PASS search index normalizes legacy text and daily logs consolidate without losing notes');

  await initializeDatabase(migrations);
  assert.equal((await readdir(process.env.FANJIN_BACKUP_DIR)).filter((file) => file.endsWith('.sqlite')).length, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM study_logs').get().count, 1);
  console.log('  PASS restarting an upgraded database is idempotent');
  console.log('\nLegacy upgrade: 5 passed.');
} finally {
  if (connection.open) connection.close();
  await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
