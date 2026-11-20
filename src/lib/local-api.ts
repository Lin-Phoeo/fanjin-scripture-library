import { getLocalBook, getLocalCatalog, getLocalSearch, normalizeLocalSearch, searchLocalCatalog } from './local-catalog';
import { changeLocalState as writeLocalState, emptyLocalState, localNumber, localSlug, localText, readLocalEpoch, readLocalState, record, replaceLocalState, validateLocalBackup, validateLocalPreferences, validLocalDay, type LocalBackup, type LocalReference, type LocalState } from './local-store';

function aborted(signal?: AbortSignal | null) {
  if (signal?.aborted) throw new DOMException('操作已取消', 'AbortError');
}
function payload(init: RequestInit): Record<string, unknown> {
  if (init.body === undefined || init.body === null || init.body === '') return {};
  if (typeof init.body !== 'string' || init.body.length > 20_000_000) throw new Error('请求数据格式或大小不正确。');
  try { return record(JSON.parse(init.body)); }
  catch (error) {
    if (error instanceof SyntaxError) {
      const invalid = new Error('JSON 数据格式不正确。');
      Object.defineProperty(invalid, 'cause', { value: error });
      throw invalid;
    }
    throw error;
  }
}
function id(value: string) { return localNumber(Number(value), '记录编号'); }
function nextId(state: LocalState, kind: keyof LocalState['counters']) {
  const next = state.counters[kind] + 1;
  localNumber(next, '记录编号'); state.counters[kind] = next; return next;
}
const byDate = <T extends { updatedAt?: string; createdAt?: string }>(a: T, b: T) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
const today = (offset = 0) => { const day = new Date(); day.setDate(day.getDate() + offset); return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`; };
function checkinDay(value: unknown) {
  const day = value === undefined ? today() : validLocalDay(value);
  if (day > today() || day < today(-3)) throw new Error('可记录今天或最近 3 天的功课，不能记录未来日期。');
  return day;
}
async function passageTarget(body: Record<string, unknown>) {
  const book = await getLocalBook(body.scriptureSlug);
  const passageSlug = localSlug(body.passageSlug);
  const index = book.passages.findIndex((passage) => passage.slug === passageSlug);
  if (index < 0) throw new Error('该段落不属于当前经典。');
  const passage = book.passages[index];
  const reference: LocalReference = { scriptureSlug: book.slug, scriptureTitle: book.title, passageSlug, passageTitle: passage.title };
  return { book, passage, reference, index };
}
function markdownEscape(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/([\\`*_{}[\]()#+.!|~-])/g, '\\$1');
}
function notesMarkdown(state: LocalState) {
  return ['# 梵烬 · 私人摘录与心得', '', `导出时间：${new Date().toISOString()}`, '',
    '原文引用为保存摘录时的快照。', '',
    ...state.notes.slice().sort(byDate).flatMap((note) => [
      `## ${markdownEscape(note.scriptureTitle)} · ${markdownEscape(note.passageTitle)}`, '',
      `记录时间：${note.createdAt}`, '', ...markdownEscape(note.excerpt).split(/\r?\n/).map((line) => `> ${line}`), '',
      markdownEscape(note.note), '', `原段标识：${note.scriptureSlug} / ${note.passageSlug}`, '', '---', '',
    ])].join('\n');
}

async function library(state: LocalState) {
  const catalog = await getLocalCatalog();
  const associated = new Set([
    ...state.favorites.map((v) => v.slug), ...state.notes.map((v) => v.scriptureSlug),
    ...state.progress.map((v) => v.scriptureSlug), ...state.bookmarks.map((v) => v.scriptureSlug),
    ...state.plans.filter((v) => v.status !== 'archived').map((v) => v.scriptureSlug),
  ]);
  const items = [...associated].map((slug) => {
    const book = catalog.books.find((v) => v.slug === slug);
    const favorite = state.favorites.find((v) => v.slug === slug);
    const progress = state.progress.find((v) => v.scriptureSlug === slug);
    const plan = state.plans.find((v) => v.scriptureSlug === slug && v.status !== 'archived');
    const note = state.notes.find((v) => v.scriptureSlug === slug);
    const bookmark = state.bookmarks.find((v) => v.scriptureSlug === slug);
    return { slug, title: book?.title || favorite?.title || progress?.scriptureTitle || plan?.scriptureTitle || note?.scriptureTitle || bookmark?.scriptureTitle || slug,
      school: book?.school || '', edition: book?.edition || '', publishStatus: book?.publishStatus || 'unavailable',
      isExcerpt: book?.isExcerpt ?? false, categoryName: book?.categoryName || favorite?.categoryName || '',
      progressAt: progress?.updatedAt ?? null, passageSlug: progress?.passageSlug ?? null, passageTitle: progress?.passageTitle ?? null,
      passageOrder: progress?.passageOrder ?? null, savedAt: favorite?.createdAt ?? null, favorite: Boolean(favorite),
      totalPassages: book?.passageCount ?? progress?.totalPassages ?? plan?.totalPassages ?? 0,
      notesCount: state.notes.filter((v) => v.scriptureSlug === slug).length, bookmarksCount: state.bookmarks.filter((v) => v.scriptureSlug === slug).length,
      planStatus: plan?.status ?? null, dailyMinutes: plan?.dailyMinutes ?? null };
  }).sort((a, b) => (b.progressAt || b.savedAt || '').localeCompare(a.progressAt || a.savedAt || ''));
  return { items };
}
function studyOverview(state: LocalState) {
  const plans = state.plans.filter((plan) => plan.status !== 'archived').map((plan) => ({ ...plan, completedPassages: new Set(state.logs.filter((log) => log.planId === plan.id).map((log) => log.passageSlug)).size })).sort((a, b) => b.id - a.id);
  const checkins = state.logs.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 100);
  return { plans, checkins, stats: { totalDays: new Set(state.logs.map((log) => log.date)).size, currentStreak: 0,
    totalMinutes: state.logs.reduce((sum, log) => sum + log.minutes, 0), todayMinutes: state.logs.filter((log) => log.date === today()).reduce((sum, log) => sum + log.minutes, 0),
    completedPassages: new Set(state.logs.map((log) => `${log.scriptureSlug}/${log.passageSlug}`)).size } };
}

/** Pure static mode: network requests below only read published JSON assets, never server APIs. */
export async function dispatchLocalApi(path: string, init: RequestInit = {}): Promise<unknown> {
  aborted(init.signal);
  const url = new URL(path, 'https://fanjin.local');
  if (url.origin !== 'https://fanjin.local' || !url.pathname.startsWith('/api/')) throw new Error('本机书斋不支持外部接口。');
  const route = url.pathname.replace(/\/$/, '');
  const method = (init.method || 'GET').toUpperCase();
  const body = payload(init);
  const signal = init.signal;
  const epoch = method === 'GET' ? undefined : await readLocalEpoch();
  aborted(signal);
  const changeLocalState = <T>(change: (state: LocalState) => T, operationSignal?: AbortSignal | null) => writeLocalState(change, operationSignal, epoch);

  if (route.startsWith('/api/admin')) throw new Error('此版本为本机书斋，没有远程管理后台。');
  if (route.startsWith('/api/auth') || ['/api/me/password', '/api/me/recovery-code'].includes(route)) throw new Error('本机书斋无需账号或密码，数据只保存在当前浏览器。');
  if (route === '/api/corrections') throw new Error('静态网站不会发送勘误，请复制问题并前往项目问题页反馈。');

  if (method === 'GET') {
    if (route === '/api/health') return { ok: true, service: 'fanjin-local', storage: 'indexeddb' };
    if (['/api/settings', '/api/categories', '/api/home', '/api/scriptures'].includes(route)) {
      const catalog = await getLocalCatalog(); aborted(signal);
      if (route === '/api/settings') return catalog.settings;
      if (route === '/api/categories') return catalog.categories;
      const published = catalog.books.filter((book) => book.publishStatus === 'published');
      if (route === '/api/home') return { announcements: catalog.announcements || [], featuredScriptures: published.slice(0, 6).map((book) => ({ ...book, category: book.categoryName })), stats: { scriptureCount: published.length, passageCount: published.reduce((sum, book) => sum + (book.passageCount || 0), 0), topicCount: 0, discussionCount: 0 }, settings: catalog.settings };
      const query = (url.searchParams.get('q') || '').trim(); const category = url.searchParams.get('category');
      if (query.length > 100) throw new Error('搜索关键词最多 100 个字符。');
      const items = published.filter((book) => !category || book.categorySlug === category);
      if (!query) return items;
      const index = await getLocalSearch(); aborted(signal);
      const normalized = normalizeLocalSearch(query, index.charMap);
      const matched = new Set(index.items.filter((item) => normalizeLocalSearch(`${item.scriptureTitle} ${item.passageTitle} ${item.original} ${item.plain} ${item.commentary} ${Object.values(item.normalized || {}).join(' ')}`, index.charMap).includes(normalized)).map((item) => item.scriptureSlug));
      return items.filter((book) => matched.has(book.slug) || normalizeLocalSearch(`${book.title} ${book.role} ${book.overlay} ${book.summary}`, index.charMap).includes(normalized));
    }
    const bookRoute = route.match(/^\/api\/(?:scriptures|books)\/([^/]+)$/);
    if (bookRoute) { const result = await getLocalBook(decodeURIComponent(bookRoute[1])); aborted(signal); return result; }
    if (route === '/api/search') { const result = await searchLocalCatalog(url.searchParams); aborted(signal); return result; }
    const state = await readLocalState(); aborted(signal);
    if (route === '/api/me') return { id: 1, name: state.profile.name, role: 'user', stats: { favoritesCount: state.favorites.length, notesCount: state.notes.length } };
    if (route === '/api/local/export') return { format: 'fanjin-local-backup', version: 1, exportedAt: new Date().toISOString(), data: state } satisfies LocalBackup;
    if (route === '/api/me/preferences') return state.preferences;
    if (route === '/api/favorites') return state.favorites.slice().sort(byDate);
    if (route === '/api/notes') return state.notes.slice().sort(byDate);
    if (route === '/api/notes/export') {
      const format = url.searchParams.get('format') || 'md';
      if (format === 'json') return state.notes.slice().sort(byDate);
      if (format === 'md') return notesMarkdown(state);
      throw new Error('导出格式仅支持 md 或 json。');
    }
    if (route === '/api/progress/latest') return state.progress.slice().sort(byDate)[0] ?? null;
    if (route === '/api/history') return state.progress.slice().sort(byDate).slice(0, 20).map((item) => ({ ...item, viewedAt: item.updatedAt }));
    if (route === '/api/bookmarks') { const slug = url.searchParams.get('scriptureSlug'); return state.bookmarks.filter((item) => !slug || item.scriptureSlug === slug).sort(byDate); }
    if (route === '/api/me/study') return studyOverview(state);
    if (route === '/api/me/library') { const result = await library(state); aborted(signal); return result; }
  }

  if (route === '/api/local/import' && method === 'POST') { const state = validateLocalBackup(body.backup); aborted(signal); await replaceLocalState(state, signal); return { ok: true }; }
  if (route === '/api/local/data' && method === 'DELETE') { await replaceLocalState(emptyLocalState(), signal); return { ok: true }; }
  if (route === '/api/local/profile' && method === 'PUT') {
    const name = localText(body.name, '书斋名称', 40).trim();
    return changeLocalState((state) => { state.profile.name = name; return { id: 1, name, role: 'user' }; }, signal);
  }
  if (route === '/api/me/preferences' && method === 'PUT') {
    const preferences = validateLocalPreferences(body);
    return changeLocalState((state) => { state.preferences = preferences; return preferences; }, signal);
  }
  if (route === '/api/me/preferences' && method === 'DELETE') return changeLocalState((state) => { state.preferences = null; return { ok: true }; }, signal);

  if (route === '/api/favorites' && method === 'POST') {
    const book = await getLocalBook(body.scriptureSlug); aborted(signal);
    return changeLocalState((state) => { if (!state.favorites.some((item) => item.slug === book.slug)) state.favorites.push({ slug: book.slug, title: book.title, overlay: book.overlay, categoryName: book.categoryName, createdAt: new Date().toISOString() }); return { ok: true }; }, signal);
  }
  const favorite = route.match(/^\/api\/favorites\/([^/]+)$/);
  if (favorite && method === 'DELETE') {
    const slug = localSlug(decodeURIComponent(favorite[1]));
    return changeLocalState((state) => { state.favorites = state.favorites.filter((item) => item.slug !== slug); return { ok: true }; }, signal);
  }

  if (route === '/api/notes' && method === 'POST') {
    const { passage, reference } = await passageTarget(body); aborted(signal);
    const note = localText(body.note, '心得', 10000, true);
    return changeLocalState((state) => { const noteId = nextId(state, 'note'); const now = new Date().toISOString(); state.notes.push({ ...reference, id: noteId, note, excerpt: passage.originalText, createdAt: now, updatedAt: now }); return { ok: true, id: noteId }; }, signal);
  }
  const noteRoute = route.match(/^\/api\/notes\/(\d+)$/);
  if (noteRoute && ['PUT', 'DELETE'].includes(method)) {
    const noteId = id(noteRoute[1]); const note = method === 'PUT' ? localText(body.note, '心得', 10000, true) : '';
    if (method === 'PUT' && typeof body.note !== 'string') throw new Error('请提供心得文本，清空时提交空字符串。');
    return changeLocalState((state) => {
      const entry = state.notes.find((item) => item.id === noteId); if (!entry) throw new Error('摘录不存在。');
      if (method === 'DELETE') state.notes = state.notes.filter((item) => item.id !== noteId);
      else { entry.note = note; entry.updatedAt = new Date().toISOString(); }
      return { ok: true };
    }, signal);
  }

  if ((route === '/api/progress' && method === 'PUT') || (route === '/api/history' && method === 'POST')) {
    if (route === '/api/history' && !body.passageSlug) { const book = await getLocalBook(body.scriptureSlug); body.passageSlug = book.passages[0]?.slug; }
    const { book, reference, index } = await passageTarget(body); aborted(signal);
    return changeLocalState((state) => {
      const lastUpdate = state.progress.reduce((latest, entry) => Math.max(latest, Date.parse(entry.updatedAt)), 0);
      const updatedAt = new Date(Math.max(Date.now(), lastUpdate + 1)).toISOString();
      state.progress = state.progress.filter((entry) => entry.scriptureSlug !== book.slug);
      state.progress.push({ ...reference, id: book.id, updatedAt, passageOrder: index + 1, totalPassages: book.passages.length });
      return { ok: true, updatedAt };
    }, signal);
  }
  if (route === '/api/bookmarks' && method === 'POST') {
    const { reference } = await passageTarget(body); aborted(signal);
    return changeLocalState((state) => { const existing = state.bookmarks.find((item) => item.scriptureSlug === reference.scriptureSlug && item.passageSlug === reference.passageSlug); if (existing) return { ok: true, id: existing.id }; const bookmarkId = nextId(state, 'bookmark'); state.bookmarks.push({ ...reference, id: bookmarkId, createdAt: new Date().toISOString() }); return { ok: true, id: bookmarkId }; }, signal);
  }
  const bookmarkRoute = route.match(/^\/api\/bookmarks\/(\d+)$/);
  if (bookmarkRoute && method === 'DELETE') return changeLocalState((state) => { const bookmarkId = id(bookmarkRoute[1]); if (!state.bookmarks.some((item) => item.id === bookmarkId)) throw new Error('书签不存在。'); state.bookmarks = state.bookmarks.filter((item) => item.id !== bookmarkId); return { ok: true }; }, signal);

  if (route === '/api/me/study/plans' && method === 'POST') {
    const book = await getLocalBook(body.scriptureSlug); aborted(signal);
    const dailyMinutes = localNumber(body.dailyMinutes ?? 15, '每日时长', 1, 240);
    return changeLocalState((state) => {
      const existing = state.plans.find((plan) => plan.scriptureSlug === book.slug);
      if (existing) { if (existing.status !== 'archived') throw new Error('这部经典已有自修计划。'); existing.status = 'active'; existing.dailyMinutes = dailyMinutes; return { ok: true, id: existing.id }; }
      const planId = nextId(state, 'plan'); state.plans.push({ id: planId, scriptureSlug: book.slug, scriptureTitle: book.title, dailyMinutes, totalPassages: book.passages.length, status: 'active', createdAt: new Date().toISOString() }); return { ok: true, id: planId };
    }, signal);
  }
  const planRoute = route.match(/^\/api\/me\/study\/plans\/(\d+)$/);
  if (planRoute && ['PATCH', 'DELETE'].includes(method)) return changeLocalState((state) => {
    const plan = state.plans.find((item) => item.id === id(planRoute[1])); if (!plan || plan.status === 'archived') throw new Error('自修计划不存在。');
    if (method === 'DELETE') plan.status = 'archived';
    else {
      if (body.status !== undefined) { if (!['active', 'paused'].includes(body.status as string)) throw new Error('计划状态不正确。'); plan.status = body.status as 'active' | 'paused'; }
      if (body.dailyMinutes !== undefined) plan.dailyMinutes = localNumber(body.dailyMinutes, '每日时长', 1, 240);
    }
    return { ok: true };
  }, signal);
  if (route === '/api/me/study/checkins' && method === 'POST') {
    const planId = localNumber(body.planId, '计划编号');
    const current = await readLocalState(); const plan = current.plans.find((item) => item.id === planId);
    if (!plan || !['active', 'completed'].includes(plan.status)) throw new Error('请先启用自修计划。');
    const { reference, book } = await passageTarget({ scriptureSlug: plan.scriptureSlug, passageSlug: body.passageSlug }); aborted(signal);
    const day = checkinDay(body.date); const minutes = localNumber(body.minutes, '定课时长', 1, 240); const note = localText(body.note, '定课心得', 10000, true);
    return changeLocalState((state) => {
      const target = state.plans.find((item) => item.id === planId && item.scriptureSlug === book.slug);
      if (!target || !['active', 'completed'].includes(target.status)) throw new Error('计划已停用，请刷新后重试。');
      if (!state.logs.some((log) => log.planId === planId && log.date === day)) state.logs.push({ ...reference, id: nextId(state, 'log'), planId, date: day, minutes, note, createdAt: new Date().toISOString() });
      if (new Set(state.logs.filter((log) => log.planId === planId).map((log) => log.passageSlug)).size >= book.passages.length) target.status = 'completed';
      return { ok: true, date: day };
    }, signal);
  }
  throw new Error('本机书斋不支持此操作。');
}
