import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';
import { readTopic, openSession, fetchText } from './browser-text.mjs';

const article = 'https://linux.do/t/topic/123';
function mock(options = {}) {
  const calls = [];
  const pages = [
    { id: 'DNS-TAB', url: 'https://namify.get.tech/domains' },
    { id: 'APP-TAB', url: 'http://127.0.0.1:5188/' },
    ...(!options.absent ? [{ id: 'ARTICLE-TAB', url: options.url || 'https://linux.do/t/my-article/123/1' }] : []),
  ];
  const states = new Map(pages.map((page) => [page.id, { url: page.url, timeOrigin: 1234, title: options.title || 'Article' }]));
  let count = 0;
  const driver = {
    async list() { calls.push({ method: 'list' }); return pages; },
    async create(url) {
      calls.push({ method: 'create', url });
      const target = { id: 'CREATED-ARTICLE', url }; pages.push(target); states.set(target.id, { url, timeOrigin: 1234, title: 'Article' }); return target;
    },
    async evaluate(id, expression) {
      calls.push({ method: 'evaluate', id });
      const state = states.get(id); assert.ok(state, 'fixed target must exist');
      if (options.changeAfter && count >= options.changeAfter) { state.timeOrigin = 5678; state.url = options.changedUrl || 'https://linux.do/t/another/456'; }
      const location = new URL(state.url);
      const context = {
        location, performance: { timeOrigin: state.timeOrigin }, document: { title: state.title, readyState: 'complete', querySelector: () => options.challengeElement ? {} : null },
        AbortSignal, TextDecoder, Uint8Array,
        fetch: async (url, init) => {
          count++; calls.push({ method: 'fetch', id, url, init });
          const value = options.response?.(url, count) || { text: `Reply ${count}`, status: 200 };
          return new Response(value.text, { status: value.status, headers: { 'content-type': value.type || 'text/plain', ...(value.headers || {}) } });
        },
      };
      return runInNewContext(expression, context, { timeout: 1000 });
    },
    async navigate() { throw new Error('navigation must never be called by the fetch loop'); },
  };
  return { driver, calls, states };
}
async function fixture(fn) {
  const directory = await mkdtemp(join(tmpdir(), 'fixed-tab-test-'));
  try { await fn(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}
const options = (driver, extra = {}) => ({ driver, start: 1, end: 5, delayMs: 0, sleep: async () => {}, ...extra });

test('five posts reuse exact article tab and never navigate DNS/app tabs', () => fixture(async (dir) => {
  const { driver, calls, states } = mock();
  const report = await readTopic('123', dir, options(driver));
  assert.equal(report.completed, true); assert.equal(report.requestCount, 5);
  assert.equal(calls.filter((call) => call.method === 'create').length, 0);
  assert.ok(calls.filter((call) => ['evaluate', 'fetch'].includes(call.method)).every((call) => call.id === 'ARTICLE-TAB'));
  assert.equal(states.get('DNS-TAB').url, 'https://namify.get.tech/domains');
  assert.equal(states.get('APP-TAB').url, 'http://127.0.0.1:5188/');
  assert.equal(report.timeOrigin, 1234);
}));
test('missing article causes exactly one new page across all posts', () => fixture(async (dir) => {
  const { driver, calls } = mock({ absent: true });
  const report = await readTopic('123', dir, options(driver, { end: 10 }));
  assert.equal(report.requestCount, 10);
  assert.equal(calls.filter((call) => call.method === 'create').length, 1);
  assert.ok(calls.filter((call) => call.method === 'fetch').every((call) => call.id === 'CREATED-ARTICLE'));
}));
test('explicit unrelated target is rejected without changing any page', async () => {
  const { driver, calls } = mock();
  await assert.rejects(openSession(article, { driver, targetId: 'DNS-TAB' }), { code: 'TARGET_MISMATCH' });
  assert.equal(calls.length, 1);
});
test('verification page stops before requesting the first post', () => fixture(async (dir) => {
  const { driver, calls } = mock({ title: 'Just a moment...' });
  const report = await readTopic('123', dir, options(driver));
  assert.equal(report.stopped.code, 'HUMAN_REQUIRED'); assert.equal(report.requestCount, 0);
  assert.equal(calls.filter((call) => call.method === 'fetch').length, 0);
}));
for (const status of [401, 403, 429]) test(`HTTP ${status} stops immediately without retries`, () => fixture(async (dir) => {
  const { driver, calls } = mock({ response: () => ({ text: 'Blocked', status }) });
  const report = await readTopic('123', dir, options(driver));
  assert.equal(report.stopped.code, 'ACCESS_BLOCKED'); assert.equal(report.requestCount, 1);
  assert.equal(calls.filter((call) => call.method === 'fetch').length, 1);
}));
test('HTTP 200 CAPTCHA page is never saved as article content', () => fixture(async (dir) => {
  const { driver } = mock({ response: () => ({ text: '<!doctype html><title>captcha</title>', status: 200, type: 'text/html' }) });
  const report = await readTopic('123', dir, options(driver));
  assert.equal(report.stopped.code, 'HUMAN_REQUIRED'); assert.equal(report.requestCount, 1);
  await assert.rejects(readFile(join(dir, 'raw-1.md')), { code: 'ENOENT' });
}));
test('three consecutive missing posts stop a bounded run and preserve the manifest', () => fixture(async (dir) => {
  const { driver } = mock({ response: () => ({ text: 'Not found', status: 404 }) });
  const report = await readTopic('123', dir, options(driver, { end: 60 }));
  assert.equal(report.requestCount, 3); assert.equal(report.stopped.floor, 3); assert.deepEqual(report.missing, [1, 2, 3]);
  assert.equal(JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')).completed, false);
}));
test('short cached replies are retained and a fully cached range makes no browser calls', () => fixture(async (dir) => {
  await writeFile(join(dir, 'raw-1.md'), '好'); await writeFile(join(dir, 'raw-2.md'), '收到');
  const { driver, calls } = mock();
  const report = await readTopic('123', dir, options(driver, { end: 2 }));
  assert.equal(report.completed, true); assert.equal(report.requestCount, 0); assert.equal(calls.length, 0);
  assert.equal(report.posts[1].state, 'cached');
}));
test('explicit start/end resume requests only the missing floors in range', () => fixture(async (dir) => {
  await writeFile(join(dir, 'raw-41.md'), 'cached');
  const { driver, calls } = mock();
  const report = await readTopic('123', dir, options(driver, { start: 41, end: 43, targetId: 'ARTICLE-TAB' }));
  assert.equal(report.requestCount, 2);
  assert.deepEqual(calls.filter((call) => call.method === 'fetch').map((call) => call.url), ['https://linux.do/raw/123/42', 'https://linux.do/raw/123/43']);
}));
test('a page reload or topic switch aborts before another network request', () => fixture(async (dir) => {
  const { driver, calls } = mock({ changeAfter: 1 });
  const report = await readTopic('123', dir, options(driver));
  assert.equal(report.stopped.code, 'TAB_CHANGED');
  assert.equal(calls.filter((call) => call.method === 'fetch').length, 1);
}));
test('generic HTML fetching remains supported without reloading its page', async () => {
  const { driver, calls } = mock({ url: 'https://example.org/article', response: () => ({ text: '<!doctype html><html><body>Public article</body></html>', type: 'text/html', status: 200 }) });
  const session = await openSession('https://example.org/article', { driver, targetId: 'ARTICLE-TAB' });
  const result = await fetchText(session, 'https://example.org/article');
  assert.match(result.text, /Public article/); assert.equal(calls.filter((call) => call.method === 'create').length, 0);
  await assert.rejects(fetchText(session, 'https://other.example/article'), { code: 'CROSS_ORIGIN' });
});
test('topic cache cannot be reused for a different article', () => fixture(async (dir) => {
  await writeFile(join(dir, 'manifest.json'), JSON.stringify({ topic: '456' }));
  const { driver, calls } = mock();
  await assert.rejects(readTopic('123', dir, options(driver)), { code: 'CACHE_TOPIC_MISMATCH' });
  assert.equal(calls.length, 0);
}));
test('unverified legacy caches never become origin-verified just by repeated cache reads', () => fixture(async (dir) => {
  await writeFile(join(dir, 'raw-1.md'), 'legacy cached reply');
  const { driver, calls } = mock();
  const first = await readTopic('123', dir, options(driver, { end: 1 }));
  const second = await readTopic('123', dir, options(driver, { end: 1 }));
  assert.equal(first.posts[1].originVerified, false);
  assert.equal(second.posts[1].originVerified, false);
  assert.equal(calls.length, 0);
}));
test('successfully fetched cache retains its verified origin on subsequent reads', () => fixture(async (dir) => {
  const { driver } = mock();
  const first = await readTopic('123', dir, options(driver, { end: 1 }));
  const second = await readTopic('123', dir, options(driver, { end: 1 }));
  const third = await readTopic('123', dir, options(driver, { end: 1 }));
  assert.equal(first.posts[1].state, 'fetched');
  assert.equal(second.posts[1].originVerified, true);
  assert.equal(third.posts[1].originVerified, true);
}));
