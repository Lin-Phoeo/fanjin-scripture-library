import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';

type SessionUser = { id: number; name: string; role: string; stats?: { favoritesCount: number; notesCount: number } };
export type FavoriteItem = { slug: string; title: string; overlay: string; categoryName: string };
export type SavedNote = { id: number; scriptureSlug: string; scriptureTitle: string; passageSlug: string; passageTitle: string; note: string; excerpt: string; createdAt: string };
type SaveResult = { ok: boolean; message?: string };
type AppStateValue = {
  token: string; session: SessionUser; favorites: FavoriteItem[]; notes: SavedNote[]; loading: boolean; storageError: string;
  refreshUserData: () => Promise<void>;
  toggleFavorite: (scriptureSlug: string) => Promise<void>;
  isFavorite: (scriptureSlug: string) => boolean;
  saveNote: (input: { scriptureSlug: string; passageSlug: string; note: string }) => Promise<SaveResult>;
  removeNote: (noteId: number) => Promise<void>;
};
const AppStateContext = createContext<AppStateValue | null>(null);
const LOCAL_SESSION: SessionUser = { id: 1, name: '本机书斋', role: 'local' };
function AppStateProvider({ children }: PropsWithChildren) {
  const token = 'local-device';
  const [session, setSession] = useState<SessionUser>(LOCAL_SESSION);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState('');
  const generation = useRef(0);
  const refreshUserData = useCallback(async () => {
    const version = ++generation.current;
    const [me, nextFavorites, nextNotes] = await Promise.all([
      apiRequest<SessionUser>('/api/me'), apiRequest<FavoriteItem[]>('/api/favorites'), apiRequest<SavedNote[]>('/api/notes'),
    ]);
    if (generation.current !== version) return;
    setSession({ ...LOCAL_SESSION, ...me, role: 'local' }); setFavorites(nextFavorites); setNotes(nextNotes); setStorageError('');
  }, []);
  useEffect(() => {
    void refreshUserData().catch((error) => setStorageError(error instanceof Error ? error.message : '无法读取本机记录，请检查浏览器存储权限。')).finally(() => setLoading(false));
    const reload = () => { void refreshUserData().catch((error) => setStorageError(error instanceof Error ? error.message : '无法读取本机记录。')); };
    window.addEventListener('fanjin-local-data-updated', reload);
    return () => window.removeEventListener('fanjin-local-data-updated', reload);
  }, [refreshUserData]);
  const toggleFavorite = useCallback(async (slug: string) => {
    if (favorites.some((item) => item.slug === slug)) await apiRequest(`/api/favorites/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    else await apiRequest('/api/favorites', { method: 'POST', body: JSON.stringify({ scriptureSlug: slug }) });
    await refreshUserData();
  }, [favorites, refreshUserData]);
  const isFavorite = useCallback((slug: string) => favorites.some((item) => item.slug === slug), [favorites]);
  const saveNote = useCallback(async (input: { scriptureSlug: string; passageSlug: string; note: string }): Promise<SaveResult> => {
    try { await apiRequest('/api/notes', { method: 'POST', body: JSON.stringify(input) }); await refreshUserData(); return { ok: true }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : '保存摘录失败' }; }
  }, [refreshUserData]);
  const removeNote = useCallback(async (id: number) => { await apiRequest(`/api/notes/${id}`, { method: 'DELETE' }); await refreshUserData(); }, [refreshUserData]);
  const value = useMemo(() => ({ token, session, favorites, notes, loading, storageError, refreshUserData, toggleFavorite, isFavorite, saveNote, removeNote }), [session, favorites, notes, loading, storageError, refreshUserData, toggleFavorite, isFavorite, saveNote, removeNote]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
function useAppState() { const context = useContext(AppStateContext); if (!context) throw new Error('useAppState must be used inside AppStateProvider'); return context; }
export { AppStateProvider, useAppState };
