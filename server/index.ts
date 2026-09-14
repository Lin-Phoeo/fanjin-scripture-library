import cors from 'cors';
import express from 'express';
import { createSession, db, hashPassword, initializeDatabase, verifyPassword } from './db.ts';

initializeDatabase();

const app = express();
const PORT = 3001;

app.use(
  cors({
    origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
    credentials: true,
  }),
);
app.use(express.json());

type SessionUser = {
  id: number;
  name: string;
  role: string;
};

function getUserByToken(token: string | undefined): SessionUser | null {
  if (!token) {
    return null;
  }

  const row = db
    .prepare(
      `SELECT users.id, users.name, users.role
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`,
    )
    .get(token) as SessionUser | undefined;

  return row ?? null;
}

function getBearerToken(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }

  return header.slice('Bearer '.length);
}

function requireUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getBearerToken(req.headers.authorization);
  const user = getUserByToken(token);
  if (!user) {
    res.status(401).json({ message: '请先登录。' });
    return;
  }

  res.locals.user = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  requireUser(req, res, () => {
    const user = res.locals.user as SessionUser;
    if (user.role !== 'admin' && user.role !== 'reviewer') {
      res.status(403).json({ message: '当前账号没有后台权限。' });
      return;
    }

    next();
  });
}

function enqueueReview(title: string, type: string, submitter: string, targetKind?: string, targetSlug?: string) {
  db.prepare(
    'INSERT INTO review_queue (title, type, submitter, status, target_kind, target_slug) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(title, type, submitter, '待审核', targetKind ?? null, targetSlug ?? null);
}

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
    passageCount: (db.prepare('SELECT COUNT(*) as count FROM passages').get() as { count: number }).count,
    topicCount: (db.prepare('SELECT COUNT(*) as count FROM topics').get() as { count: number }).count,
    discussionCount: (db.prepare('SELECT COUNT(*) as count FROM discussions').get() as { count: number }).count,
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

app.get('/api/scriptures', (req, res) => {
  const query = String(req.query.q ?? '').trim();
  const category = String(req.query.category ?? '').trim();

  let sql = `
    SELECT scriptures.id, scriptures.slug, scriptures.title, scriptures.dynasty, scriptures.translator,
      scriptures.role, scriptures.overlay, scriptures.summary, scriptures.publish_status as publishStatus,
      categories.slug as categorySlug, categories.name as categoryName
    FROM scriptures
    JOIN categories ON categories.id = scriptures.category_id
    WHERE scriptures.publish_status = 'published'
  `;
  const params: unknown[] = [];

  if (query) {
    sql += `
      AND (
        scriptures.title LIKE ?
        OR scriptures.role LIKE ?
        OR scriptures.overlay LIKE ?
        OR scriptures.summary LIKE ?
        OR EXISTS (
          SELECT 1 FROM passages
          WHERE passages.scripture_id = scriptures.id
            AND (
              passages.title LIKE ?
              OR passages.original_text LIKE ?
              OR passages.plain_text LIKE ?
              OR passages.commentary_text LIKE ?
            )
        )
      )
    `;
    const like = `%${query}%`;
    params.push(like, like, like, like, like, like, like, like);
  }

  if (category) {
    sql += ' AND categories.slug = ?';
    params.push(category);
  }

  sql += ' ORDER BY scriptures.id ASC';
  const items = db.prepare(sql).all(...params);
  res.json(items);
});

app.get('/api/scriptures/:slug', (req, res) => {
  const scripture = db
    .prepare(
      `SELECT scriptures.id, scriptures.slug, scriptures.title, scriptures.dynasty, scriptures.translator,
        scriptures.role, scriptures.overlay, scriptures.summary, scriptures.publish_status as publishStatus,
        categories.slug as categorySlug, categories.name as categoryName
       FROM scriptures
       JOIN categories ON categories.id = scriptures.category_id
       WHERE scriptures.slug = ? AND scriptures.publish_status = 'published'`,
    )
    .get(req.params.slug) as Record<string, unknown> | undefined;

  if (!scripture) {
    res.status(404).json({ message: '未找到对应经典。' });
    return;
  }

  const passages = db
    .prepare(
      `SELECT id, slug, title, order_index as orderIndex, original_text as originalText,
        plain_text as plainText, commentary_text as commentaryText, audio_url as audioUrl
       FROM passages
       WHERE scripture_id = ?
       ORDER BY order_index ASC`,
    )
    .all(scripture.id);

  res.json({
    ...scripture,
    passages,
  });
});

app.get('/api/topics', (_req, res) => {
  const topics = db
    .prepare(
      `SELECT id, slug, title, summary, goal, schedule, duration, participants
       FROM topics
       ORDER BY id ASC`,
    )
    .all() as Array<Record<string, unknown>>;

  const topicScriptures = db
    .prepare(
      `SELECT topics.slug as topicSlug, scriptures.slug as scriptureSlug, scriptures.title as scriptureTitle
       FROM topic_scriptures
       JOIN topics ON topics.id = topic_scriptures.topic_id
       JOIN scriptures ON scriptures.id = topic_scriptures.scripture_id
       WHERE scriptures.publish_status = 'published'`,
    )
    .all() as Array<{ topicSlug: string; scriptureSlug: string; scriptureTitle: string }>;

  res.json(
    topics.map((topic) => ({
      ...topic,
      scriptures: topicScriptures.filter((item) => item.topicSlug === topic.slug),
    })),
  );
});

app.get('/api/admin/topics', requireAdmin, (_req, res) => {
  const topics = db
    .prepare(
      `SELECT id, slug, title, summary, goal, schedule, duration, participants
       FROM topics
       ORDER BY id ASC`,
    )
    .all() as Array<Record<string, unknown>>;

  const topicScriptures = db
    .prepare(
      `SELECT topics.slug as topicSlug, scriptures.slug as scriptureSlug, scriptures.title as scriptureTitle
       FROM topic_scriptures
       JOIN topics ON topics.id = topic_scriptures.topic_id
       JOIN scriptures ON scriptures.id = topic_scriptures.scripture_id`,
    )
    .all() as Array<{ topicSlug: string; scriptureSlug: string; scriptureTitle: string }>;

  res.json(
    topics.map((topic) => ({
      ...topic,
      scriptures: topicScriptures.filter((item) => item.topicSlug === topic.slug),
    })),
  );
});

app.post('/api/admin/topics', requireAdmin, (req, res) => {
  const slug = String(req.body.slug ?? '').trim();
  const title = String(req.body.title ?? '').trim();
  const summary = String(req.body.summary ?? '').trim();
  const goal = String(req.body.goal ?? '').trim();
  const schedule = String(req.body.schedule ?? '').trim();
  const duration = String(req.body.duration ?? '').trim();
  const participants = Number(req.body.participants ?? 0);
  const scriptureSlugs = Array.isArray(req.body.scriptureSlugs) ? req.body.scriptureSlugs : [];

  if (!slug || !title || !summary || !goal || !schedule || !duration) {
    res.status(400).json({ message: '请完整填写专题信息。' });
    return;
  }

  const transaction = db.transaction(() => {
    const result = db
      .prepare(
        'INSERT INTO topics (slug, title, summary, goal, schedule, duration, participants) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(slug, title, summary, goal, schedule, duration, participants);

    const topicId = Number(result.lastInsertRowid);
    const insertTopicScripture = db.prepare(
      'INSERT INTO topic_scriptures (topic_id, scripture_id) VALUES (?, ?)',
    );

    scriptureSlugs.forEach((scriptureSlug) => {
      const scripture = db.prepare('SELECT id FROM scriptures WHERE slug = ?').get(scriptureSlug) as
        | { id: number }
        | undefined;
      if (scripture) {
        insertTopicScripture.run(topicId, scripture.id);
      }
    });
  });

  transaction();
  res.json({ ok: true });
});

app.delete('/api/admin/topics/:id', requireAdmin, (req, res) => {
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM topic_scriptures WHERE topic_id = ?').run(req.params.id);
    db.prepare('DELETE FROM topics WHERE id = ?').run(req.params.id);
  });

  transaction();
  res.json({ ok: true });
});

app.get('/api/activities', (_req, res) => {
  const rows = db
    .prepare(
      'SELECT id, slug, title, summary, schedule, location, format, status, created_at as createdAt FROM activities ORDER BY schedule ASC, id DESC',
    )
    .all();
  res.json(rows);
});

app.get('/api/settings', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings ORDER BY key ASC').all() as Array<{ key: string; value: string }>;
  res.json(Object.fromEntries(rows.map((item) => [item.key, item.value])));
});

app.get('/api/discussions', (req, res) => {
  const scriptureSlug = String(req.query.scripture ?? '').trim();
  const topicSlug = String(req.query.topic ?? '').trim();

  let sql = `SELECT discussions.id, discussions.title, discussions.author_name as authorName,
        discussions.body, discussions.replies_count as repliesCount, discussions.likes_count as likesCount,
        discussions.created_at as createdAt,
        scriptures.slug as scriptureSlug, scriptures.title as scriptureTitle,
        topics.slug as topicSlug, topics.title as topicTitle
       FROM discussions
       LEFT JOIN scriptures ON scriptures.id = discussions.scripture_id
       LEFT JOIN topics ON topics.id = discussions.topic_id
       WHERE (discussions.scripture_id IS NULL OR scriptures.publish_status = 'published')`;
  const params: unknown[] = [];

  if (scriptureSlug) {
    sql += ' AND scriptures.slug = ?';
    params.push(scriptureSlug);
  }

  if (topicSlug) {
    sql += ' AND topics.slug = ?';
    params.push(topicSlug);
  }

  sql += ' ORDER BY discussions.id DESC';

  const discussions = db
    .prepare(sql)
    .all(...params);
  res.json(discussions);
});

app.get('/api/discussions/:id', (req, res) => {
  const discussion = db
    .prepare(
      `SELECT discussions.id, discussions.title, discussions.author_name as authorName,
        discussions.body, discussions.replies_count as repliesCount, discussions.likes_count as likesCount,
        discussions.created_at as createdAt,
        scriptures.slug as scriptureSlug, scriptures.title as scriptureTitle,
        topics.slug as topicSlug, topics.title as topicTitle
       FROM discussions
       LEFT JOIN scriptures ON scriptures.id = discussions.scripture_id
       LEFT JOIN topics ON topics.id = discussions.topic_id
       WHERE discussions.id = ?
         AND (discussions.scripture_id IS NULL OR scriptures.publish_status = 'published')`,
    )
    .get(req.params.id);

  if (!discussion) {
    res.status(404).json({ message: '未找到讨论主题。' });
    return;
  }

  const replies = db
    .prepare(
      `SELECT id, author_name as authorName, body, created_at as createdAt
       FROM discussion_replies
       WHERE discussion_id = ?
       ORDER BY id ASC`,
    )
    .all(req.params.id);

  res.json({ ...discussion, replies });
});

app.get('/api/my/discussions', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;
  const discussions = db
    .prepare(
      `SELECT discussions.id, discussions.title, discussions.author_name as authorName,
        discussions.body, discussions.replies_count as repliesCount, discussions.likes_count as likesCount,
        discussions.created_at as createdAt,
        scriptures.slug as scriptureSlug, scriptures.title as scriptureTitle,
        topics.slug as topicSlug, topics.title as topicTitle
       FROM discussions
       LEFT JOIN scriptures ON scriptures.id = discussions.scripture_id
       LEFT JOIN topics ON topics.id = discussions.topic_id
       WHERE discussions.author_name = ?
       ORDER BY discussions.id DESC`,
    )
    .all(user.name);
  res.json(discussions);
});

app.post('/api/discussions', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;
  const title = String(req.body.title ?? '').trim();
  const body = String(req.body.body ?? '').trim();
  const scriptureSlug = String(req.body.scriptureSlug ?? '').trim();
  const topicSlug = String(req.body.topicSlug ?? '').trim();

  if (!title || !body) {
    res.status(400).json({ message: '请填写主题标题与内容。' });
    return;
  }

  const scripture = scriptureSlug
    ? (db.prepare('SELECT id FROM scriptures WHERE slug = ?').get(scriptureSlug) as { id: number } | undefined)
    : undefined;
  const topic = topicSlug
    ? (db.prepare('SELECT id FROM topics WHERE slug = ?').get(topicSlug) as { id: number } | undefined)
    : undefined;

  const result = db
    .prepare(
      `INSERT INTO discussions (title, scripture_id, topic_id, author_name, body, replies_count, likes_count)
       VALUES (?, ?, ?, ?, ?, 0, 0)`,
    )
    .run(title, scripture?.id ?? null, topic?.id ?? null, user.name, body);

  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

app.post('/api/discussions/:id/replies', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;
  const body = String(req.body.body ?? '').trim();

  if (!body) {
    res.status(400).json({ message: '请填写回复内容。' });
    return;
  }

  const discussion = db.prepare('SELECT id FROM discussions WHERE id = ?').get(req.params.id) as { id: number } | undefined;
  if (!discussion) {
    res.status(404).json({ message: '未找到讨论主题。' });
    return;
  }

  const transaction = db.transaction(() => {
    db.prepare(
      'INSERT INTO discussion_replies (discussion_id, author_name, body) VALUES (?, ?, ?)',
    ).run(discussion.id, user.name, body);
    db.prepare('UPDATE discussions SET replies_count = replies_count + 1 WHERE id = ?').run(discussion.id);
  });

  transaction();
  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const password = String(req.body.password ?? '').trim();
  if (!name || !password) {
    res.status(400).json({ message: '请输入账号与密码。' });
    return;
  }

  const user = db
    .prepare('SELECT id, name, role, password_hash as passwordHash FROM users WHERE name = ?')
    .get(name) as { id: number; name: string; role: string; passwordHash: string } | undefined;

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ message: '账号或密码错误。' });
    return;
  }

  const token = createSession(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  });
});

app.post('/api/auth/register', (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const password = String(req.body.password ?? '').trim();

  if (!name || !password) {
    res.status(400).json({ message: '请输入账号与密码。' });
    return;
  }

  if (name.length < 2) {
    res.status(400).json({ message: '账号名称至少需要 2 个字符。' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: '密码至少需要 6 位。' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE name = ?').get(name) as { id: number } | undefined;
  if (existing) {
    res.status(409).json({ message: '该账号名称已存在。' });
    return;
  }

  const inserted = db
    .prepare('INSERT INTO users (name, password_hash, role) VALUES (?, ?, ?)')
    .run(name, hashPassword(password), 'user');
  const userId = Number(inserted.lastInsertRowid);

  const token = createSession(userId);
  res.json({
    token,
    user: {
      id: userId,
      name,
      role: 'user',
    },
  });
});

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
  const scripture = db.prepare('SELECT id FROM scriptures WHERE slug = ?').get(scriptureSlug) as { id: number } | undefined;

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

app.get('/api/notes', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;
  const notes = db
    .prepare(
      `SELECT notes.id, notes.note, notes.excerpt, notes.created_at as createdAt,
        scriptures.slug as scriptureSlug, scriptures.title as scriptureTitle,
        passages.slug as passageSlug, passages.title as passageTitle
       FROM notes
       JOIN scriptures ON scriptures.id = notes.scripture_id
       JOIN passages ON passages.id = notes.passage_id
       WHERE notes.user_id = ?
       ORDER BY notes.created_at DESC`,
    )
    .all(user.id);
  res.json(notes);
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

  const scripture = db.prepare('SELECT id FROM scriptures WHERE slug = ?').get(scriptureSlug) as { id: number } | undefined;
  if (!scripture) {
    res.status(404).json({ message: '未找到对应经典。' });
    return;
  }

  const passage = passageSlug
    ? (db
        .prepare('SELECT id FROM passages WHERE scripture_id = ? AND slug = ?')
        .get(scripture.id, passageSlug) as { id: number } | undefined)
    : undefined;

  db.prepare(
    'INSERT INTO reading_history (user_id, scripture_id, passage_id) VALUES (?, ?, ?)',
  ).run(user.id, scripture.id, passage?.id ?? null);

  res.json({ ok: true });
});

app.post('/api/notes', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;
  const scriptureSlug = String(req.body.scriptureSlug ?? '').trim();
  const passageSlug = String(req.body.passageSlug ?? '').trim();
  const note = String(req.body.note ?? '').trim();

  if (!scriptureSlug || !passageSlug || !note) {
    res.status(400).json({ message: '请完整填写摘录内容。' });
    return;
  }

  const target = db
    .prepare(
      `SELECT scriptures.id as scriptureId, passages.id as passageId, passages.original_text as excerpt
       FROM scriptures
       JOIN passages ON passages.scripture_id = scriptures.id
       WHERE scriptures.slug = ? AND passages.slug = ?`,
    )
    .get(scriptureSlug, passageSlug) as { scriptureId: number; passageId: number; excerpt: string } | undefined;

  if (!target) {
    res.status(404).json({ message: '未找到对应摘录段落。' });
    return;
  }

  db.prepare(
    'INSERT INTO notes (user_id, scripture_id, passage_id, note, excerpt) VALUES (?, ?, ?, ?, ?)',
  ).run(user.id, target.scriptureId, target.passageId, note, target.excerpt);

  res.json({ ok: true });
});

app.delete('/api/notes/:id', requireUser, (req, res) => {
  const user = res.locals.user as SessionUser;
  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
  const metrics = {
    userCount: (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count,
    scriptureCount: (db.prepare('SELECT COUNT(*) as count FROM scriptures').get() as { count: number }).count,
    noteCount: (db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number }).count,
    discussionCount: (db.prepare('SELECT COUNT(*) as count FROM discussions').get() as { count: number }).count,
    reviewCount: (db.prepare('SELECT COUNT(*) as count FROM review_queue').get() as { count: number }).count,
  };

  const queue = db
    .prepare(
      'SELECT id, title, type, submitter, status, created_at as createdAt FROM review_queue ORDER BY id DESC',
    )
    .all();

  const users = db
    .prepare('SELECT id, name, role, created_at as createdAt FROM users ORDER BY id ASC')
    .all();

  res.json({ metrics, queue, users });
});

app.get('/api/admin/scriptures', requireAdmin, (_req, res) => {
  const scriptures = db
    .prepare(
      `SELECT scriptures.id, scriptures.slug, scriptures.title, scriptures.dynasty, scriptures.translator,
        scriptures.role, scriptures.overlay, scriptures.summary, scriptures.publish_status as publishStatus, categories.slug as categorySlug,
        categories.name as categoryName
       FROM scriptures
       JOIN categories ON categories.id = scriptures.category_id
       ORDER BY scriptures.id ASC`,
    )
    .all();
  res.json(scriptures);
});

app.get('/api/admin/scriptures/:slug', requireAdmin, (req, res) => {
  const scripture = db
    .prepare(
      `SELECT scriptures.id, scriptures.slug, scriptures.title, scriptures.dynasty, scriptures.translator,
        scriptures.role, scriptures.overlay, scriptures.summary, scriptures.publish_status as publishStatus, categories.slug as categorySlug
       FROM scriptures
       JOIN categories ON categories.id = scriptures.category_id
       WHERE scriptures.slug = ?`,
    )
    .get(req.params.slug) as Record<string, unknown> | undefined;

  if (!scripture) {
    res.status(404).json({ message: '未找到对应经典。' });
    return;
  }

  const passages = db
    .prepare(
      `SELECT slug, title, order_index as orderIndex, original_text as originalText,
        plain_text as plainText, commentary_text as commentaryText, audio_url as audioUrl
       FROM passages WHERE scripture_id = ? ORDER BY order_index ASC`,
    )
    .all(scripture.id);

  res.json({ ...scripture, passages });
});

app.post('/api/admin/scriptures', requireAdmin, (req, res) => {
  const user = res.locals.user as SessionUser;
  const {
    title,
    slug,
    categorySlug,
    dynasty,
    translator,
    role,
    overlay,
    summary,
    passages,
  } = req.body as {
    title: string;
    slug: string;
    categorySlug: string;
    dynasty: string;
    translator: string;
    role: string;
    overlay: string;
    summary: string;
    passages: Array<{
      slug: string;
      title: string;
      originalText: string;
      plainText: string;
      commentaryText: string;
      audioUrl?: string;
    }>;
  };

  const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get(categorySlug) as { id: number } | undefined;
  if (!category) {
    res.status(400).json({ message: '经藏分类不存在。' });
    return;
  }

  if (!title || !slug || !Array.isArray(passages) || passages.length === 0) {
    res.status(400).json({ message: '请完整填写经典和段落信息。' });
    return;
  }

  const transaction = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO scriptures
          (slug, title, category_id, dynasty, translator, role, overlay, summary, publish_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(slug, title, category.id, dynasty, translator, role, overlay, summary, 'pending_review');

    const scriptureId = Number(result.lastInsertRowid);
    const insertPassage = db.prepare(
      `INSERT INTO passages
        (scripture_id, slug, title, order_index, original_text, plain_text, commentary_text, audio_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    passages.forEach((passage, index) => {
      insertPassage.run(
        scriptureId,
        passage.slug,
        passage.title,
        index + 1,
        passage.originalText,
        passage.plainText,
        passage.commentaryText,
        passage.audioUrl ?? '',
      );
    });

    enqueueReview(title, '经典录入', user.name, 'scripture', slug);
  });

  transaction();
  res.json({ ok: true, slug });
});

app.put('/api/admin/scriptures/:slug', requireAdmin, (req, res) => {
  const user = res.locals.user as SessionUser;
  const existing = db.prepare('SELECT id FROM scriptures WHERE slug = ?').get(req.params.slug) as { id: number } | undefined;
  if (!existing) {
    res.status(404).json({ message: '未找到对应经典。' });
    return;
  }

  const {
    title,
    slug,
    categorySlug,
    dynasty,
    translator,
    role,
    overlay,
    summary,
    passages,
  } = req.body as {
    title: string;
    slug: string;
    categorySlug: string;
    dynasty: string;
    translator: string;
    role: string;
    overlay: string;
    summary: string;
    passages: Array<{
      slug: string;
      title: string;
      originalText: string;
      plainText: string;
      commentaryText: string;
      audioUrl?: string;
    }>;
  };

  const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get(categorySlug) as { id: number } | undefined;
  if (!category) {
    res.status(400).json({ message: '经藏分类不存在。' });
    return;
  }

  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE scriptures
       SET slug = ?, title = ?, category_id = ?, dynasty = ?, translator = ?, role = ?, overlay = ?, summary = ?, publish_status = ?
       WHERE id = ?`,
    ).run(slug, title, category.id, dynasty, translator, role, overlay, summary, 'pending_review', existing.id);

    db.prepare('DELETE FROM notes WHERE scripture_id = ?').run(existing.id);
    db.prepare('DELETE FROM reading_history WHERE scripture_id = ?').run(existing.id);
    db.prepare('DELETE FROM passages WHERE scripture_id = ?').run(existing.id);
    const insertPassage = db.prepare(
      `INSERT INTO passages
        (scripture_id, slug, title, order_index, original_text, plain_text, commentary_text, audio_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    passages.forEach((passage, index) => {
      insertPassage.run(
        existing.id,
        passage.slug,
        passage.title,
        index + 1,
        passage.originalText,
        passage.plainText,
        passage.commentaryText,
        passage.audioUrl ?? '',
      );
    });

    enqueueReview(title, '经典更新', user.name, 'scripture', slug);
  });

  transaction();
  res.json({ ok: true, slug });
});

app.get('/api/admin/review', requireAdmin, (_req, res) => {
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

app.patch('/api/admin/review/:id', requireAdmin, (req, res) => {
  const status = String(req.body.status ?? '').trim();
  if (!status) {
    res.status(400).json({ message: '请提供审核状态。' });
    return;
  }

  const item = db
    .prepare('SELECT target_kind as targetKind, target_slug as targetSlug FROM review_queue WHERE id = ?')
    .get(req.params.id) as { targetKind: string | null; targetSlug: string | null } | undefined;

  if (!item) {
    res.status(404).json({ message: '未找到审核记录。' });
    return;
  }

  const transaction = db.transaction(() => {
    db.prepare('UPDATE review_queue SET status = ? WHERE id = ?').run(status, req.params.id);

    if (item.targetKind === 'scripture' && item.targetSlug) {
      const publishStatus =
        status === '已通过' ? 'published' : status === '待修改' ? 'changes_requested' : 'pending_review';
      db.prepare('UPDATE scriptures SET publish_status = ? WHERE slug = ?').run(publishStatus, item.targetSlug);
    }
  });

  transaction();
  res.json({ ok: true });
});

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const users = db
    .prepare('SELECT id, name, role, created_at as createdAt FROM users ORDER BY id ASC')
    .all();
  res.json(users);
});

app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
  const role = String(req.body.role ?? '').trim();
  if (!role) {
    res.status(400).json({ message: '请提供角色。' });
    return;
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings ORDER BY key ASC').all() as Array<{ key: string; value: string }>;
  res.json(Object.fromEntries(rows.map((item) => [item.key, item.value])));
});

app.get('/api/admin/announcements', requireAdmin, (_req, res) => {
  const rows = db
    .prepare('SELECT id, title, detail, created_at as createdAt FROM announcements ORDER BY id DESC')
    .all();
  res.json(rows);
});

app.get('/api/admin/activities', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      'SELECT id, slug, title, summary, schedule, location, format, status, created_at as createdAt FROM activities ORDER BY schedule ASC, id DESC',
    )
    .all();
  res.json(rows);
});

app.post('/api/admin/activities', requireAdmin, (req, res) => {
  const slug = String(req.body.slug ?? '').trim();
  const title = String(req.body.title ?? '').trim();
  const summary = String(req.body.summary ?? '').trim();
  const schedule = String(req.body.schedule ?? '').trim();
  const location = String(req.body.location ?? '').trim();
  const format = String(req.body.format ?? '').trim();
  const status = String(req.body.status ?? '').trim();

  if (!slug || !title || !summary || !schedule || !location || !format || !status) {
    res.status(400).json({ message: '请完整填写活动信息。' });
    return;
  }

  db.prepare(
    'INSERT INTO activities (slug, title, summary, schedule, location, format, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(slug, title, summary, schedule, location, format, status);
  res.json({ ok: true });
});

app.delete('/api/admin/activities/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/announcements', requireAdmin, (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const detail = String(req.body.detail ?? '').trim();

  if (!title || !detail) {
    res.status(400).json({ message: '请完整填写公告标题与内容。' });
    return;
  }

  const result = db.prepare('INSERT INTO announcements (title, detail) VALUES (?, ?)').run(title, detail);
  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

app.delete('/api/admin/announcements/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const settings = req.body as Record<string, string>;
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

app.listen(PORT, () => {
  console.log(`梵烬网 API 已启动: http://127.0.0.1:${PORT}`);
});
