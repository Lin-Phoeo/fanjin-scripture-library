import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';

if (process.env.FANJIN_TEST_ISOLATED !== '1') throw new Error('Run npm test; direct tests against an existing server are forbidden.');
const BASE = process.env.TEST_API_BASE;
const db = new Database(process.env.FANJIN_DB_PATH);
let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  PASS ${name}`); }
  catch (error) { failed++; console.error(`  FAIL ${name}: ${error.message}`); }
}
async function request(method, path, { token, cookie, body, headers = {} } = {}) {
  const response = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data, headers: response.headers };
}
async function api(method, path, options, status = 200) {
  const response = await request(method, path, options);
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(response.data).slice(0, 300)}`);
  return response.data;
}
const login = (name, password) => api('POST', '/api/auth/login', { body: { name, password } });
const accountA = { name: '测试甲', password: 'test-password-a' };
const accountB = { name: '测试乙', password: 'test-password-b' };
let admin, reviewer, a, b, noteId, planId;
const custom = {
  slug: 'test-scripture', title: '验收用经典', categorySlug: 'banruo', dynasty: '测试', translator: '测试录入',
  role: '个人自修', overlay: '', summary: '隔离测试内容',
  edition: '自动化测试底本', sourceName: '隔离测试夹具（非上线内容）', sourceUrl: 'https://example.com/test-fixture',
  license: '仅为自动化验证人工编写的测试文本', licenseUrl: 'https://example.com/test-fixture-license', sourceVerified: true, isExcerpt: true,
  passages: [
    { slug: 'part-one', title: '第一章', originalText: '般若智慧独有词。學而時習之。', plainText: '', commentaryText: '', modernGuide: '现代释义独有词', classicalCommentary: '校注独有词', commentarySource: '测试作者《测试古注》第一章（仅隔离夹具）', audioUrl: '' },
    { slug: 'part-two', title: '第二章', originalText: '第二章原文。', plainText: '', commentaryText: '', audioUrl: '' },
  ],
};
async function review(slug, status = '已通过') {
  const queue = await api('GET', '/api/admin/review', { token: admin.token });
  const item = queue.find((item) => item.targetSlug === slug);
  assert.ok(item);
  await api('PATCH', `/api/admin/review/${item.id}`, { token: admin.token, body: { status } });
  return item.id;
}

await test('health and safe headers', async () => {
  const response = await request('GET', '/api/health');
  assert.equal(response.status, 200); assert.equal(response.data.ok, true);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
});
await test('login and registration assign server-controlled roles', async () => {
  admin = await login('法音法师', 'fayin123'); reviewer = await login('慧安居士', 'huian123');
  a = await api('POST', '/api/auth/register', { body: { ...accountA, role: 'admin' } });
  b = await api('POST', '/api/auth/register', { body: accountB });
  assert.equal(admin.user.role, 'admin'); assert.equal(reviewer.user.role, 'reviewer');
  assert.equal(a.user.role, 'user'); assert.ok(a.recoveryCode); assert.ok(b.recoveryCode);
});
await test('registration rejects duplicates and malformed credentials', async () => {
  await api('POST', '/api/auth/register', { body: accountA }, 409);
  await api('POST', '/api/auth/register', { body: { name: '短', password: 'password-123' } }, 400);
  await api('POST', '/api/auth/register', { body: { name: '太短密码', password: '123' } }, 400);
  await api('POST', '/api/auth/login', { body: { ...accountA, password: 'wrong' } }, 401);
});
await test('personal bookshelf and bookmarks start empty and require authentication', async () => {
  await api('GET', '/api/me/library', {}, 401);
  await api('GET', '/api/bookmarks', {}, 401);
  assert.deepEqual(await api('GET', '/api/me/library', { token: a.token }), { items: [] });
  assert.deepEqual(await api('GET', '/api/me/library', { token: b.token }), { items: [] });
  assert.deepEqual(await api('GET', '/api/bookmarks', { token: a.token }), []);
});
await test('reading preferences start empty and persist only for the authenticated account', async () => {
  await api('GET', '/api/me/preferences', {}, 401);
  assert.equal(await api('GET', '/api/me/preferences', { token: a.token }), null);
  assert.equal(await api('GET', '/api/me/preferences', { token: b.token }), null);
  const preferences = { interests: ['佛家', '道家'], minutes: 15, intention: 'quiet' };
  assert.deepEqual(await api('PUT', '/api/me/preferences', { token: a.token, body: { ...preferences, userId: b.user.id } }), preferences);
  assert.deepEqual(await api('GET', '/api/me/preferences', { token: a.token }), preferences);
  assert.equal(await api('GET', '/api/me/preferences', { token: b.token }), null);
});
await test('reading preferences reject invalid values without replacing prior choices', async () => {
  const original = await api('GET', '/api/me/preferences', { token: a.token });
  for (const body of [
    { ...original, interests: ['未定义学派'] },
    { ...original, interests: '佛家' },
    { ...original, interests: ['佛家', '道家', '儒家', '诸子', '佛家'] },
    { ...original, minutes: 20 },
    { ...original, minutes: '15' },
    { ...original, intention: 'unknown' },
  ]) await api('PUT', '/api/me/preferences', { token: a.token, body }, 400);
  assert.deepEqual(await api('GET', '/api/me/preferences', { token: a.token }), original);
});
await test('reading preference deletion and updates remain isolated between two users', async () => {
  const aPreferences = await api('GET', '/api/me/preferences', { token: a.token });
  const bPreferences = { interests: ['儒家', '诸子'], minutes: 30, intention: 'reflect' };
  assert.deepEqual(await api('PUT', '/api/me/preferences', { token: b.token, body: { ...bPreferences, interests: ['儒家', '儒家', '诸子'], userId: a.user.id } }), bPreferences);
  await api('DELETE', `/api/me/preferences?userId=${a.user.id}`, { token: b.token, body: { userId: a.user.id } });
  assert.equal(await api('GET', '/api/me/preferences', { token: b.token }), null);
  assert.deepEqual(await api('GET', '/api/me/preferences', { token: a.token }), aPreferences);
  await api('DELETE', '/api/me/preferences', { token: a.token });
  assert.equal(await api('GET', '/api/me/preferences', { token: a.token }), null);
});
await test('HttpOnly cookie authenticates and session token is hashed at rest', async () => {
  const response = await request('POST', '/api/auth/login', { body: accountA });
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=Lax/i);
  assert.equal((await api('GET', '/api/me', { cookie: cookie.split(';')[0] })).id, a.user.id);
  assert.equal(db.prepare('SELECT token FROM sessions WHERE token=?').get(response.data.token), undefined);
  const stored = db.prepare('SELECT expires_at FROM sessions WHERE token=?').get(createHash('sha256').update(response.data.token).digest('hex'));
  assert.ok(stored.expires_at > Date.now());
});
await test('expired and absent sessions are rejected', async () => {
  const expired = await login(accountA.name, accountA.password);
  db.prepare('UPDATE sessions SET expires_at=0 WHERE token=?').run(createHash('sha256').update(expired.token).digest('hex'));
  await api('GET', '/api/me', { token: expired.token }, 401);
  await api('GET', '/api/me', {}, 401); await api('GET', '/api/me', { token: 'fake' }, 401);
});
await test('cross-origin writes and non-object JSON are rejected', async () => {
  await api('POST', '/api/auth/login', { body: accountA, headers: { Origin: 'https://untrusted.invalid' } }, 403);
  await api('POST', '/api/auth/login', { body: [] }, 400);
  await api('POST', '/api/auth/login', { body: null }, 400);
});
await test('all administration is admin-only including former reviewer', async () => {
  for (const path of ['/api/admin/dashboard', '/api/admin/scriptures', '/api/admin/users', '/api/admin/settings', '/api/admin/corrections']) {
    await api('GET', path, { token: a.token }, 403);
    await api('GET', path, { token: reviewer.token }, 403);
  }
  await api('PATCH', `/api/admin/users/${a.user.id}`, { token: reviewer.token, body: { role: 'admin' } }, 403);
  await api('GET', '/api/admin/dashboard', {}, 401);
});
await test('legacy community routes explicitly retired', async () => {
  for (const path of ['/api/topics', '/api/activities', '/api/discussions', '/api/my/discussions']) {
    await api('GET', path, { token: a.token }, 410);
  }
  await api('POST', '/api/discussions', { token: a.token, body: { title: '旧讨论', body: '不可再创建' } }, 410);
});
await test('library category filtering and missing books', async () => {
  const categories = await api('GET', '/api/categories'); assert.ok(categories.length);
  const books = await api('GET', '/api/scriptures'); assert.ok(books.length);
  for (const category of categories) {
    const selected = await api('GET', `/api/scriptures?category=${category.slug}`);
    assert.ok(selected.every((book) => book.categorySlug === category.slug));
  }
  const scripture = await api('GET', `/api/scriptures/${books[0].slug}`);
  assert.ok(scripture.passages.length);
  await api('GET', '/api/scriptures/missing-book', {}, 404);
});
await test('draft creation is isolated from public lists, search and personal writes', async () => {
  await api('POST', '/api/admin/scriptures', { token: admin.token, body: custom });
  await api('GET', `/api/scriptures/${custom.slug}`, {}, 404);
  assert.ok(!(await api('GET', '/api/scriptures')).some((book) => book.slug === custom.slug));
  assert.equal((await api('GET', `/api/search?q=${encodeURIComponent('独有词')}`)).total, 0);
  await api('POST', '/api/favorites', { token: a.token, body: { scriptureSlug: custom.slug } }, 404);
  await api('PUT', '/api/progress', { token: a.token, body: { scriptureSlug: custom.slug, passageSlug: 'part-one' } }, 404);
  await api('POST', '/api/me/study/plans', { token: a.token, body: { scriptureSlug: custom.slug } }, 404);
});
await test('invalid content, duplicate slugs and unsafe audio fail', async () => {
  await api('POST', '/api/admin/scriptures', { token: admin.token, body: custom }, 409);
  await api('POST', '/api/admin/scriptures', { token: admin.token, body: { ...custom, slug: 'bad-book', passages: [] } }, 400);
  await api('POST', '/api/admin/scriptures', { token: admin.token, body: { ...custom, slug: 'bad-book', passages: [custom.passages[0], custom.passages[0]] } }, 400);
  await api('POST', '/api/admin/scriptures', { token: admin.token, body: { ...custom, slug: 'bad-book', passages: [{ ...custom.passages[0], audioUrl: 'javascript:alert(1)' }] } }, 400);
});
await test('review publishes content; repeat review cannot replay', async () => {
  const id = await review(custom.slug);
  await api('GET', `/api/scriptures/${custom.slug}`);
  await api('PATCH', `/api/admin/review/${id}`, { token: admin.token, body: { status: '已通过' } }, 409);
});
await test('publication requires complete provenance and checked permission metadata', async () => {
  const input = { ...custom, slug: 'unverified-source', sourceVerified: false, sourceUrl: '' };
  await api('POST', '/api/admin/scriptures', { token: admin.token, body: input });
  const item = (await api('GET', '/api/admin/review', { token: admin.token })).find((row) => row.targetSlug === input.slug);
  await api('PATCH', `/api/admin/review/${item.id}`, { token: admin.token, body: { status: '已通过' } }, 409);
  await api('GET', `/api/scriptures/${input.slug}`, {}, 404);
});
await test('search locates passages, scopes fields and handles literal wildcards', async () => {
  const result = await api('GET', `/api/search?q=${encodeURIComponent('般若智慧独有词')}&scope=original`);
  assert.ok(result.items.some((hit) => hit.scriptureSlug === custom.slug && hit.passageSlug === 'part-one'));
  assert.equal((await api('GET', `/api/search?q=${encodeURIComponent('现代释义独有词')}&scope=original`)).total, 0);
  assert.ok((await api('GET', `/api/search?q=${encodeURIComponent('现代释义独有词')}&scope=plain`)).total > 0);
  for (const term of ['學而時習之', '学而时习之']) assert.ok((await api('GET', `/api/search?q=${encodeURIComponent(term)}&scope=original`)).items.some((hit) => hit.scriptureSlug === custom.slug));
  assert.equal((await api('GET', '/api/search?q=%25')).total, 0);
  await api('GET', '/api/search?q=test&scope=unsafe', {}, 400);
  await api('GET', '/api/search?q=test&page=-1', {}, 400);
});
await test('favorites are idempotent and private', async () => {
  for (let i = 0; i < 2; i++) await api('POST', '/api/favorites', { token: a.token, body: { scriptureSlug: custom.slug } });
  assert.equal((await api('GET', '/api/favorites', { token: a.token })).filter((book) => book.slug === custom.slug).length, 1);
  assert.equal((await api('GET', '/api/favorites', { token: b.token })).length, 0);
  await api('DELETE', `/api/favorites/${custom.slug}`, { token: b.token });
  assert.equal((await api('GET', '/api/favorites', { token: a.token })).length, 1);
});
await test('reading progress is private, validates passage and persists upsert', async () => {
  await api('PUT', '/api/progress', { token: a.token, body: { scriptureSlug: custom.slug, passageSlug: 'part-one', userId: b.user.id } });
  assert.equal((await api('GET', '/api/progress/latest', { token: a.token })).passageSlug, 'part-one');
  assert.equal(await api('GET', '/api/progress/latest', { token: b.token }), null);
  await api('PUT', '/api/progress', { token: a.token, body: { scriptureSlug: custom.slug, passageSlug: 'part-two' } });
  assert.equal((await api('GET', '/api/progress/latest', { token: a.token })).passageSlug, 'part-two');
  await api('PUT', '/api/progress', { token: a.token, body: { scriptureSlug: custom.slug, passageSlug: 'missing' } }, 404);
});
await test('note snapshot and private update/delete/export boundaries', async () => {
  const note = await api('POST', '/api/notes', { token: a.token, body: { scriptureSlug: custom.slug, passageSlug: 'part-one', note: '', excerpt: 'forged', userId: b.user.id } });
  noteId = note.id;
  const own = await api('GET', '/api/notes', { token: a.token });
  assert.equal(own[0].excerpt, custom.passages[0].originalText); assert.equal(own[0].note, '');
  await api('PUT', `/api/notes/${noteId}`, { token: b.token, body: { note: '侵入' } }, 404);
  await api('DELETE', `/api/notes/${noteId}`, { token: b.token }, 404);
  await api('PUT', `/api/notes/${noteId}`, { token: a.token, body: { note: '私人心得', excerpt: 'forged' } });
  const exported = await api('GET', '/api/notes/export?format=json', { token: a.token });
  assert.equal(exported[0].note, '私人心得'); assert.equal(exported[0].excerpt, custom.passages[0].originalText);
  assert.deepEqual(await api('GET', '/api/notes/export?format=json', { token: b.token }), []);
  const markdown = await request('GET', '/api/notes/export?format=md', { token: a.token });
  assert.match(markdown.headers.get('content-disposition'), /attachment/); assert.match(markdown.data, /私人心得/);
});
await test('content updates preserve passage IDs and immutable note snapshots', async () => {
  const before = await api('GET', `/api/scriptures/${custom.slug}`);
  await api('PUT', `/api/admin/scriptures/${custom.slug}`, { token: admin.token, body: { ...custom, passages: [{ ...custom.passages[0], originalText: '修订后的般若智慧原文。' }, custom.passages[1]] } });
  const after = await api('GET', `/api/admin/scriptures/${custom.slug}`, { token: admin.token });
  assert.equal(after.passages[0].id, before.passages[0].id);
  assert.equal((await api('GET', '/api/notes', { token: a.token }))[0].excerpt, custom.passages[0].originalText);
  await api('GET', `/api/scriptures/${custom.slug}`, {}, 404);
  await review(custom.slug);
});
await test('removing referenced passages is rejected without losing data', async () => {
  await api('PUT', `/api/admin/scriptures/${custom.slug}`, { token: admin.token, body: { ...custom, passages: [custom.passages[1]] } }, 409);
  assert.equal((await api('GET', `/api/scriptures/${custom.slug}`)).passages.length, 2);
  assert.equal((await api('GET', '/api/notes', { token: a.token }))[0].id, noteId);
});
await test('stale review cannot publish a newer edit', async () => {
  await api('PUT', `/api/admin/scriptures/${custom.slug}`, { token: admin.token, body: custom });
  const old = (await api('GET', '/api/admin/review', { token: admin.token })).find((item) => item.targetSlug === custom.slug);
  await api('PUT', `/api/admin/scriptures/${custom.slug}`, { token: admin.token, body: { ...custom, summary: '再次编辑' } });
  await api('PATCH', `/api/admin/review/${old.id}`, { token: admin.token, body: { status: '已通过' } }, 409);
  await api('GET', `/api/scriptures/${custom.slug}`, {}, 404);
  await review(custom.slug);
});
await test('private study plans reject duplicates and foreign updates', async () => {
  const plan = await api('POST', '/api/me/study/plans', { token: a.token, body: { scriptureSlug: custom.slug, dailyMinutes: 15 } }); planId = plan.id;
  await api('POST', '/api/me/study/plans', { token: a.token, body: { scriptureSlug: custom.slug } }, 409);
  await api('PATCH', `/api/me/study/plans/${planId}`, { token: b.token, body: { status: 'paused' } }, 404);
  await api('DELETE', `/api/me/study/plans/${planId}`, { token: b.token }, 404);
  assert.equal((await api('GET', '/api/me/study', { token: b.token })).plans.length, 0);
});
await test('bookshelf aggregates real favorites, progress, notes, plans and bookmarks privately', async () => {
  const body = { scriptureSlug: custom.slug, passageSlug: 'part-one' };
  const first = await api('POST', '/api/bookmarks', { token: a.token, body: { ...body, userId: b.user.id } });
  const duplicate = await api('POST', '/api/bookmarks', { token: a.token, body });
  assert.equal(first.id, duplicate.id);
  const own = await api('GET', '/api/bookmarks?scriptureSlug=test-scripture', { token: a.token });
  assert.equal(own.length, 1); assert.equal(own[0].id, first.id);
  assert.equal(own[0].passageSlug, 'part-one');
  assert.deepEqual(await api('GET', '/api/bookmarks', { token: b.token }), []);
  assert.deepEqual(await api('GET', '/api/bookmarks?scriptureSlug=another-book', { token: a.token }), []);
  await api('DELETE', `/api/bookmarks/${first.id}`, { token: b.token }, 404);
  const item = (await api('GET', '/api/me/library', { token: a.token })).items.find((book) => book.slug === custom.slug);
  assert.ok(item); assert.equal(item.favorite, true); assert.equal(item.passageSlug, 'part-two');
  assert.equal(item.notesCount, 1); assert.equal(item.bookmarksCount, 1); assert.equal(item.planStatus, 'active');
  assert.deepEqual(await api('GET', '/api/me/library', { token: b.token }), { items: [] });
});
await test('a bookmark alone keeps its book on the shelf and protects its passage from deletion', async () => {
  const input = { ...custom, slug: 'bookmark-only-book' };
  await api('POST', '/api/admin/scriptures', { token: admin.token, body: input }); await review(input.slug);
  const bookmark = await api('POST', '/api/bookmarks', { token: a.token, body: { scriptureSlug: input.slug, passageSlug: 'part-one' } });
  const item = (await api('GET', '/api/me/library', { token: a.token })).items.find((book) => book.slug === input.slug);
  assert.ok(item); assert.equal(item.favorite, false); assert.equal(item.notesCount, 0); assert.equal(item.planStatus, null); assert.equal(item.bookmarksCount, 1);
  await api('PUT', `/api/admin/scriptures/${input.slug}`, { token: admin.token, body: { ...input, passages: [input.passages[1]] } }, 409);
  assert.equal((await api('GET', `/api/scriptures/${input.slug}`)).passages.length, 2);
  await api('DELETE', `/api/bookmarks/${bookmark.id}`, { token: a.token });
  assert.ok(!(await api('GET', '/api/me/library', { token: a.token })).items.some((book) => book.slug === input.slug));
  await api('PUT', `/api/admin/scriptures/${input.slug}`, { token: admin.token, body: { ...input, passages: [input.passages[1]] } });
  assert.equal((await api('GET', `/api/admin/scriptures/${input.slug}`, { token: admin.token })).passages.length, 1);
});
await test('study check-in is daily idempotent with accurate private totals', async () => {
  await api('POST', '/api/me/study/checkins', { token: b.token, body: { planId, passageSlug: 'part-one', minutes: 10 } }, 404);
  await api('POST', '/api/me/study/checkins', { token: a.token, body: { planId, passageSlug: 'missing', minutes: 10 } }, 400);
  await api('POST', '/api/me/study/checkins', { token: a.token, body: { planId, passageSlug: 'part-one', minutes: 10 } });
  await api('POST', '/api/me/study/checkins', { token: a.token, body: { planId, passageSlug: 'part-two', minutes: 20, note: '今日自修' } });
  const study = await api('GET', '/api/me/study', { token: a.token });
  assert.equal(study.checkins.length, 1, 'one plan has one record per Beijing calendar day');
  assert.equal(study.stats.totalMinutes, 10); assert.equal(study.stats.totalDays, 1);
  assert.equal(study.checkins[0].date, new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10));
  assert.equal((await api('GET', '/api/me/study', { token: b.token })).checkins.length, 0);
});
await test('study allows recent backfill and rejects future dates', async () => {
  const beijing = Date.now() + 8 * 3600000;
  const yesterday = new Date(beijing - 86400000).toISOString().slice(0, 10);
  const tomorrow = new Date(beijing + 86400000).toISOString().slice(0, 10);
  await api('POST', '/api/me/study/checkins', { token: a.token, body: { planId, passageSlug: 'part-one', minutes: 12, date: yesterday } });
  await api('POST', '/api/me/study/checkins', { token: a.token, body: { planId, passageSlug: 'part-one', minutes: 10, date: tomorrow } }, 400);
  const study = await api('GET', '/api/me/study', { token: a.token });
  assert.equal(study.stats.totalDays, 2); assert.equal(study.stats.totalMinutes, 22); assert.equal(study.stats.currentStreak, 2);
});
await test('correction reports capture source and require admin handling', async () => {
  const correctionId = (await api('POST', '/api/corrections', { token: a.token, body: { scriptureSlug: custom.slug, passageSlug: 'part-one', message: '此处疑似错字', excerpt: 'forged' } })).id;
  const reports = await api('GET', '/api/admin/corrections?status=open', { token: admin.token });
  const report = reports.items.find((item) => item.id === correctionId); assert.ok(report); assert.equal(report.excerpt, custom.passages[0].originalText);
  await api('PATCH', `/api/admin/corrections/${correctionId}`, { token: reviewer.token, body: { status: 'resolved' } }, 403);
  await api('PATCH', `/api/admin/corrections/${correctionId}`, { token: admin.token, body: { status: 'resolved', response: '已核对' } });
  assert.ok((await api('GET', '/api/admin/corrections?status=resolved', { token: admin.token })).items.some((item) => item.id === correctionId));
});
await test('unpublish immediately removes content from public search and progress', async () => {
  await api('POST', `/api/admin/scriptures/${custom.slug}/unpublish`, { token: admin.token });
  await api('GET', `/api/scriptures/${custom.slug}`, {}, 404);
  assert.equal((await api('GET', `/api/search?q=${encodeURIComponent('独有词')}`)).total, 0);
  assert.equal(await api('GET', '/api/progress/latest', { token: a.token }), null);
  await api('POST', '/api/me/study/checkins', { token: a.token, body: { planId, passageSlug: 'part-one', minutes: 10 } }, 404);
  await api('POST', '/api/bookmarks', { token: a.token, body: { scriptureSlug: custom.slug, passageSlug: 'part-two' } }, 404);
  const shelf = await api('GET', '/api/me/library', { token: a.token });
  assert.equal(shelf.items.find((book) => book.slug === custom.slug).publishStatus, 'changes_requested');
});
await test('settings allow known keys and announcements support edits', async () => {
  await api('PUT', '/api/admin/settings', { token: admin.token, body: { site_name: '梵烬验收' } });
  assert.equal((await api('GET', '/api/settings')).site_name, '梵烬验收');
  await api('PUT', '/api/admin/settings', { token: admin.token, body: { arbitrary: 'value' } }, 400);
  const announcement = await api('POST', '/api/admin/announcements', { token: admin.token, body: { title: '公告', detail: '内容' } });
  await api('PUT', `/api/admin/announcements/${announcement.id}`, { token: admin.token, body: { title: '已改公告', detail: '新内容' } });
  assert.ok((await api('GET', '/api/home')).announcements.some((item) => item.title === '已改公告'));
  await api('DELETE', `/api/admin/announcements/${announcement.id}`, { token: admin.token });
});
await test('administrator role validation and last-admin safeguards', async () => {
  await api('PATCH', `/api/admin/users/${a.user.id}`, { token: admin.token, body: { role: 'owner' } }, 400);
  await api('PATCH', `/api/admin/users/${admin.user.id}`, { token: admin.token, body: { role: 'user' } }, 409);
  await api('PATCH', `/api/admin/users/${admin.user.id}`, { token: admin.token, body: { status: 'disabled' } }, 409);
  const users = await api('GET', '/api/admin/users', { token: admin.token });
  for (const user of users) assert.ok(Object.keys(user).every((key) => !/password|recovery|token/i.test(key)));
});
await test('changing password revokes every old session', async () => {
  const second = await login(accountA.name, accountA.password);
  const changed = await api('PUT', '/api/me/password', { token: a.token, body: { currentPassword: accountA.password, newPassword: 'changed-password-a' } });
  await api('GET', '/api/me', { token: a.token }, 401); await api('GET', '/api/me', { token: second.token }, 401);
  await api('POST', '/api/auth/login', { body: accountA }, 401);
  a = { ...a, ...changed }; assert.equal((await api('GET', '/api/me', { token: a.token })).id, a.user.id);
});
await test('recovery codes rotate once and revoke sessions', async () => {
  const oldCode = a.recoveryCode;
  const recovered = await api('POST', '/api/auth/recover', { body: { name: accountA.name, recoveryCode: oldCode, newPassword: 'recovered-password-a' } });
  assert.notEqual(recovered.recoveryCode, oldCode);
  await api('GET', '/api/me', { token: a.token }, 401);
  await api('POST', '/api/auth/recover', { body: { name: accountA.name, recoveryCode: oldCode, newPassword: 'another-password-a' } }, 401);
  a = await login(accountA.name, 'recovered-password-a');
});
await test('account suspension invalidates sessions and reactivation permits login', async () => {
  await api('PATCH', `/api/admin/users/${b.user.id}`, { token: admin.token, body: { status: 'disabled' } });
  await api('GET', '/api/me', { token: b.token }, 401);
  await api('POST', '/api/auth/login', { body: accountB }, 401);
  await api('PATCH', `/api/admin/users/${b.user.id}`, { token: admin.token, body: { status: 'active' } });
  b = await login(accountB.name, accountB.password);
});
await test('logout revokes token and expires cookie', async () => {
  const response = await request('POST', '/api/auth/logout', { token: b.token });
  assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/i);
  await api('GET', '/api/me', { token: b.token }, 401);
});
await test('login rate limiter returns retry guidance', async () => {
  let limited;
  for (let attempt = 0; attempt < 35; attempt++) {
    const response = await request('POST', '/api/auth/login', { body: { name: '不存在', password: 'incorrect-password' } });
    if (response.status === 429) { limited = response; break; }
    assert.equal(response.status, 401);
  }
  assert.ok(limited); assert.ok(Number(limited.headers.get('retry-after')) > 0);
});
await test('shared gateway peers do not share individual account login quotas', async () => {
  for (const name of ['同出口甲', '同出口乙']) {
    for (let attempt = 0; attempt < 30; attempt++) {
      await api('POST', '/api/auth/login', { body: { name, password: 'incorrect-password' } }, 401);
    }
    await api('POST', '/api/auth/login', { body: { name, password: 'incorrect-password' } }, 429);
    await api('POST', '/api/auth/login', { body: { name: ` ${name} `, password: 'incorrect-password' } }, 429);
  }
  const stillWorks = await login(accountB.name, accountB.password);
  assert.equal(stillWorks.user.id, b.user.id);
});
await test('shared peer recovery and authenticated security actions retain separate user limits', async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    await api('POST', '/api/auth/recover', { body: { name: '恢复限流甲', recoveryCode: 'invalid', newPassword: 'safe-test-password' } }, 401);
  }
  await api('POST', '/api/auth/recover', { body: { name: '恢复限流甲', recoveryCode: 'invalid', newPassword: 'safe-test-password' } }, 429);
  await api('POST', '/api/auth/recover', { body: { name: '恢复限流乙', recoveryCode: 'invalid', newPassword: 'safe-test-password' } }, 401);
  const activeB = await login(accountB.name, accountB.password);
  // This account already used one successful password change earlier in the suite.
  for (let attempt = 0; attempt < 14; attempt++) {
    await api('PUT', '/api/me/password', { token: a.token, body: { currentPassword: 'wrong', newPassword: 'safe-test-password' } }, 401);
  }
  await api('PUT', '/api/me/password', { token: a.token, body: { currentPassword: 'wrong', newPassword: 'safe-test-password' } }, 429);
  await api('PUT', '/api/me/password', { token: activeB.token, body: { currentPassword: 'wrong', newPassword: 'safe-test-password' } }, 401);
  for (let attempt = 0; attempt < 10; attempt++) await api('POST', '/api/me/recovery-code', { token: a.token, body: { currentPassword: 'wrong' } }, 401);
  await api('POST', '/api/me/recovery-code', { token: a.token, body: { currentPassword: 'wrong' } }, 429);
  await api('POST', '/api/me/recovery-code', { token: activeB.token, body: { currentPassword: 'wrong' } }, 401);
});
db.close();
console.log(`\nIntegration: ${passed} passed, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
