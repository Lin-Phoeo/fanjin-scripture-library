import { useEffect, useRef, useState } from 'react';
import { apiRequest } from './api';
import { errorMessage } from '../components/AsyncFeedback';
export const interestOptions = ['佛家', '道家', '儒家', '诸子'] as const;
export type PersonalPreferences = { interests: string[]; minutes: 5 | 15 | 30; intention: 'quiet' | 'understand' | 'reflect' };
export const defaultPersonalPreferences: PersonalPreferences = { interests: [], minutes: 15, intention: 'quiet' };
export function usePersonalPreferences() {
  const [value, setValue] = useState<PersonalPreferences>(defaultPersonalPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const failedOperation = useRef<'load' | 'save' | 'reset'>('load');
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    pending.current?.abort();
    const current = ++generation.current; setLoading(true); setSaving(false); setDirty(false); setError('');
    void apiRequest<PersonalPreferences | null>('/api/me/preferences').then((result) => { if (current === generation.current) { setValue(result || defaultPersonalPreferences); setDirty(false); } }).catch((reason) => { if (current === generation.current) { failedOperation.current = 'load'; setError(errorMessage(reason)); } }).finally(() => { if (current === generation.current) setLoading(false); });
  }, [revision]);
  useEffect(() => {
    const reload = () => setRevision((current) => current + 1);
    const cancel = () => { generation.current++; pending.current?.abort(); setDirty(false); setSaving(false); };
    window.addEventListener('fanjin-local-data-updated', reload);
    window.addEventListener('fanjin-local-data-changing', cancel);
    return () => { window.removeEventListener('fanjin-local-data-updated', reload); window.removeEventListener('fanjin-local-data-changing', cancel); pending.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!dirty || loading) return;
    const current = generation.current;
    const controller = new AbortController();
    pending.current = controller;
    const timer = window.setTimeout(() => {
      setSaving(true);
      void apiRequest('/api/me/preferences', { method: 'PUT', body: JSON.stringify(value), signal: controller.signal }).then(() => { if (current === generation.current && !controller.signal.aborted) { setDirty(false); setStatus('已保存到此浏览器'); } }).catch((reason) => { if (current === generation.current && !controller.signal.aborted) { failedOperation.current = 'save'; setError(errorMessage(reason)); } }).finally(() => { if (current === generation.current) setSaving(false); });
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [dirty, value, loading, attempt]);
  const update = (changes: Partial<PersonalPreferences>) => { if (loading || saving) return; setValue((current) => ({ ...current, ...changes })); setDirty(true); setStatus(''); setError(''); };
  const reset = async () => {
    pending.current?.abort();
    const current = ++generation.current; setSaving(true); setDirty(false); setError('');
    try { await apiRequest('/api/me/preferences', { method: 'DELETE' }); if (current === generation.current) { setValue(defaultPersonalPreferences); setStatus('已清除此浏览器的阅读偏好'); } }
    catch (reason) { if (current === generation.current) { failedOperation.current = 'reset'; setError(errorMessage(reason)); } }
    finally { if (current === generation.current) setSaving(false); }
  };
  const retry = () => { setError(''); if (failedOperation.current === 'reset') void reset(); else if (failedOperation.current === 'save') setAttempt((current) => current + 1); else setRevision((current) => current + 1); };
  return { value, loading, saving, status, error, update, reset, retry, reload: () => setRevision((current) => current + 1), guestChoice: null };
}
