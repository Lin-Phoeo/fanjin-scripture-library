import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { buildCatalog } from '../scripts/build-catalog.mjs';
import { dispatchLocalApi } from '../src/lib/local-api.ts';
import { changeLocalState, readLocalState } from '../src/lib/local-store.ts';

await buildCatalog();
const publicRoot = resolve('public');
const requests = [];
globalThis.fetch = async (input, options) => {
  const path = typeof input === 'string' ? input : input.url;
  assert.ok(path.startsWith('/content/'), `Unexpected non-static network call: ${path}`);
  assert.equal(options?.credentials, 'omit');
  requests.push(path);
  const target = resolve(publicRoot, path.slice(1));
  assert.ok(!relative(publicRoot, target).startsWith('..'));
  try { return new Response(await readFile(target), { status: 200, headers: { 'content-type': 'application/json' } }); }
  catch { return new Response('{}', { status: 404 }); }
};
const api = (method, path, body, extra = {}) => dispatchLocalApi(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...extra });
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log(`  PASS ${name}`); }
const localDay = (offset = 0) => { const value = new Date(); value.setDate(value.getDate() + offset); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; };
let book, noteId, planId;

await test('public catalog and scope search read only static public assets', async () => {
  const health = await api('GET', '/api/health'); assert.equal(health.storage, 'indexeddb');
  const home = await api('GET', '/api/home'); assert.equal(home.stats.scriptureCount, 6);
  assert.equal(home.stats.passageCount, 617); assert.equal(home.stats.discussionCount, 0);
  assert.ok((await api('GET', '/api/settings')).site_name);
  assert.ok((await api('GET', '/api/categories')).length);
  const books = await api('GET', '/api/scriptures?category=dao'); assert.ok(books.length); assert.ok(books.every((item) => item.categorySlug === 'dao'));
  assert.ok((await api('GET', '/api/scriptures?q=大學')).some((item) => item.slug === 'daxue'));
  book = await api('GET', '/api/scriptures/heart-sutra'); assert.equal(book.passages.length, 7);
  for (const keyword of ['學而時習之', '学而时习之']) assert.ok((await api('GET', `/api/search?q=${encodeURIComponent(keyword)}&scope=original`)).items.some((item) => item.scriptureSlug === 'lunyu'));
  await assert.rejects(api('GET', '/api/search?q=test&scope=unknown'));
  await assert.rejects(api('GET', '/api/scriptures/unknown-book'));
});
await test('local profile and preferences work without a login or remote authentication', async () => {
  assert.equal((await api('GET', '/api/me')).name, '我的书斋');
  await api('PUT', '/api/local/profile', { name: '山间书斋' });
  assert.equal((await api('GET', '/api/me')).name, '山间书斋');
  assert.equal(await api('GET', '/api/me/preferences'), null);
  const choice = { interests: ['佛家', '道家'], minutes: 15, intention: 'quiet' };
  await api('PUT', '/api/me/preferences', choice);
  await assert.rejects(api('PUT', '/api/me/preferences', { ...choice, minutes: 99 }));
  assert.deepEqual(await api('GET', '/api/me/preferences'), choice);
  await api('DELETE', '/api/me/preferences'); assert.equal(await api('GET', '/api/me/preferences'), null);
  await assert.rejects(api('POST', '/api/auth/login', { name: 'someone', password: 'not-used' }), /无需账号/);
  await assert.rejects(api('GET', '/api/admin/users'), /没有远程管理/);
  await assert.rejects(api('GET', 'https://other.invalid/api/me'), /外部接口/);
});
await test('concurrent favorites and bookmarks remain idempotent', async () => {
  await Promise.all(Array.from({ length: 12 }, () => api('POST', '/api/favorites', { scriptureSlug: book.slug })));
  assert.equal((await api('GET', '/api/favorites')).length, 1);
  const results = await Promise.all(Array.from({ length: 12 }, () => api('POST', '/api/bookmarks', { scriptureSlug: book.slug, passageSlug: book.passages[0].slug })));
  assert.equal(new Set(results.map((result) => result.id)).size, 1);
  assert.equal((await api('GET', `/api/bookmarks?scriptureSlug=${book.slug}`)).length, 1);
  assert.deepEqual(await api('GET', '/api/bookmarks?scriptureSlug=daxue'), []);
  await assert.rejects(api('POST', '/api/bookmarks', { scriptureSlug: book.slug, passageSlug: 'invalid' }));
});
await test('concurrent note saves preserve every record and immutable original snapshots', async () => {
  const result = await Promise.all(Array.from({ length: 20 }, (_, index) => api('POST', '/api/notes', { scriptureSlug: book.slug, passageSlug: book.passages[0].slug, note: `心得${index}`, excerpt: 'forged' })));
  assert.equal(new Set(result.map((item) => item.id)).size, 20); noteId = result[0].id;
  let notes = await api('GET', '/api/notes'); assert.equal(notes.length, 20);
  assert.ok(notes.every((item) => item.excerpt === book.passages[0].originalText));
  await api('PUT', `/api/notes/${noteId}`, { note: '<script>private text</script>', excerpt: 'forged' });
  notes = await api('GET', '/api/notes'); const changed = notes.find((item) => item.id === noteId);
  assert.equal(changed.excerpt, book.passages[0].originalText); assert.equal(changed.note, '<script>private text</script>');
  const markdown = await api('GET', '/api/notes/export?format=md'); assert.match(markdown, /&lt;script&gt;/);
  assert.equal((await api('GET', '/api/notes/export?format=json')).length, 20);
  await assert.rejects(api('PUT', `/api/notes/${noteId}`, { note: 3 }));
  await assert.rejects(api('GET', '/api/notes/export?format=unknown'));
});
await test('reading progress is upserted and latest is deterministic under same-millisecond writes', async () => {
  assert.equal(await api('GET', '/api/progress/latest'), null);
  await api('PUT', '/api/progress', { scriptureSlug: book.slug, passageSlug: book.passages[0].slug });
  await api('PUT', '/api/progress', { scriptureSlug: book.slug, passageSlug: book.passages[1].slug });
  assert.equal((await api('GET', '/api/progress/latest')).passageSlug, book.passages[1].slug);
  assert.equal((await api('GET', '/api/history')).length, 1);
  await api('POST', '/api/history', { scriptureSlug: 'daxue' });
  assert.equal((await api('GET', '/api/progress/latest')).scriptureSlug, 'daxue');
  assert.equal((await api('GET', '/api/history')).length, 2);
  await assert.rejects(api('PUT', '/api/progress', { scriptureSlug: book.slug, passageSlug: 'missing' }));
});
await test('bookshelf aggregates actual local bookmarks, notes, favorites and progress', async () => {
  const shelf = await api('GET', '/api/me/library');
  const item = shelf.items.find((entry) => entry.slug === book.slug);
  assert.ok(item.favorite); assert.equal(item.notesCount, 20); assert.equal(item.bookmarksCount, 1);
  assert.equal(item.passageSlug, book.passages[1].slug);
  assert.ok(shelf.items.some((entry) => entry.slug === 'daxue'));
});
await test('inactive plans cannot create logs and the daily first write is idempotent', async () => {
  planId = (await api('POST', '/api/me/study/plans', { scriptureSlug: book.slug, dailyMinutes: 15 })).id;
  await assert.rejects(api('POST', '/api/me/study/plans', { scriptureSlug: book.slug }));
  await api('PATCH', `/api/me/study/plans/${planId}`, { status: 'paused' });
  await assert.rejects(api('POST', '/api/me/study/checkins', { planId, passageSlug: book.passages[0].slug, minutes: 15 }));
  await api('PATCH', `/api/me/study/plans/${planId}`, { status: 'active', dailyMinutes: 20 });
  await api('POST', '/api/me/study/checkins', { planId, passageSlug: book.passages[0].slug, minutes: 12, note: '第一条心得' });
  await Promise.all(Array.from({ length: 10 }, () => api('POST', '/api/me/study/checkins', { planId, passageSlug: book.passages[1].slug, minutes: 99, note: '不能覆盖' })));
  const study = await api('GET', '/api/me/study');
  assert.equal(study.checkins.length, 1); assert.equal(study.stats.totalMinutes, 12);
  assert.equal(study.checkins[0].note, '第一条心得'); assert.equal(study.checkins[0].date, localDay());
  await api('POST', '/api/me/study/checkins', { planId, passageSlug: book.passages[1].slug, minutes: 10, date: localDay(-1) });
  await assert.rejects(api('POST', '/api/me/study/checkins', { planId, passageSlug: book.passages[0].slug, minutes: 10, date: localDay(1) }));
  await assert.rejects(api('POST', '/api/me/study/checkins', { planId, passageSlug: book.passages[0].slug, minutes: 10, date: localDay(-4) }));
  await api('DELETE', `/api/me/study/plans/${planId}`);
  await assert.rejects(api('POST', '/api/me/study/checkins', { planId, passageSlug: book.passages[0].slug, minutes: 10 }));
  assert.equal((await api('GET', '/api/me/study')).plans.length, 0);
  const restored = await api('POST', '/api/me/study/plans', { scriptureSlug: book.slug }); assert.equal(restored.id, planId);
});
await test('a canceled in-flight write rolls back before the transaction commits', async () => {
  const snapshot = await readLocalState();
  const controller = new AbortController();
  await assert.rejects(changeLocalState((state) => { state.notes = []; controller.abort(); }, controller.signal), { name: 'AbortError' });
  assert.deepEqual(await readLocalState(), snapshot);
  const canceled = new AbortController(); canceled.abort();
  await assert.rejects(api('POST', '/api/favorites', { scriptureSlug: 'lunyu' }, { signal: canceled.signal }), { name: 'AbortError' });
  assert.deepEqual(await readLocalState(), snapshot);
});
await test('full backup imports are validated atomically and recover a damaged stored record', async () => {
  const backup = await api('GET', '/api/local/export');
  assert.equal('epoch' in backup, false); assert.equal('replacement-epoch' in backup, false);
  assert.equal('epoch' in backup.data, false); assert.equal('replacement-epoch' in backup.data, false);
  const before = await readLocalState();
  for (const invalid of [
    { ...backup, version: 2 },
    { ...backup, data: { ...backup.data, bookmarks: [backup.data.bookmarks[0], backup.data.bookmarks[0]] } },
    { ...backup, data: { ...backup.data, plans: [] } },
    { ...backup, data: { ...backup.data, profile: { name: '' } } },
  ]) {
    await assert.rejects(api('POST', '/api/local/import', { backup: invalid }));
    assert.deepEqual(await readLocalState(), before);
  }
  await assert.rejects(dispatchLocalApi('/api/local/import', { method: 'POST', body: '{"backup":' }));
  assert.deepEqual(await readLocalState(), before);
  await api('DELETE', '/api/local/data'); assert.equal((await api('GET', '/api/notes')).length, 0);
  await api('POST', '/api/local/import', { backup }); assert.deepEqual(await readLocalState(), before);
  const connection = await new Promise((accept, reject) => { const request = indexedDB.open('fanjin-local-v1', 1); request.onsuccess = () => accept(request.result); request.onerror = () => reject(request.error); });
  await new Promise((accept, reject) => { const tx = connection.transaction('app', 'readwrite'); tx.objectStore('app').put({ broken: true }, 'state'); tx.oncomplete = accept; tx.onerror = reject; });
  await assert.rejects(api('GET', '/api/notes'), /记录格式异常/);
  await api('POST', '/api/local/import', { backup }); assert.deepEqual(await readLocalState(), before); connection.close();
});
await test('local deletes update saved aggregates and never make write network requests', async () => {
  const bookmarks = await api('GET', '/api/bookmarks');
  await api('DELETE', `/api/bookmarks/${bookmarks[0].id}`);
  await api('DELETE', `/api/notes/${noteId}`); await api('DELETE', `/api/favorites/${book.slug}`);
  assert.equal((await api('GET', '/api/notes')).length, 19); assert.equal((await api('GET', '/api/bookmarks')).length, 0);
  await assert.rejects(api('DELETE', '/api/bookmarks/999999'));
  await assert.rejects(api('POST', '/api/corrections', { message: 'not sent' }), /不会发送/);
  assert.ok(requests.length > 0 && requests.every((path) => path.startsWith('/content/')));
});
console.log(`\nLocal API: ${passed} passed.`);
