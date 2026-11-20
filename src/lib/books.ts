import { apiRequest, type ScriptureSummary, type ScripturePassage } from './api';

export type BookMetadata = { school?: string; tags?: string[]; edition?: string; sourceName?: string; sourceUrl?: string; license?: string; licenseUrl?: string; isExcerpt?: boolean; wordCount?: number; sourceVerified?: boolean; licenseStatus?: string; attribution?: string; sourceNote?: string; sourceHeader?: string };
export type BookPassage = ScripturePassage & { contentTc?: string | null; contentSc?: string | null; classicalCommentary?: string | null; commentarySource?: string | null; modernGuide?: string | null };
export type BookDetail = ScriptureSummary & BookMetadata & { passages: BookPassage[] };
export const getBook = (slug: string, draft = false, token?: string | null) => apiRequest<BookDetail>(`${draft ? '/api/admin/scriptures/' : '/api/scriptures/'}${encodeURIComponent(slug)}`, {}, token);
export function safeExternalUrl(value?: string) { try { const url = new URL(value || ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; } }
