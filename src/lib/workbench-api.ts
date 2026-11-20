import { apiRequest } from './api';
export type ShelfBook = { slug: string; title: string; school: string; edition: string; publishStatus: string; isExcerpt: boolean; categoryName: string; progressAt: string | null; passageSlug: string | null; passageTitle: string | null; passageOrder: number | null; savedAt: string | null; favorite: boolean; totalPassages: number; notesCount: number; bookmarksCount: number; planStatus: string | null; dailyMinutes: number | null };
export type Bookmark = { id: number; createdAt: string; scriptureSlug: string; scriptureTitle: string; passageSlug: string; passageTitle: string };
export const getLibrary = (token: string) => apiRequest<{ items: ShelfBook[] }>('/api/me/library', {}, token);
export const getBookmarks = (scriptureSlug: string, token: string) => apiRequest<Bookmark[]>(`/api/bookmarks?scriptureSlug=${encodeURIComponent(scriptureSlug)}`, {}, token);
export const addBookmark = (scriptureSlug: string, passageSlug: string, token: string) => apiRequest('/api/bookmarks', { method: 'POST', body: JSON.stringify({ scriptureSlug, passageSlug }) }, token);
export const deleteBookmark = (id: number, token: string) => apiRequest(`/api/bookmarks/${id}`, { method: 'DELETE' }, token);
