import { apiRequest } from './api';

export type StudyPlan = { id: number; scriptureSlug: string; scriptureTitle: string; dailyMinutes: number; totalPassages: number; completedPassages: number; status: 'active' | 'paused' | 'completed'; createdAt: string };
export type StudyRecord = { id: number; planId: number; date: string; minutes: number; note: string; passageSlug: string; passageTitle: string; scriptureTitle: string };
export type StudyOverview = { plans: StudyPlan[]; checkins: StudyRecord[]; stats: { totalDays: number; currentStreak: number; totalMinutes: number; todayMinutes: number; completedPassages: number } };
export const getStudy = (token: string) => apiRequest<StudyOverview>('/api/me/study', {}, token);
export const createPlan = (scriptureSlug: string, dailyMinutes: number, token: string) => apiRequest<{ ok: boolean; id: number }>('/api/me/study/plans', { method: 'POST', body: JSON.stringify({ scriptureSlug, dailyMinutes }) }, token);
export const updatePlan = (id: number, changes: { status?: 'active' | 'paused'; dailyMinutes?: number }, token: string) => apiRequest<{ ok: boolean }>(`/api/me/study/plans/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }, token);
export const archivePlan = (id: number, token: string) => apiRequest<{ ok: boolean }>(`/api/me/study/plans/${id}`, { method: 'DELETE' }, token);
export const recordStudy = (input: { planId: number; passageSlug: string; minutes: number; note: string; date: string }, token: string) => apiRequest<{ ok: boolean; date: string }>('/api/me/study/checkins', { method: 'POST', body: JSON.stringify(input) }, token);
export const localCalendarDate = (offset = 0) => { const day = new Date(); day.setDate(day.getDate() + offset); return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`; };
