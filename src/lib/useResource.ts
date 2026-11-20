import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { errorMessage } from '../components/AsyncFeedback';

type ResourceState<T> = { key: string; data: T | null; loading: boolean; error: string };
export function useResource<T>(loader: () => Promise<T>, dependencies: DependencyList = []) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const key = JSON.stringify(dependencies);
  const [state, setState] = useState<ResourceState<T>>({ key, data: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const reload = () => setRevision((value) => value + 1);
    window.addEventListener('fanjin-local-data-updated', reload);
    return () => window.removeEventListener('fanjin-local-data-updated', reload);
  }, []);
  useEffect(() => {
    let active = true;
    setState({ key, data: null, loading: true, error: '' });
    void loaderRef.current().then((data) => {
      if (active) setState({ key, data, loading: false, error: '' });
    }).catch((reason: unknown) => {
      if (active) setState({ key, data: null, loading: false, error: errorMessage(reason) });
    });
    return () => { active = false; };
  }, [key, revision]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const current = state.key === key ? state : { key, data: null, loading: true, error: '' };
  return { data: current.data, loading: current.loading, error: current.error, reload };
}
