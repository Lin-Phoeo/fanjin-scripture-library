import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type SessionUser = {
  id: number;
  name: string;
  role: string;
  stats?: {
    favoritesCount: number;
    notesCount: number;
  };
};

export type FavoriteItem = {
  slug: string;
  title: string;
  overlay: string;
  categoryName: string;
};

export type SavedNote = {
  id: number;
  scriptureSlug: string;
  scriptureTitle: string;
  passageSlug: string;
  passageTitle: string;
  note: string;
  excerpt: string;
  createdAt: string;
};

type AppStateValue = {
  token: string | null;
  session: SessionUser | null;
  favorites: FavoriteItem[];
  notes: SavedNote[];
  loading: boolean;
  signIn: (name: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signUp: (name: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => void;
  refreshUserData: () => Promise<void>;
  toggleFavorite: (scriptureSlug: string) => Promise<void>;
  isFavorite: (scriptureSlug: string) => boolean;
  saveNote: (input: {
    scriptureSlug: string;
    passageSlug: string;
    note: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  removeNote: (noteId: number) => Promise<void>;
};

const STORAGE_KEY = 'fanjin-auth-token';
const AppStateContext = createContext<AppStateValue | null>(null);

async function apiFetch<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? '请求失败');
  }

  return response.json() as Promise<T>;
}

function AppStateProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUserData = useCallback(async () => {
    if (!token) {
      setSession(null);
      setFavorites([]);
      setNotes([]);
      return;
    }

    const [me, nextFavorites, nextNotes] = await Promise.all([
      apiFetch<SessionUser>('/api/me', {}, token),
      apiFetch<FavoriteItem[]>('/api/favorites', {}, token),
      apiFetch<SavedNote[]>('/api/notes', {}, token),
    ]);

    setSession(me);
    setFavorites(nextFavorites);
    setNotes(nextNotes);
  }, [token]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(STORAGE_KEY);
    if (!savedToken) {
      setLoading(false);
      return;
    }

    setToken(savedToken);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await refreshUserData();
      } catch {
        if (!cancelled) {
          window.localStorage.removeItem(STORAGE_KEY);
          setToken(null);
          setSession(null);
          setFavorites([]);
          setNotes([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [refreshUserData, token]);

  const signIn = useCallback(async (name: string, password: string) => {
    try {
      const result = await apiFetch<{ token: string; user: SessionUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name, password }),
      });

      window.localStorage.setItem(STORAGE_KEY, result.token);
      setToken(result.token);
      setSession(result.user);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '登录失败' };
    }
  }, []);

  const signUp = useCallback(async (name: string, password: string) => {
    try {
      const result = await apiFetch<{ token: string; user: SessionUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, password }),
      });

      window.localStorage.setItem(STORAGE_KEY, result.token);
      setToken(result.token);
      setSession(result.user);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '注册失败' };
    }
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setSession(null);
    setFavorites([]);
    setNotes([]);
  }, []);

  const toggleFavorite = useCallback(
    async (scriptureSlug: string) => {
      if (!token) {
        throw new Error('请先登录后再收藏经典。');
      }

      if (favorites.some((item) => item.slug === scriptureSlug)) {
        await apiFetch<{ ok: boolean }>(`/api/favorites/${scriptureSlug}`, { method: 'DELETE' }, token);
      } else {
        await apiFetch<{ ok: boolean }>(
          '/api/favorites',
          {
            method: 'POST',
            body: JSON.stringify({ scriptureSlug }),
          },
          token,
        );
      }

      const nextFavorites = await apiFetch<FavoriteItem[]>('/api/favorites', {}, token);
      setFavorites(nextFavorites);
    },
    [favorites, token],
  );

  const isFavorite = useCallback(
    (scriptureSlug: string) => favorites.some((item) => item.slug === scriptureSlug),
    [favorites],
  );

  const saveNote = useCallback(
    async (input: { scriptureSlug: string; passageSlug: string; note: string }) => {
      if (!token) {
        return { ok: false, message: '请先登录后再保存摘录。' };
      }

      try {
        await apiFetch<{ ok: boolean }>(
          '/api/notes',
          {
            method: 'POST',
            body: JSON.stringify(input),
          },
          token,
        );

        const nextNotes = await apiFetch<SavedNote[]>('/api/notes', {}, token);
        setNotes(nextNotes);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : '保存摘录失败' };
      }
    },
    [token],
  );

  const removeNote = useCallback(
    async (noteId: number) => {
      if (!token) {
        return;
      }

      await apiFetch<{ ok: boolean }>(`/api/notes/${noteId}`, { method: 'DELETE' }, token);
      const nextNotes = await apiFetch<SavedNote[]>('/api/notes', {}, token);
      setNotes(nextNotes);
    },
    [token],
  );

  const value = useMemo<AppStateValue>(
    () => ({
      token,
      session,
      favorites,
      notes,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUserData,
      toggleFavorite,
      isFavorite,
      saveNote,
      removeNote,
    }),
    [
      favorites,
      isFavorite,
      loading,
      notes,
      refreshUserData,
      removeNote,
      saveNote,
      session,
      signIn,
      signUp,
      signOut,
      token,
      toggleFavorite,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }

  return context;
}

export { AppStateProvider, useAppState };
