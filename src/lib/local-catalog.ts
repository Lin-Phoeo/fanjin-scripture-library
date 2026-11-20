import type { CategoryItem, ScriptureDetail, ScriptureSummary } from './api';
import { localSlug } from './local-store';

export type CatalogBook = ScriptureSummary & { passageCount?: number; totalPassages?: number; wordCount?: number };
export type StaticCatalog = { version: number; generatedAt?: string; settings: Record<string, string>; announcements?: { id: number; title: string; detail: string; createdAt: string }[]; categories: CategoryItem[]; books: CatalogBook[] };
export type SearchItem = { scriptureSlug: string; scriptureTitle: string; categorySlug: string; categoryName: string; school?: string; passageSlug: string; passageTitle: string; original: string; plain: string; commentary: string; normalized?: { title?: string; original?: string; plain?: string; commentary?: string; summary?: string } };
type SearchIndex = { version: number; charMap: Record<string, string>; items: SearchItem[] };
let catalogPromise: Promise<StaticCatalog> | undefined;
let searchPromise: Promise<SearchIndex> | undefined;
const books = new Map<string, Promise<ScriptureDetail>>();
const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';

async function asset<T>(path: string): Promise<T> {
  const response = await fetch(`${base.replace(/\/?$/, '/')}content/${path}`, { credentials: 'omit' });
  if (!response.ok) throw new Error('经典资料暂时无法加载，请检查网络后重试。');
  try { return await response.json() as T; }
  catch { throw new Error('经典资料格式不正确，请稍后重试。'); }
}
export async function getLocalCatalog() {
  if (!catalogPromise) catalogPromise = asset<StaticCatalog>('index.json').then((catalog) => {
    if (!catalog || catalog.version !== 1 || !Array.isArray(catalog.books) || !Array.isArray(catalog.categories)) throw new Error('经藏目录版本不正确。');
    return catalog;
  }).catch((error: unknown) => { catalogPromise = undefined; throw error; });
  return catalogPromise;
}
export async function getLocalBook(slugValue: unknown): Promise<ScriptureDetail> {
  const slug = localSlug(slugValue);
  const catalog = await getLocalCatalog();
  if (!catalog.books.some((book) => book.slug === slug && book.publishStatus === 'published')) throw new Error('经典不存在或暂未公开。');
  if (!books.has(slug)) books.set(slug, asset<ScriptureDetail>(`books/${encodeURIComponent(slug)}.json`).then((book) => {
    if (book.slug !== slug || book.publishStatus !== 'published' || !Array.isArray(book.passages)) throw new Error('经典资料版本不一致，请刷新页面。');
    return book;
  }).catch((error: unknown) => { books.delete(slug); throw error; }));
  return books.get(slug)!;
}
export async function getLocalSearch() {
  if (!searchPromise) searchPromise = asset<SearchIndex>('search.json').then((index) => {
    if (!index || index.version !== 1 || !Array.isArray(index.items) || !index.charMap || typeof index.charMap !== 'object') throw new Error('检索资料版本不正确。');
    return index;
  }).catch((error: unknown) => { searchPromise = undefined; throw error; });
  return searchPromise;
}
export function normalizeLocalSearch(text: string, mapping: Record<string, string>) {
  return Array.from(text.normalize('NFKC')).map((character) => mapping[character] ?? character).join('').toLowerCase();
}
export async function searchLocalCatalog(params: URLSearchParams) {
  const query = (params.get('q') || '').trim();
  if (query.length > 100) throw new Error('搜索关键词最多 100 个字符。');
  const scope = params.get('scope') || 'all';
  if (!['all', 'original', 'plain', 'commentary'].includes(scope)) throw new Error('检索范围不正确。');
  const page = Number(params.get('page') || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error('页码不正确。');
  if (!query) return { items: [], total: 0, page, pageSize: 10 };
  const [index, catalog] = await Promise.all([getLocalSearch(), getLocalCatalog()]);
  const published = new Set(catalog.books.filter((book) => book.publishStatus === 'published').map((book) => book.slug));
  const normalized = normalizeLocalSearch(query, index.charMap);
  const category = params.get('category');
  const matched = index.items.filter((item) => published.has(item.scriptureSlug) && (!category || item.categorySlug === category)).flatMap((item) => {
    const fields = scope === 'all' ? ['original', 'plain', 'commentary'] as const : [scope as 'original' | 'plain' | 'commentary'];
    let field = fields.find((key) => normalizeLocalSearch(item[key] || '', index.charMap).includes(normalized));
    const indexedMatch = fields.some((key) => item.normalized?.[key]?.includes(normalized));
    const metadataMatch = scope === 'all' && normalizeLocalSearch(`${item.scriptureTitle} ${item.passageTitle} ${item.normalized?.summary || ''}`, index.charMap).includes(normalized);
    if (!field && !indexedMatch && !metadataMatch) return [];
    field ??= scope === 'all' ? 'original' : scope as 'original' | 'plain' | 'commentary';
    const text = item[field] || '';
    const offset = normalizeLocalSearch(text, index.charMap).indexOf(normalized);
    const start = Math.max(0, offset - 45);
    return [{ scriptureSlug: item.scriptureSlug, scriptureTitle: item.scriptureTitle, categoryName: item.categoryName, passageSlug: item.passageSlug, passageTitle: item.passageTitle, field, excerpt: `${start ? '…' : ''}${text.slice(start, start + 180)}${text.length > start + 180 ? '…' : ''}`, matchText: offset < 0 ? undefined : text.slice(offset, offset + query.length) }];
  });
  return { items: matched.slice((page - 1) * 10, page * 10), total: matched.length, page, pageSize: 10 };
}
