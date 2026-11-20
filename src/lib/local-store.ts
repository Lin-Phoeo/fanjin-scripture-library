export type LocalReference = { scriptureSlug: string; scriptureTitle: string; passageSlug: string; passageTitle: string };
export type LocalFavorite = { slug: string; title: string; overlay: string; categoryName: string; createdAt: string };
export type LocalNote = LocalReference & { id: number; note: string; excerpt: string; createdAt: string; updatedAt: string };
export type LocalProgress = LocalReference & { id: number; updatedAt: string; passageOrder: number; totalPassages: number };
export type LocalBookmark = LocalReference & { id: number; createdAt: string };
export type LocalPlan = { id: number; scriptureSlug: string; scriptureTitle: string; dailyMinutes: number; totalPassages: number; status: 'active' | 'paused' | 'completed' | 'archived'; createdAt: string };
export type LocalLog = LocalReference & { id: number; planId: number; date: string; minutes: number; note: string; createdAt: string };
export type LocalPreferences = { interests: string[]; minutes: 5 | 15 | 30; intention: 'quiet' | 'understand' | 'reflect' };
export type LocalState = {
  version: 1; profile: { name: string }; favorites: LocalFavorite[]; notes: LocalNote[];
  progress: LocalProgress[]; bookmarks: LocalBookmark[]; plans: LocalPlan[]; logs: LocalLog[];
  preferences: LocalPreferences | null; counters: { note: number; bookmark: number; plan: number; log: number };
};
export type LocalBackup = { format: 'fanjin-local-backup'; version: 1; exportedAt: string; data: LocalState };
export const MAX_LOCAL_DATA_BYTES = 19_000_000;
export const MAX_LOCAL_BACKUP_BYTES = 20_000_000;
function checkSize(value: unknown, limit: number, message: string) {
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > limit) throw new Error(message);
}

export function emptyLocalState(): LocalState {
  return { version: 1, profile: { name: '我的书斋' }, favorites: [], notes: [], progress: [], bookmarks: [], plans: [], logs: [], preferences: null, counters: { note: 0, bookmark: 0, plan: 0, log: 0 } };
}

const databaseName = 'fanjin-local-v1';
const changeSignalKey = 'fanjin-local-data-signal';
const contextId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const seenSignals = new Set<string>();
let channel: BroadcastChannel | undefined;
function receiveChange(value: unknown) {
  if (typeof window === 'undefined' || !value || typeof value !== 'object') return;
  const event = value as { sender?: unknown; id?: unknown; phase?: unknown };
  if (event.sender === contextId || typeof event.id !== 'string' || seenSignals.has(event.id) || !['changing', 'updated'].includes(event.phase as string)) return;
  seenSignals.add(event.id);
  if (seenSignals.size > 100) seenSignals.delete(seenSignals.values().next().value!);
  window.dispatchEvent(new Event(event.phase === 'changing' ? 'fanjin-local-data-changing' : 'fanjin-local-data-updated'));
}
if (typeof window !== 'undefined') {
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('fanjin-local-data');
    channel.onmessage = (event) => receiveChange(event.data);
  }
  window.addEventListener('storage', (event) => {
    if (event.key !== changeSignalKey || !event.newValue) return;
    try { receiveChange(JSON.parse(event.newValue)); } catch { /* Ignore malformed cross-tab markers. */ }
  });
}
function announceReplacement(phase: 'changing' | 'updated') {
  const event = { sender: contextId, id: `${contextId}:${Date.now()}:${Math.random()}`, phase };
  channel?.postMessage(event);
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(changeSignalKey, JSON.stringify(event)); } catch { /* BroadcastChannel still works when localStorage is unavailable. */ }
  }
}
let connection: Promise<IDBDatabase> | undefined;
function openDatabase(): Promise<IDBDatabase> {
  if (connection) return connection;
  connection = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('此浏览器无法使用本机书斋存储。请允许网站保存数据后重试。')); return; }
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('app')) request.result.createObjectStore('app'); };
    request.onerror = () => reject(new Error('无法打开本机书斋存储。请检查浏览器隐私设置或磁盘空间。'));
    request.onblocked = () => reject(new Error('本机书斋正在升级，请关闭此网站的其他标签后重试。'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
  }).catch((error: unknown) => { connection = undefined; throw error; });
  return connection;
}

function storageError(error: DOMException | null) {
  return new Error(error?.name === 'QuotaExceededError'
    ? '本机存储空间不足，修改尚未保存。请先导出备份并释放空间。'
    : '本机数据保存失败，原有记录未被替换。请检查浏览器存储设置后重试。');
}

export async function readLocalState(): Promise<LocalState> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('app', 'readonly');
    const request = transaction.objectStore('app').get('state');
    request.onsuccess = () => {
      try { resolve(request.result === undefined ? emptyLocalState() : validateLocalState(request.result)); }
      catch { reject(new Error('本机书斋记录格式异常，未覆盖原数据。请保留此浏览器数据并联系维护者。')); }
    };
    transaction.onerror = () => reject(storageError(transaction.error));
    transaction.onabort = () => reject(storageError(transaction.error));
  });
}

export async function readLocalEpoch(): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('app', 'readonly');
    const request = transaction.objectStore('app').get('replacement-epoch');
    request.onsuccess = () => resolve(typeof request.result === 'number' ? request.result : 0);
    transaction.onerror = () => reject(storageError(transaction.error));
    transaction.onabort = () => reject(storageError(transaction.error));
  });
}

/** The callback is synchronous: IndexedDB holds the write lock across read, change and commit. */
export async function changeLocalState<T>(change: (state: LocalState) => T, signal?: AbortSignal | null, expectedEpoch?: number): Promise<T> {
  if (signal?.aborted) throw new DOMException('操作已取消', 'AbortError');
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('操作已取消', 'AbortError')); return; }
    const transaction = db.transaction('app', 'readwrite');
    const store = transaction.objectStore('app');
    const epochRequest = store.get('replacement-epoch');
    let result: T;
    let cause: unknown;
    const abort = () => { cause = new DOMException('操作已取消', 'AbortError'); try { transaction.abort(); } catch { /* Commit has already finished. */ } };
    signal?.addEventListener('abort', abort, { once: true });
    epochRequest.onsuccess = () => {
      if (expectedEpoch !== undefined && (epochRequest.result ?? 0) !== expectedEpoch) {
        cause = new DOMException('本机数据已替换，请刷新后重试。', 'AbortError'); transaction.abort(); return;
      }
      const request = store.get('state');
      request.onsuccess = () => {
      try {
        const state = request.result === undefined ? emptyLocalState() : validateLocalState(request.result);
        result = change(state);
        if (signal?.aborted) { cause ??= new DOMException('操作已取消', 'AbortError'); return; }
        store.put(validateLocalState(state), 'state');
      } catch (error) { cause ??= error; try { transaction.abort(); } catch { /* An abort signal already ended the transaction. */ } }
      };
    };
    transaction.oncomplete = () => { signal?.removeEventListener('abort', abort); resolve(result); };
    transaction.onerror = () => { cause ??= storageError(transaction.error); };
    transaction.onabort = () => { signal?.removeEventListener('abort', abort); reject(cause ?? storageError(transaction.error)); };
  });
}

export async function replaceLocalState(next: LocalState, signal?: AbortSignal | null) {
  const validated = validateLocalState(next);
  if (signal?.aborted) throw new DOMException('操作已取消', 'AbortError');
  const db = await openDatabase();
  announceReplacement('changing');
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('操作已取消', 'AbortError')); return; }
    const transaction = db.transaction('app', 'readwrite');
    let cause: unknown;
    const abort = () => { cause = new DOMException('操作已取消', 'AbortError'); try { transaction.abort(); } catch { /* Already committed. */ } };
    signal?.addEventListener('abort', abort, { once: true });
    const store = transaction.objectStore('app');
    const epochRequest = store.get('replacement-epoch');
    epochRequest.onsuccess = () => {
      if (signal?.aborted) return;
      store.put(validated, 'state');
      store.put((typeof epochRequest.result === 'number' ? epochRequest.result : 0) + 1, 'replacement-epoch');
    };
    transaction.oncomplete = () => { signal?.removeEventListener('abort', abort); announceReplacement('updated'); resolve(); };
    transaction.onerror = () => { cause ??= storageError(transaction.error); };
    transaction.onabort = () => { signal?.removeEventListener('abort', abort); announceReplacement('updated'); reject(cause ?? storageError(transaction.error)); };
  });
}

export function record(value: unknown, label = '数据'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}格式不正确。`);
  return value as Record<string, unknown>;
}
export function localText(value: unknown, label: string, max: number, optional = false): string {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) throw new Error(`${label}格式或长度不正确。`);
  return value;
}
export function localSlug(value: unknown): string {
  const slug = localText(value, '经典或段落标识', 100);
  if (!/^[a-z0-9]+(?:-{1,2}[a-z0-9]+)*$/.test(slug)) throw new Error('经典或段落标识不正确。');
  return slug;
}
export function localNumber(value: unknown, label: string, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${label}不正确。`);
  return value;
}
function date(value: unknown): string {
  const result = localText(value, '记录时间', 64);
  if (!Number.isFinite(Date.parse(result))) throw new Error('记录时间不正确。');
  return result;
}
export function validLocalDay(value: unknown): string {
  const result = localText(value, '定课日期', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(`${result}T00:00:00Z`)) || new Date(`${result}T00:00:00Z`).toISOString().slice(0, 10) !== result) throw new Error('定课日期不正确。');
  return result;
}
function list<T>(value: unknown, parse: (item: Record<string, unknown>) => T, key: (item: T) => string | number): T[] {
  if (!Array.isArray(value) || value.length > 100000) throw new Error('备份记录数量或格式不正确。');
  const results = value.map((item) => parse(record(item)));
  if (new Set(results.map(key)).size !== results.length) throw new Error('备份含有重复记录，未导入。');
  return results;
}
function reference(value: Record<string, unknown>): LocalReference {
  return { scriptureSlug: localSlug(value.scriptureSlug), scriptureTitle: localText(value.scriptureTitle, '经典名称', 200), passageSlug: localSlug(value.passageSlug), passageTitle: localText(value.passageTitle, '段落名称', 200) };
}
export function validateLocalPreferences(value: unknown): LocalPreferences {
  const p = record(value, '阅读偏好');
  if (!Array.isArray(p.interests) || p.interests.length > 4 || p.interests.some((interest) => !['佛家', '道家', '儒家', '诸子'].includes(interest))) throw new Error('阅读兴趣不正确。');
  if (![5, 15, 30].includes(p.minutes as number) || !['quiet', 'understand', 'reflect'].includes(p.intention as string)) throw new Error('阅读偏好不正确。');
  return { interests: [...new Set(p.interests as string[])], minutes: p.minutes as LocalPreferences['minutes'], intention: p.intention as LocalPreferences['intention'] };
}
export function validateLocalState(value: unknown): LocalState {
  const data = record(value, '书斋备份');
  if (data.version !== 1) throw new Error('不支持此版本的书斋备份。');
  const state = emptyLocalState();
  state.profile = { name: localText(record(data.profile).name, '书斋名称', 40).trim() };
  state.favorites = list(data.favorites, (v) => ({ slug: localSlug(v.slug), title: localText(v.title, '经典名称', 200), overlay: localText(v.overlay, '对照说明', 2000, true), categoryName: localText(v.categoryName, '分类', 100), createdAt: date(v.createdAt) }), (v) => v.slug);
  state.notes = list(data.notes, (v) => ({ ...reference(v), id: localNumber(v.id, '摘录编号'), note: localText(v.note, '心得', 10000, true), excerpt: localText(v.excerpt, '原文快照', 100000), createdAt: date(v.createdAt), updatedAt: date(v.updatedAt) }), (v) => v.id);
  state.progress = list(data.progress, (v) => ({ ...reference(v), id: localNumber(v.id, '进度编号'), updatedAt: date(v.updatedAt), passageOrder: localNumber(v.passageOrder, '段落顺序', 1, 100000), totalPassages: localNumber(v.totalPassages, '段落总数', 1, 100000) }), (v) => v.scriptureSlug);
  state.bookmarks = list(data.bookmarks, (v) => ({ ...reference(v), id: localNumber(v.id, '书签编号'), createdAt: date(v.createdAt) }), (v) => v.id);
  if (new Set(state.bookmarks.map((v) => `${v.scriptureSlug}/${v.passageSlug}`)).size !== state.bookmarks.length) throw new Error('备份含重复书签。');
  state.plans = list(data.plans, (v) => {
    if (!['active', 'paused', 'completed', 'archived'].includes(v.status as string)) throw new Error('计划状态不正确。');
    return { id: localNumber(v.id, '计划编号'), scriptureSlug: localSlug(v.scriptureSlug), scriptureTitle: localText(v.scriptureTitle, '经典名称', 200), dailyMinutes: localNumber(v.dailyMinutes, '每日时长', 1, 240), totalPassages: localNumber(v.totalPassages, '段落总数', 1, 100000), status: v.status as LocalPlan['status'], createdAt: date(v.createdAt) };
  }, (v) => v.id);
  if (new Set(state.plans.map((v) => v.scriptureSlug)).size !== state.plans.length) throw new Error('备份含重复计划。');
  state.logs = list(data.logs, (v) => ({ ...reference(v), id: localNumber(v.id, '定课编号'), planId: localNumber(v.planId, '计划编号'), date: validLocalDay(v.date), minutes: localNumber(v.minutes, '定课时长', 1, 240), note: localText(v.note, '定课心得', 10000, true), createdAt: date(v.createdAt) }), (v) => v.id);
  const plans = new Map(state.plans.map((p) => [p.id, p]));
  if (state.logs.some((log) => plans.get(log.planId)?.scriptureSlug !== log.scriptureSlug)) throw new Error('备份定课缺少对应计划。');
  if (new Set(state.logs.map((log) => `${log.planId}/${log.date}`)).size !== state.logs.length) throw new Error('备份含同日重复定课。');
  state.preferences = data.preferences === null ? null : validateLocalPreferences(data.preferences);
  const counters = record(data.counters);
  for (const [kind, rows] of [['note', state.notes], ['bookmark', state.bookmarks], ['plan', state.plans], ['log', state.logs]] as const) {
    const maximum = rows.reduce((max, row) => Math.max(max, row.id), 0);
    state.counters[kind] = Math.max(maximum, localNumber(counters[kind], '记录计数', 0));
  }
  checkSize(state, MAX_LOCAL_DATA_BYTES, '本机书斋数据超过 19 MB，修改未保存。请先导出备份并整理部分记录。');
  return state;
}
export function validateLocalBackup(value: unknown): LocalState {
  const backup = record(value, '备份');
  if (backup.format !== 'fanjin-local-backup' || backup.version !== 1) throw new Error('请选择梵烬导出的版本 1 本机备份。');
  date(backup.exportedAt);
  checkSize(backup, MAX_LOCAL_BACKUP_BYTES, '备份超过 20 MB，请使用较小的梵烬备份文件。');
  return validateLocalState(backup.data);
}
