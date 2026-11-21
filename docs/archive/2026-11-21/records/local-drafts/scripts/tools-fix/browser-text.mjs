#!/usr/bin/env node
// Browser-backed read-only HTTP, fixed to one exact CDP tab for the whole job.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const exec = promisify(execFile);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
export class ReadError extends Error {
  constructor(code, message, fatal = false, status = null) { super(message); this.code = code; this.fatal = fatal; this.status = status; }
}
function httpUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new ReadError('INVALID_URL', 'Only HTTP(S) URLs without embedded credentials are allowed.', true);
  return url;
}
function topicId(url) { return url.pathname.match(/^\/t\/(?:[^/]+\/)?(\d+)(?:\/|$)/)?.[1]; }
function matchesPage(actual, expected) {
  try {
    const url = httpUrl(actual), origin = httpUrl(expected);
    return url.origin === origin.origin && (origin.hostname === 'linux.do' && topicId(origin)
      ? topicId(url) === topicId(origin)
      : url.pathname.replace(/\/$/, '') === origin.pathname.replace(/\/$/, ''));
  } catch { return false; }
}
function integer(value, fallback, min, max, label) {
  const result = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(result) || result < min || result > max) throw new ReadError('INVALID_OPTION', `${label} must be ${min}–${max}.`, true);
  return result;
}
export function cliDriver(cdpPath = join(import.meta.dirname, 'cdp.mjs')) {
  async function call(args) {
    try {
      const result = await exec(process.execPath, [cdpPath, ...args], { timeout: 30_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
      return JSON.parse(result.stdout.trim());
    } catch (error) {
      if (/exact target|no target|no page target/i.test(error.stderr || '')) throw new ReadError('TARGET_GONE', 'The fixed tab is no longer available; stopped without selecting another tab.', true);
      throw new ReadError('CDP_ERROR', 'The fixed tab did not answer a bounded CDP request.');
    }
  }
  return {
    list: () => call(['list', '--json', '1']),
    create: (url) => call(['newtab', url, '--json', '1']),
    evaluate: (id, expression) => call(['eval', expression, '--target-id', id]),
  };
}

function pageProbe() {
  const title = document.title || '';
  const blocked = /just a moment|attention required|verify you are human|安全验证|人机验证|访问受限/i.test(title)
    || Boolean(document.querySelector('#challenge-running, #challenge-form, iframe[src*="challenges.cloudflare.com"], form[action*="/challenge"]'));
  return { href: location.href, timeOrigin: performance.timeOrigin, readyState: document.readyState, blocked, login: /\/(?:login|session\/sso)(?:\/|$)/.test(location.pathname) };
}

export async function openSession(originUrl, options = {}) {
  const origin = httpUrl(originUrl);
  const driver = options.driver || cliDriver();
  const pages = await driver.list();
  let target, openedNewTab = false;
  if (options.targetId) {
    target = pages.find((page) => page.id === options.targetId);
    if (!target || !matchesPage(target.url, origin.href)) throw new ReadError('TARGET_MISMATCH', 'The requested tab does not match the article. It was not navigated.', true);
  } else {
    target = pages.find((page) => matchesPage(page.url, origin.href));
    if (!target) { target = await driver.create(origin.href); openedNewTab = true; }
  }
  if (!target?.id) throw new ReadError('TARGET_MISSING', 'No exact tab ID was returned.', true);
  const wait = options.sleep || sleep;
  const attempts = Math.max(1, Math.ceil((options.waitMs ?? 6000) / 250));
  let state;
  for (let i = 0; i < attempts; i++) {
    state = await driver.evaluate(target.id, `(${pageProbe.toString()})()`);
    if (state.blocked || state.login) throw new ReadError('HUMAN_REQUIRED', 'The tab requires login or verification. Stopped; no retry or navigation.', true);
    if (matchesPage(state.href, origin.href) && state.readyState !== 'loading') break;
    if (i + 1 === attempts) throw new ReadError('TARGET_NOT_READY', 'The fixed tab is not ready on the requested article.', true);
    await wait(250);
  }
  return { driver, id: target.id, origin: origin.origin, pageUrl: origin.href, timeOrigin: state.timeOrigin, openedNewTab };
}

// Executes inside the selected page. It never changes location or opens another tab.
async function pageFetch(input) {
  const matches = () => location.origin === input.origin && performance.timeOrigin === input.timeOrigin
    && (input.articleId ? location.pathname.match(/^\/t\/(?:[^/]+\/)?(\d+)(?:\/|$)/)?.[1] === input.articleId : location.pathname.replace(/\/$/, '') === input.path.replace(/\/$/, ''));
  if (!matches()) return { error: 'TAB_CHANGED', fatal: true };
  if (/just a moment|attention required|verify you are human|安全验证|人机验证|访问受限/i.test(document.title || '')
    || document.querySelector('#challenge-running, #challenge-form, iframe[src*="challenges.cloudflare.com"], form[action*="/challenge"]')
    || /\/(?:login|session\/sso)(?:\/|$)/.test(location.pathname)) return { error: 'HUMAN_REQUIRED', fatal: true };
  try {
    const response = await fetch(input.url, { credentials: 'include', redirect: 'manual', signal: AbortSignal.timeout(20_000) });
    const type = response.headers.get('content-type') || '';
    if ([401, 403, 429].includes(response.status) || response.type === 'opaqueredirect' || response.headers.get('cf-mitigated') === 'challenge') return { error: 'ACCESS_BLOCKED', fatal: true, status: response.status };
    if (!response.ok) return { error: `HTTP_${response.status}`, status: response.status };
    const reader = response.body.getReader();
    const chunks = []; let bytes = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.length;
      if (bytes > 2 * 1024 * 1024) { await reader.cancel(); return { error: 'BODY_TOO_LARGE', fatal: true }; }
      chunks.push(part.value);
    }
    const body = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    const text = new TextDecoder().decode(body);
    const html = /text\/html/i.test(type) || /^\s*(?:<!doctype\s+html|<html)/i.test(text);
    if (html && /cf-chl-|challenge-platform|just a moment|verify you are human|captcha|人机验证|安全验证/i.test(text)) return { error: 'HUMAN_REQUIRED', fatal: true, status: response.status };
    if (input.raw && html) return { error: 'UNEXPECTED_HTML', fatal: true, status: response.status };
    if (!text.trim()) return { error: 'EMPTY_BODY', status: response.status };
    if (!matches()) return { error: 'TAB_CHANGED', fatal: true };
    return { text, status: response.status, type, href: location.href, timeOrigin: performance.timeOrigin };
  } catch { return { error: 'FETCH_FAILED' }; }
}

export async function fetchText(session, fetchUrl, options = {}) {
  const url = httpUrl(fetchUrl);
  if (url.origin !== session.origin) throw new ReadError('CROSS_ORIGIN', 'Browser text requests must stay on the selected origin.', true);
  const page = new URL(session.pageUrl);
  const result = await session.driver.evaluate(session.id, `(${pageFetch.toString()})(${JSON.stringify({ url: url.href, origin: session.origin, path: page.pathname, articleId: page.hostname === 'linux.do' ? topicId(page) : null, timeOrigin: session.timeOrigin, raw: options.raw ?? /^\/raw\//.test(url.pathname) })})`);
  if (result.error) throw new ReadError(result.error, result.fatal ? 'Reading stopped: tab changed, access verification, login, redirect, or rate limit requires review.' : 'The requested post could not be read.', Boolean(result.fatal), result.status);
  if (!matchesPage(result.href, session.pageUrl) || result.timeOrigin !== session.timeOrigin) throw new ReadError('TAB_CHANGED', 'The article tab changed while reading. Stopped without navigation.', true);
  return result;
}
async function atomicWrite(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, contents, 'utf8');
  await rename(temporary, path);
}
function cachedText(text) { return text.trim() && !/^\s*(?:ERR[_ ]|<!doctype\s+html|<html)/i.test(text); }

export async function readTopic(topic, directory, options = {}) {
  if (!/^\d{1,12}$/.test(String(topic))) throw new ReadError('INVALID_TOPIC', 'Topic must be a numeric ID.', true);
  const start = integer(options.start, 1, 1, 10000, 'start');
  const end = integer(options.end, 100, start, 10000, 'end');
  if (end - start + 1 > 1000) throw new ReadError('RANGE_TOO_LARGE', 'At most 1000 explicitly bounded posts per run.', true);
  const delayMs = integer(options.delayMs, 1000, 0, 60000, 'delay-ms');
  const output = resolve(directory), manifestPath = join(output, 'manifest.json');
  await mkdir(output, { recursive: true });
  let prior;
  try { prior = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (prior && String(prior.topic) !== String(topic)) throw new ReadError('CACHE_TOPIC_MISMATCH', 'Output directory belongs to another topic.', true);
  const manifest = { version: 1, topic: String(topic), range: { start, end }, startedAt: new Date().toISOString(), targetId: null, timeOrigin: null, completed: false, stopped: null, posts: {} };
  const save = () => atomicWrite(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  let session, failures = 0, requests = 0;
  for (let number = start; number <= end; number++) {
    const path = join(output, `raw-${number}.md`);
    let cached;
    try { cached = await readFile(path, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (cached && cachedText(cached)) {
      const previous = prior?.posts?.[number];
      manifest.posts[number] = { state: 'cached', bytes: Buffer.byteLength(cached), originVerified: previous?.state === 'fetched' || previous?.originVerified === true }; failures = 0; continue;
    }
    try {
      session ??= await openSession(`https://linux.do/t/topic/${topic}`, options);
      manifest.targetId = session.id; manifest.timeOrigin = session.timeOrigin; manifest.openedNewTab = session.openedNewTab;
      if (requests > 0 && delayMs) await (options.sleep || sleep)(delayMs);
      requests++;
      const response = await fetchText(session, `https://linux.do/raw/${topic}/${number}`, { raw: true });
      await atomicWrite(path, response.text);
      manifest.posts[number] = { state: 'fetched', status: response.status, bytes: Buffer.byteLength(response.text), timeOrigin: response.timeOrigin, pageUrl: response.href };
      failures = 0;
    } catch (error) {
      failures++;
      manifest.posts[number] = { state: 'missing', code: error.code || 'READ_FAILED', status: error.status ?? null };
      if (error.fatal || !session || failures >= 3) {
        manifest.stopped = { floor: number, code: error.code || 'READ_FAILED', consecutiveFailures: failures };
        break;
      }
    } finally { await save(); }
  }
  manifest.rangeScanned = !manifest.stopped && Object.keys(manifest.posts).length === end - start + 1;
  manifest.requestCount = requests;
  manifest.finishedAt = new Date().toISOString();
  manifest.missing = Object.entries(manifest.posts).filter(([, value]) => value.state === 'missing').map(([key]) => Number(key));
  manifest.completed = manifest.rangeScanned && manifest.missing.length === 0;
  await save();
  return manifest;
}

export async function main(argv = process.argv.slice(2)) {
  const [action, ...rest] = argv;
  const positional = [], flags = {};
  for (let index = 0; index < rest.length; index++) {
    if (rest[index].startsWith('--')) {
      if (!['--target-id', '--start', '--end', '--delay-ms', '--wait'].includes(rest[index])) throw new ReadError('INVALID_OPTION', `Unknown option: ${rest[index]}`, true);
      if (rest[index + 1] === undefined) throw new ReadError('INVALID_OPTION', `Missing value for ${rest[index]}`, true);
      flags[rest[index].slice(2)] = rest[++index];
    } else positional.push(rest[index]);
  }
  const options = { targetId: flags['target-id'], start: flags.start, end: flags.end, delayMs: flags['delay-ms'], waitMs: integer(flags.wait, 6, 0, 25, 'wait') * 1000 };
  if (action === 'linuxdo') {
    const [topic, directory] = positional;
    if (!directory) throw new ReadError('OUTPUT_REQUIRED', 'An output directory is required.', true);
    const report = await readTopic(topic, directory, options);
    console.log(JSON.stringify({ topic: report.topic, targetId: report.targetId, range: report.range, fetched: Object.values(report.posts).filter((post) => post.state === 'fetched').length, cached: Object.values(report.posts).filter((post) => post.state === 'cached').length, missing: report.missing, stopped: report.stopped, manifest: resolve(directory, 'manifest.json') }));
    return report.stopped ? 2 : report.missing.length ? 1 : 0;
  }
  if (action === 'fetch') {
    const [origin, target, output] = positional;
    if (!output) throw new ReadError('OUTPUT_REQUIRED', 'An output file is required.', true);
    const session = await openSession(origin, options);
    const result = await fetchText(session, target);
    await atomicWrite(resolve(output), result.text);
    console.log(JSON.stringify({ file: resolve(output), bytes: Buffer.byteLength(result.text), targetId: session.id, status: result.status }));
    return 0;
  }
  throw new ReadError('INVALID_ACTION', 'Use linuxdo <topic> <directory> or fetch <origin> <url> <file>.', true);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then((code) => { process.exitCode = code; }).catch((error) => { console.error(`ERR_${error.code || 'READ_FAILED'} ${error.message}`); process.exitCode = error.fatal ? 2 : 1; });
}
