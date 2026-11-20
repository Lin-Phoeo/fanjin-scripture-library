import type { Express } from 'express';
import { db } from './db.ts';
import type { Migration } from './migrations.ts';
import { rateLimit, requireAdmin, requireUser } from './security.ts';
import { InputError, positiveId, slugField, textField } from './validation.ts';

export const personalMigration: Migration = {
  id: 'personal-20261120-v1',
  up() {
    db.exec(`CREATE TABLE IF NOT EXISTS reading_progress (
      user_id INTEGER NOT NULL REFERENCES users(id), scripture_id INTEGER NOT NULL REFERENCES scriptures(id),
      passage_id INTEGER NOT NULL REFERENCES passages(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, scripture_id));
      CREATE INDEX IF NOT EXISTS reading_progress_user_date ON reading_progress(user_id, updated_at);
      CREATE TABLE IF NOT EXISTS correction_reports (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
        scripture_id INTEGER NOT NULL REFERENCES scriptures(id), passage_id INTEGER NOT NULL REFERENCES passages(id),
        message TEXT NOT NULL, excerpt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','rejected')),
        response TEXT NOT NULL DEFAULT '', resolved_by INTEGER REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS correction_reports_status ON correction_reports(status, id);
      CREATE INDEX IF NOT EXISTS notes_user_scripture ON notes(user_id, scripture_id);
    `);
    const columns = db.prepare('PRAGMA table_info(notes)').all() as { name: string }[];
    if (!columns.some((column) => column.name === 'updated_at')) {
      db.exec('ALTER TABLE notes ADD COLUMN updated_at TEXT');
      db.exec('UPDATE notes SET updated_at = created_at WHERE updated_at IS NULL');
    }
    db.exec(`INSERT OR IGNORE INTO reading_progress (user_id, scripture_id, passage_id, updated_at)
      SELECT h.user_id, h.scripture_id, h.passage_id, h.viewed_at FROM reading_history h
      JOIN users u ON u.id = h.user_id JOIN passages p ON p.id = h.passage_id AND p.scripture_id = h.scripture_id
      WHERE h.id = (SELECT h2.id FROM reading_history h2 JOIN passages p2 ON p2.id = h2.passage_id AND p2.scripture_id = h2.scripture_id
        WHERE h2.user_id = h.user_id AND h2.scripture_id = h.scripture_id ORDER BY h2.viewed_at DESC, h2.id DESC LIMIT 1)`);
  },
};

type Note = {
  id: number; note: string; excerpt: string; createdAt: string; updatedAt: string;
  scriptureSlug: string; scriptureTitle: string; passageSlug: string; passageTitle: string;
};

function ownNotes(userId: number): Note[] {
  return db.prepare(`SELECT n.id,n.note,n.excerpt,n.created_at AS createdAt,COALESCE(n.updated_at,n.created_at) AS updatedAt,
    s.slug AS scriptureSlug,s.title AS scriptureTitle,p.slug AS passageSlug,p.title AS passageTitle
    FROM notes n JOIN scriptures s ON s.id=n.scripture_id JOIN passages p ON p.id=n.passage_id
    WHERE n.user_id=? ORDER BY n.created_at DESC,n.id DESC`).all(userId) as Note[];
}

function escapeMarkdown(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replace(/([\\`*_{}[\]()#+.!|~-])/g, '\\$1');
}

export function registerPersonal(app: Express) {
  app.get('/api/progress/latest', requireUser, (_req, res) => {
    const progress = db.prepare(`SELECT s.slug AS scriptureSlug,s.title AS scriptureTitle,p.slug AS passageSlug,
      p.title AS passageTitle,r.updated_at AS updatedAt FROM reading_progress r
      JOIN scriptures s ON s.id=r.scripture_id JOIN passages p ON p.id=r.passage_id AND p.scripture_id=r.scripture_id
      WHERE r.user_id=? AND s.publish_status='published' ORDER BY r.updated_at DESC,r.scripture_id DESC LIMIT 1`)
      .get(res.locals.user.id);
    res.json(progress ?? null);
  });

  app.put('/api/progress', requireUser, (req, res) => {
    const scriptureSlug = slugField(req.body.scriptureSlug);
    const passageSlug = slugField(req.body.passageSlug);
    const target = db.prepare(`SELECT s.id AS scriptureId,p.id AS passageId FROM scriptures s
      JOIN passages p ON p.scripture_id=s.id WHERE s.slug=? AND p.slug=? AND s.publish_status='published'`)
      .get(scriptureSlug, passageSlug) as { scriptureId: number; passageId: number } | undefined;
    if (!target) throw new InputError('经典或阅读段落不存在，或内容暂未公开。', 404);
    const userId = res.locals.user.id;
    const updatedAt = new Date().toISOString();
    db.prepare(`INSERT INTO reading_progress (user_id,scripture_id,passage_id,updated_at) VALUES (?,?,?,?)
      ON CONFLICT(user_id,scripture_id) DO UPDATE SET passage_id=excluded.passage_id,updated_at=excluded.updated_at
      WHERE reading_progress.user_id=?`).run(userId, target.scriptureId, target.passageId, updatedAt, userId);
    res.json({ ok: true, updatedAt });
  });

  app.get('/api/notes', requireUser, (_req, res) => res.json(ownNotes(res.locals.user.id)));
  app.post('/api/notes', requireUser, (req, res) => {
    const target = db.prepare(`SELECT s.id AS scriptureId,p.id AS passageId,p.original_text AS excerpt
      FROM scriptures s JOIN passages p ON p.scripture_id=s.id WHERE s.slug=? AND p.slug=? AND s.publish_status='published'`)
      .get(slugField(req.body.scriptureSlug), slugField(req.body.passageSlug)) as { scriptureId: number; passageId: number; excerpt: string } | undefined;
    if (!target) throw new InputError('摘录段落不存在或暂未公开。', 404);
    const result = db.prepare('INSERT INTO notes (user_id,scripture_id,passage_id,note,excerpt,updated_at) VALUES (?,?,?,?,?,?)')
      .run(res.locals.user.id, target.scriptureId, target.passageId, textField(req.body.note, '摘录心得', 10000, true), target.excerpt, new Date().toISOString());
    res.json({ ok: true, id: Number(result.lastInsertRowid) });
  });
  app.get('/api/notes/export', requireUser, (req, res) => {
    const format = req.query.format ?? 'md';
    if (format !== 'md' && format !== 'json') throw new InputError('导出格式仅支持 md 或 json。');
    const notes = ownNotes(res.locals.user.id);
    res.setHeader('Content-Disposition', `attachment; filename="fanjin-notes-${new Date().toISOString().slice(0, 10)}.${format}"`);
    if (format === 'json') { res.type('application/json').send(JSON.stringify(notes, null, 2)); return; }
    const markdown = ['# 梵烬 · 私人摘录与心得', '', `导出时间：${new Date().toISOString()}`, '',
      '原文引用为保存摘录时的快照。后续经典修订不会改写这份记录。', '',
      ...notes.flatMap((note) => [
        `## ${escapeMarkdown(note.scriptureTitle)} · ${escapeMarkdown(note.passageTitle)}`, '',
        `记录时间：${escapeMarkdown(note.createdAt)}`, '',
        ...escapeMarkdown(note.excerpt).split(/\r?\n/).map((line) => `> ${line}`), '',
        escapeMarkdown(note.note), '',
        `[返回原段](/reader/${encodeURIComponent(note.scriptureSlug)}?passage=${encodeURIComponent(note.passageSlug)})`, '', '---', '',
      ]),
    ].join('\n');
    res.type('text/markdown; charset=utf-8').send(markdown);
  });
  app.put('/api/notes/:id', requireUser, (req, res) => {
    if (typeof req.body.note !== 'string') throw new InputError('请提供心得文本；清空时请提交空字符串。');
    const result = db.prepare('UPDATE notes SET note=?,updated_at=? WHERE id=? AND user_id=?')
      .run(textField(req.body.note, '摘录心得', 10000, true), new Date().toISOString(), positiveId(req.params.id), res.locals.user.id);
    if (!result.changes) throw new InputError('摘录不存在。', 404);
    res.json({ ok: true });
  });
  app.delete('/api/notes/:id', requireUser, (req, res) => {
    const result = db.prepare('DELETE FROM notes WHERE id=? AND user_id=?').run(positiveId(req.params.id), res.locals.user.id);
    if (!result.changes) throw new InputError('摘录不存在。', 404);
    res.json({ ok: true });
  });

  app.post('/api/corrections', requireUser, rateLimit(20, 60 * 60_000), (req, res) => {
    const target = db.prepare(`SELECT s.id AS scriptureId,p.id AS passageId,p.original_text AS excerpt
      FROM scriptures s JOIN passages p ON p.scripture_id=s.id WHERE s.slug=? AND p.slug=? AND s.publish_status='published'`)
      .get(slugField(req.body.scriptureSlug), slugField(req.body.passageSlug)) as { scriptureId: number; passageId: number; excerpt: string } | undefined;
    if (!target) throw new InputError('反馈段落不存在或暂未公开。', 404);
    const result = db.prepare('INSERT INTO correction_reports (user_id,scripture_id,passage_id,message,excerpt) VALUES (?,?,?,?,?)')
      .run(res.locals.user.id, target.scriptureId, target.passageId, textField(req.body.message, '勘误说明', 4000), target.excerpt);
    res.json({ ok: true, id: Number(result.lastInsertRowid) });
  });

  app.get('/api/admin/corrections', requireAdmin, (req, res) => {
    const status = req.query.status;
    if (status !== undefined && (typeof status !== 'string' || !['open', 'resolved', 'rejected'].includes(status))) throw new InputError('勘误状态不正确。');
    const page = req.query.page === undefined ? 1 : positiveId(req.query.page);
    if (page > 10000) throw new InputError('页码超出范围。');
    const params = status === undefined ? [] : [status];
    const where = status === undefined ? '' : 'WHERE r.status=?';
    const total = (db.prepare(`SELECT COUNT(*) AS count FROM correction_reports r ${where}`).get(...params) as { count: number }).count;
    const items = db.prepare(`SELECT r.id,r.message,r.excerpt,r.status,r.response,r.created_at AS createdAt,r.updated_at AS updatedAt,
      u.name AS reporterName,s.slug AS scriptureSlug,s.title AS scriptureTitle,p.slug AS passageSlug,p.title AS passageTitle
      FROM correction_reports r JOIN users u ON u.id=r.user_id JOIN scriptures s ON s.id=r.scripture_id JOIN passages p ON p.id=r.passage_id
      ${where} ORDER BY r.id DESC LIMIT 30 OFFSET ?`).all(...params, (page - 1) * 30);
    res.json({ items, total, page, pageSize: 30 });
  });
  app.patch('/api/admin/corrections/:id', requireAdmin, (req, res) => {
    if (!['open', 'resolved', 'rejected'].includes(req.body.status)) throw new InputError('请选择有效勘误状态。');
    const result = db.prepare('UPDATE correction_reports SET status=?,response=?,resolved_by=?,updated_at=? WHERE id=?')
      .run(req.body.status, textField(req.body.response, '处理说明', 4000, true), req.body.status === 'open' ? null : res.locals.user.id, new Date().toISOString(), positiveId(req.params.id));
    if (!result.changes) throw new InputError('勘误记录不存在。', 404);
    res.json({ ok: true });
  });
}
