import { bookshelfMigration, registerBookshelf } from './bookshelf.ts';
import { preferencesMigration, registerPreferences } from './preferences.ts';
import { productMigration } from './product-migration.ts';
import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, initializeDatabase } from './db.ts';
import { registerAuthRoutes } from './auth.ts';
import { InputError, textField } from './validation.ts';
import { initializeStudy, registerStudy } from './study.ts';
import { initializeContent, registerContent } from './content.ts';
import { personalMigration, registerPersonal } from './personal.ts';
import {
  protectOrigin, rateLimit,
  requireAdmin, requireStaff, requireUser, securityHeaders,
  type SessionUser,
} from './security.ts';

await initializeDatabase([
  personalMigration,
  { id: 'study-20261120-v3', up: initializeStudy },
  { id: 'content-20261120-v4', up: initializeContent },
  productMigration,
  preferencesMigration,
  bookshelfMigration,
]);

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) throw new Error('PORT 必须为 0–65535 的整数。');
const allowedOrigins = (process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:5173,http://localhost:5173'))
  .split(',').map((origin) => origin.trim()).filter(Boolean);
if (allowedOrigins.some((origin) => !/^https?:\/\/[^/]+$/.test(origin))) throw new Error('CORS_ORIGINS 必须是逗号分隔的完整来源地址。');
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(securityHeaders);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use('/api', protectOrigin(allowedOrigins), rateLimit(600, 60_000));
app.use(express.json({ limit: '2mb' }));
app.use('/api', (req, res, next) => {
  if (req.body === undefined) req.body = {};
  if (['POST', 'PUT', 'PATCH'].includes(req.method) &&
      (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    res.status(400).json({ message: '请提交 JSON 对象。' }); return;
  }
  next();
});
app.get('/api/health', (_req, res) => {
  db.prepare('SELECT 1').get();
  res.json({ ok: true, service: 'fanjin' });
});
app.get('/content-notices', (_req,res) => {
  res.type('text/plain; charset=utf-8').sendFile('COPYRIGHT.md', {root:resolve(process.cwd(),'data/catalog')});
});
app.get('/content-sources/heart-sutra-T08n0251.xml', (_req,res) => {
  res.setHeader('Content-Disposition','inline; filename="heart-sutra-T08n0251.xml"');
  res.type('text/plain; charset=utf-8').sendFile('heart-sutra-T08n0251.xml',{root:resolve(process.cwd(),'data/catalog/sources')});
});
app.use('/api/admin', requireAdmin);
registerPersonal(app);
registerPreferences(app);
registerBookshelf(app);

app.use(['/api/topics','/api/activities','/api/discussions','/api/my/discussions','/api/admin/topics','/api/admin/activities','/api/admin/discussions','/api/admin/replies'], (_req,res) => {
  res.status(410).json({message:'本站已调整为个人自修驿站，此功能已下线。'});
});

app.get('/api/home', (_req, res) => {
  const announcements = db
    .prepare('SELECT id, title, detail, created_at as createdAt FROM announcements ORDER BY id DESC')
    .all();
  const featuredScriptures = db
    .prepare(
      `SELECT scriptures.slug, scriptures.title, scriptures.role, scriptures.overlay, categories.name as category
       FROM scriptures
       JOIN categories ON categories.id = scriptures.category_id
       WHERE scriptures.publish_status = 'published'
       ORDER BY scriptures.id ASC
       LIMIT 3`,
    )
    .all();
  const stats = {
    scriptureCount: (
      db.prepare("SELECT COUNT(*) as count FROM scriptures WHERE publish_status = 'published'").get() as {
        count: number;
      }
    ).count,
    passageCount: (db.prepare("SELECT COUNT(*) as count FROM passages p JOIN scriptures s ON s.id=p.scripture_id WHERE s.publish_status='published'").get() as { count: number }).count,
    topicCount: (db.prepare('SELECT COUNT(*) as count FROM topics').get() as { count: number }).count,
    discussionCount: (db.prepare("SELECT COUNT(*) as count FROM discussions WHERE visibility='visible'").get() as { count: number }).count,
  };
  const settingsRows = db.prepare('SELECT key, value FROM site_settings').all() as Array<{ key: string; value: string }>;
  const settings = Object.fromEntries(settingsRows.map((item) => [item.key, item.value]));

  res.json({ announcements, featuredScriptures, stats, settings });
});

app.get('/api/categories', (_req, res) => {
  const categories = db
    .prepare('SELECT id, slug, name, description, sort_order as sortOrder FROM categories ORDER BY sort_order ASC')
    .all();
  res.json(categories);
});

app.get('/api/settings', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings ORDER BY key ASC').all() as Array<{ key: string; value: string }>;
  res.json(Object.fromEntries(rows.map((item) => [item.key, item.value])));
});

registerAuthRoutes(app);

app.get('/api/me', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;

  const favoritesCount = (
    db.prepare('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?').get(user.id) as { count: number }
  ).count;
  const notesCount = (
    db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?').get(user.id) as { count: number }
  ).count;

  res.json({
    ...user,
    stats: {
      favoritesCount,
      notesCount,
    },
  });
});

app.get('/api/favorites', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;
  const favorites = db
    .prepare(
      `SELECT scriptures.slug, scriptures.title, scriptures.overlay, categories.name as categoryName
       FROM favorites
       JOIN scriptures ON scriptures.id = favorites.scripture_id
       JOIN categories ON categories.id = scriptures.category_id
       WHERE favorites.user_id = ?
       ORDER BY favorites.created_at DESC`,
    )
    .all(user.id);
  res.json(favorites);
});

app.post('/api/favorites', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;
  const scriptureSlug = String(req.body.scriptureSlug ?? '').trim();
  const scripture = db.prepare("SELECT id FROM scriptures WHERE slug = ? AND publish_status='published'").get(scriptureSlug) as { id: number } | undefined;

  if (!scripture) {
    res.status(404).json({ message: '未找到对应经典。' });
    return;
  }

  db.prepare('INSERT OR IGNORE INTO favorites (user_id, scripture_id) VALUES (?, ?)').run(user.id, scripture.id);
  res.json({ ok: true });
});

app.delete('/api/favorites/:scriptureSlug', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;
  db.prepare(
    `DELETE FROM favorites
     WHERE user_id = ?
       AND scripture_id IN (SELECT id FROM scriptures WHERE slug = ?)`,
  ).run(user.id, req.params.scriptureSlug);
  res.json({ ok: true });
});

app.get('/api/history', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;
  const rows = db
    .prepare(
      `SELECT reading_history.id, reading_history.viewed_at as viewedAt,
        scriptures.slug as scriptureSlug, scriptures.title as scriptureTitle,
        passages.slug as passageSlug, passages.title as passageTitle
       FROM reading_history
       JOIN scriptures ON scriptures.id = reading_history.scripture_id
       LEFT JOIN passages ON passages.id = reading_history.passage_id
       WHERE reading_history.user_id = ?
       ORDER BY reading_history.viewed_at DESC
       LIMIT 20`,
    )
    .all(user.id);
  res.json(rows);
});

app.post('/api/history', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;
  const scriptureSlug = String(req.body.scriptureSlug ?? '').trim();
  const passageSlug = String(req.body.passageSlug ?? '').trim();

  if (!scriptureSlug) {
    res.status(400).json({ message: '缺少经典标识。' });
    return;
  }

  const scripture = db.prepare("SELECT id FROM scriptures WHERE slug = ? AND publish_status='published'").get(scriptureSlug) as { id: number } | undefined;
  if (!scripture) {
    res.status(404).json({ message: '未找到对应经典。' });
    return;
  }

  const passage = passageSlug
    ? (db
        .prepare('SELECT id FROM passages WHERE scripture_id = ? AND slug = ?')
        .get(scripture.id, passageSlug) as { id: number } | undefined)
    : undefined;

  if (passageSlug && !passage) throw new InputError('阅读段落不存在。', 404);
  db.transaction(() => {
    db.prepare('DELETE FROM reading_history WHERE user_id=? AND scripture_id=?').run(user.id, scripture.id);
    db.prepare('INSERT INTO reading_history (user_id, scripture_id, passage_id) VALUES (?, ?, ?)').run(user.id, scripture.id, passage?.id ?? null);
  })();

  res.json({ ok: true });
});

app.get('/api/admin/dashboard', requireStaff, (_req, res) => {
  const metrics = {
    userCount: (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count,
    scriptureCount: (db.prepare('SELECT COUNT(*) as count FROM scriptures').get() as { count: number }).count,
    noteCount: (db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number }).count,
    discussionCount: (db.prepare('SELECT COUNT(*) as count FROM discussions').get() as { count: number }).count,
    reviewCount: (db.prepare("SELECT COUNT(*) as count FROM review_queue WHERE status IN ('待审核','待修改') AND target_kind='scripture'").get() as { count: number }).count,
  };

  const queue = db
    .prepare(
      'SELECT id, title, type, submitter, status, created_at as createdAt FROM review_queue ORDER BY id DESC',
    )
    .all();

  const users = res.locals.user.role === 'admin' ? db
    .prepare('SELECT id, name, role, created_at as createdAt FROM users ORDER BY id ASC')
    .all() : [];

  res.json({ metrics, queue, users });
});

app.get('/api/admin/review', requireStaff, (_req, res) => {
  const status = String(_req.query.status ?? '').trim();
  let sql =
    'SELECT id, title, type, submitter, status, target_kind as targetKind, target_slug as targetSlug, created_at as createdAt FROM review_queue';
  const params: unknown[] = [];

  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }

  sql += ' ORDER BY id DESC';

  const queue = db
    .prepare(sql)
    .all(...params);
  res.json(queue);
});

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const users = db
    .prepare('SELECT id, name, role, status, created_at as createdAt FROM users ORDER BY id ASC')
    .all();
  res.json(users);
});

app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { role, status } = req.body;
  if (!Number.isSafeInteger(id) || id < 1 || (role === undefined && status === undefined) ||
      (role !== undefined && !['user', 'reviewer', 'admin'].includes(role)) ||
      (status !== undefined && !['active', 'disabled'].includes(status))) {
    res.status(400).json({ message: '请提供有效账号、角色或账号状态。' }); return;
  }
  const target = db.prepare('SELECT role, status FROM users WHERE id = ?').get(id) as { role: string; status: string } | undefined;
  if (!target) { res.status(404).json({ message: '账号不存在。' }); return; }
  const nextRole = role ?? target.role;
  const nextStatus = status ?? target.status;
  const lastAdmin = target.role === 'admin' && target.status === 'active' &&
    (nextRole !== 'admin' || nextStatus !== 'active') &&
    (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active'").get() as { count: number }).count <= 1;
  if (lastAdmin) { res.status(409).json({ message: '至少需要保留一名可用管理员。' }); return; }
  db.transaction(() => {
    db.prepare('UPDATE users SET role = ?, status = ? WHERE id = ?').run(nextRole, nextStatus, id);
    if (target.role !== nextRole || target.status !== nextStatus) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  })();
  res.json({ ok: true });
});

app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings ORDER BY key ASC').all() as Array<{ key: string; value: string }>;
  res.json(Object.fromEntries(rows.map((item) => [item.key, item.value])));
});

app.get('/api/admin/announcements', requireStaff, (_req, res) => {
  const rows = db
    .prepare('SELECT id, title, detail, created_at as createdAt FROM announcements ORDER BY id DESC')
    .all();
  res.json(rows);
});

app.post('/api/admin/announcements', requireStaff, (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const detail = textField(req.body.detail,'公告内容',10000);

  if (!title || !detail) {
    res.status(400).json({ message: '请完整填写公告标题与内容。' });
    return;
  }

  const result = db.prepare('INSERT INTO announcements (title, detail) VALUES (?, ?)').run(title, detail);
  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

app.put('/api/admin/announcements/:id', requireAdmin, (req,res)=>{
  const title=textField(req.body.title,'公告标题',200),detail=textField(req.body.detail,'公告内容',10000);
  const result=db.prepare('UPDATE announcements SET title=?,detail=? WHERE id=?').run(title,detail,req.params.id);
  if(!result.changes) throw new InputError('公告不存在。',404);
  res.json({ok:true});
});

app.delete('/api/admin/announcements/:id', requireStaff, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const settings = req.body as Record<string, string>;
  const allowed=['site_name','site_subtitle','site_description','footer_notice'];
  for(const [key,value] of Object.entries(settings)) {
    if(!allowed.includes(key)) throw new InputError('不支持的站点配置字段。');
    textField(value,'站点配置',2000,true);
  }
  const transaction = db.transaction(() => {
    const upsert = db.prepare(
      `INSERT INTO site_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    Object.entries(settings).forEach(([key, value]) => {
      upsert.run(key, String(value ?? ''));
    });
  });

  transaction();
  res.json({ ok: true });
});

registerStudy(app);
registerContent(app);

app.use('/api', (_req, res) => { res.status(404).json({ message: '接口不存在。' }); });

if (process.env.NODE_ENV === 'production') {
  const dist = resolve(process.cwd(), 'dist');
  if (!existsSync(resolve(dist, 'index.html'))) throw new Error('未找到前端构建产物，请先运行 npm run build。');
  app.use('/assets', express.static(resolve(dist, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
  app.use(express.static(dist, { maxAge: 0 }));
  app.get('/{*path}', (req, res) => {
    if (!req.accepts('html')) { res.status(404).end(); return; }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile('index.html', { root: dist });
  });
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (res.headersSent) { _next(error); return; }
  if (error instanceof InputError && error.status >= 400 && error.status < 500) {
    res.status(error.status).json({ message: error.message }); return;
  }
  const detail = error as { status?: number; type?: string; code?: string };
  if (detail.type === 'entity.too.large') { res.status(413).json({ message: '提交内容过大，请分批录入。' }); return; }
  if (detail.type === 'entity.parse.failed' || detail.status === 400) { res.status(400).json({ message: '请求格式不正确。' }); return; }
  if (detail.code?.startsWith('SQLITE_CONSTRAINT')) { res.status(409).json({ message: '内容已存在或仍被其他记录引用。' }); return; }
  if (detail.status === 404) { res.status(404).json({ message: '资源不存在。' }); return; }
  console.error('API request failed', { code: detail.code ?? 'INTERNAL_ERROR' });
  res.status(500).json({ message: '服务暂时无法完成请求，请稍后重试。' });
});

const server = app.listen(PORT, HOST, () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : PORT;
  console.log(`梵烬网 API 已启动: http://${HOST}:${port}`);
});
const shutdown = () => {
  server.close(() => { db.close(); process.exit(0); });
  server.closeIdleConnections();
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
