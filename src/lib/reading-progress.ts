import { apiRequest } from './api';
export type ReadingProgress = { scriptureSlug: string; scriptureTitle: string; passageSlug: string; passageTitle: string; updatedAt: string };
export const latestProgress = () => apiRequest<ReadingProgress | null>('/api/progress/latest');
export const saveProgress = (value: ReadingProgress, token: string, signal?: AbortSignal) => apiRequest('/api/progress', { method: 'PUT', signal, body: JSON.stringify({ scriptureSlug: value.scriptureSlug, passageSlug: value.passageSlug }) }, token);
export const readingUrl = (slug: string, passage: string, query = '') => `/read/${encodeURIComponent(slug)}/${encodeURIComponent(passage)}${query ? `?q=${encodeURIComponent(query)}` : ''}#p-${encodeURIComponent(passage)}`;
