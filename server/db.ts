import Database from 'better-sqlite3';
import { Converter } from 'opencc-js/t2cn';
export const normalizeSearch = Converter({ from: 't', to: 'cn' });
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { runMigrations, type Migration } from './migrations.ts';
import {
  defaultUsers,
  seedActivities,
  seedAnnouncements,
  seedCategories,
  seedDiscussions,
  seedReviewQueue,
  seedSettings,
  seedScriptures,
  seedTopics,
} from './data.ts';

export const DB_PATH = resolve(process.env.FANJIN_DB_PATH || resolve(process.cwd(), 'data', 'fanjin.sqlite'));
const production = process.env.NODE_ENV === 'production';
const demoEnabled = !production && process.env.SEED_DEMO !== '0' && process.env.SEED_DEMO !== 'false';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

if (production && ['1', 'true'].includes(process.env.SEED_DEMO || '')) {
  throw new Error('生产环境不允许开启 SEED_DEMO。');
}

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.function('normalize_text', {deterministic:true}, (value:unknown)=>normalizeSearch(String(value??'')));

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hashed = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hashed}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  if (!salt || !key || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(key)) return false;
  const hashedBuffer = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  return timingSafeEqual(hashedBuffer, keyBuffer);
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS scriptures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      dynasty TEXT NOT NULL,
      translator TEXT NOT NULL,
      role TEXT NOT NULL,
      overlay TEXT NOT NULL,
      summary TEXT NOT NULL,
      publish_status TEXT NOT NULL DEFAULT 'published',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS passages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scripture_id INTEGER NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      original_text TEXT NOT NULL,
      plain_text TEXT NOT NULL,
      commentary_text TEXT NOT NULL,
      audio_url TEXT NOT NULL DEFAULT '',
      FOREIGN KEY(scripture_id) REFERENCES scriptures(id),
      UNIQUE(scripture_id, slug)
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      goal TEXT NOT NULL,
      schedule TEXT NOT NULL,
      duration TEXT NOT NULL,
      participants INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS topic_scriptures (
      topic_id INTEGER NOT NULL,
      scripture_id INTEGER NOT NULL,
      PRIMARY KEY(topic_id, scripture_id),
      FOREIGN KEY(topic_id) REFERENCES topics(id),
      FOREIGN KEY(scripture_id) REFERENCES scriptures(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      schedule TEXT NOT NULL,
      location TEXT NOT NULL,
      format TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      recovery_code_hash TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL,
      scripture_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, scripture_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(scripture_id) REFERENCES scriptures(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      scripture_id INTEGER NOT NULL,
      passage_id INTEGER NOT NULL,
      note TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(scripture_id) REFERENCES scriptures(id),
      FOREIGN KEY(passage_id) REFERENCES passages(id)
    );

    CREATE TABLE IF NOT EXISTS discussions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      scripture_id INTEGER,
      topic_id INTEGER,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      replies_count INTEGER NOT NULL DEFAULT 0,
      likes_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(scripture_id) REFERENCES scriptures(id),
      FOREIGN KEY(topic_id) REFERENCES topics(id)
    );

    CREATE TABLE IF NOT EXISTS discussion_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discussion_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(discussion_id) REFERENCES discussions(id)
    );

    CREATE TABLE IF NOT EXISTS reading_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      scripture_id INTEGER NOT NULL,
      passage_id INTEGER,
      viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(scripture_id) REFERENCES scriptures(id),
      FOREIGN KEY(passage_id) REFERENCES passages(id)
    );

    CREATE TABLE IF NOT EXISTS review_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      submitter TEXT NOT NULL,
      status TEXT NOT NULL,
      target_kind TEXT,
      target_slug TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function columnExists(table: string, column: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((item) => item.name === column);
}

function migrateSchema() {
  if (!columnExists('users', 'status')) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  }
  if (!columnExists('users', 'recovery_code_hash')) {
    db.exec('ALTER TABLE users ADD COLUMN recovery_code_hash TEXT');
  }
  if (!columnExists('sessions', 'expires_at')) {
    db.exec('ALTER TABLE sessions ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0');
    // Legacy tokens were stored in cleartext without an expiry. Require a fresh login.
    db.prepare('DELETE FROM sessions').run();
  }
  db.exec('CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id); CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at)');
  if (!columnExists('scriptures', 'publish_status')) {
    db.exec("ALTER TABLE scriptures ADD COLUMN publish_status TEXT NOT NULL DEFAULT 'published'");
  }

  if (!columnExists('review_queue', 'target_kind')) {
    db.exec('ALTER TABLE review_queue ADD COLUMN target_kind TEXT');
  }

  if (!columnExists('review_queue', 'target_slug')) {
    db.exec('ALTER TABLE review_queue ADD COLUMN target_slug TEXT');
  }

  db.prepare(
    "UPDATE scriptures SET publish_status = 'published' WHERE publish_status IS NULL OR publish_status = ''",
  ).run();
}

function seedData() {
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO site_settings (key, value) VALUES (@key, @value)',
  );
  seedSettings.forEach((setting) => insertSetting.run(setting));

  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM scriptures').get() as { count: number };

  const insertCategory = db.prepare(
    'INSERT OR IGNORE INTO categories (slug, name, description, sort_order) VALUES (@slug, @name, @description, @sortOrder)',
  );
  const insertScripture = db.prepare(
    `INSERT INTO scriptures
      (slug, title, category_id, dynasty, translator, role, overlay, summary)
      VALUES (@slug, @title, @categoryId, @dynasty, @translator, @role, @overlay, @summary)`,
  );
  const insertPassage = db.prepare(
    `INSERT INTO passages
      (scripture_id, slug, title, order_index, original_text, plain_text, commentary_text, audio_url)
      VALUES (@scriptureId, @slug, @title, @orderIndex, @originalText, @plainText, @commentaryText, @audioUrl)`,
  );
  const insertTopic = db.prepare(
    `INSERT INTO topics (slug, title, summary, goal, schedule, duration, participants)
      VALUES (@slug, @title, @summary, @goal, @schedule, @duration, @participants)`,
  );
  const insertTopicScripture = db.prepare(
    'INSERT INTO topic_scriptures (topic_id, scripture_id) VALUES (?, ?)',
  );
  const insertAnnouncement = db.prepare(
    'INSERT INTO announcements (title, detail) VALUES (@title, @detail)',
  );
  const insertActivity = db.prepare(
    'INSERT INTO activities (slug, title, summary, schedule, location, format, status) VALUES (@slug, @title, @summary, @schedule, @location, @format, @status)',
  );
  const insertDiscussion = db.prepare(
    `INSERT INTO discussions
      (title, scripture_id, topic_id, author_name, body, replies_count, likes_count)
      VALUES (@title, @scriptureId, @topicId, @authorName, @body, @repliesCount, @likesCount)`,
  );
  const insertReview = db.prepare(
    'INSERT INTO review_queue (title, type, submitter, status) VALUES (@title, @type, @submitter, @status)',
  );
  if (demoEnabled && categoryCount.count === 0) {
    seedActivities.forEach((activity) => insertActivity.run(activity));
  }

  if (categoryCount.count > 0) {
    return;
  }

  const transaction = db.transaction(() => {
    for (const category of seedCategories) {
      insertCategory.run(category);
    }

    if (!demoEnabled) return;

    const categoryMap = new Map(
      (db.prepare('SELECT id, slug FROM categories').all() as Array<{ id: number; slug: string }>).map((item) => [
        item.slug,
        item.id,
      ]),
    );

    for (const scripture of seedScriptures) {
      const categoryId = categoryMap.get(scripture.categorySlug);
      const result = insertScripture.run({
        ...scripture,
        categoryId,
      });
      const scriptureId = Number(result.lastInsertRowid);

      scripture.passages.forEach((passage, index) => {
        insertPassage.run({
          scriptureId,
          ...passage,
          orderIndex: index + 1,
        });
      });
    }

    const scriptureMap = new Map(
      (db.prepare('SELECT id, slug FROM scriptures').all() as Array<{ id: number; slug: string }>).map((item) => [
        item.slug,
        item.id,
      ]),
    );

    for (const topic of seedTopics) {
      const result = insertTopic.run(topic);
      const topicId = Number(result.lastInsertRowid);
      topic.scriptureSlugs.forEach((slug) => {
        const scriptureId = scriptureMap.get(slug);
        if (scriptureId) {
          insertTopicScripture.run(topicId, scriptureId);
        }
      });
    }

    seedAnnouncements.forEach((announcement) => insertAnnouncement.run(announcement));

    const topicMap = new Map(
      (db.prepare('SELECT id, slug FROM topics').all() as Array<{ id: number; slug: string }>).map((item) => [
        item.slug,
        item.id,
      ]),
    );

    seedDiscussions.forEach((discussion) => {
      insertDiscussion.run({
        ...discussion,
        scriptureId: scriptureMap.get(discussion.scriptureSlug) ?? null,
        topicId: topicMap.get(discussion.topicSlug) ?? null,
      });
    });

    seedReviewQueue.forEach((item) => insertReview.run(item));

  });

  transaction();
}

function initializeAccounts() {
  if (production) {
    // A development database must not silently expose its well-known accounts after deployment.
    for (const sample of defaultUsers) {
      const existing = db.prepare("SELECT password_hash FROM users WHERE name = ? AND status = 'active'")
        .get(sample.name) as { password_hash: string } | undefined;
      if (existing && verifyPassword(sample.password, existing.password_hash)) {
        throw new Error('数据库仍含使用示例密码的活跃账号，请先修改或禁用示例账号，再进入生产模式。');
      }
    }
    const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1").get();
    if (admin) return;
    const name = process.env.ADMIN_NAME?.trim();
    const password = process.env.ADMIN_PASSWORD;
    if (!name || name.length < 2 || name.length > 40 || !password || password.length < 12 || password.length > 128) {
      throw new Error('首次生产启动需设置 ADMIN_NAME（2–40 字符）和 ADMIN_PASSWORD（12–128 字符）。');
    }
    if (db.prepare('SELECT id FROM users WHERE name = ?').get(name)) {
      throw new Error('ADMIN_NAME 已由现有账号使用，请选择独立管理员账号。');
    }
    db.prepare("INSERT INTO users (name, password_hash, role) VALUES (?, ?, 'admin')")
      .run(name, hashPassword(password));
    return;
  }
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (demoEnabled && userCount.count === 0) {
    const insert = db.prepare('INSERT INTO users (name, password_hash, role) VALUES (?, ?, ?)');
    db.transaction(() => {
      defaultUsers.forEach((user) => insert.run(user.name, hashPassword(user.password), user.role));
    })();
  }
}

export async function initializeDatabase(extraMigrations: Migration[] = []) {
  const result = await runMigrations(db, DB_PATH, [
    { id: 'core-20261120-v1', up: () => { createSchema(); migrateSchema(); } },
    ...extraMigrations,
  ]);
  initializeAccounts();
  seedData();
  return result;
}

export function createSession(userId: number) {
  const token = randomBytes(24).toString('hex');
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(createHash('sha256').update(token).digest('hex'), userId, now + SESSION_TTL_SECONDS * 1000);
  return token;
}
