import { useEffect, useState } from 'react';

const THEME_KEY = 'fanjin:theme';
const ENDFIELD = 'endfield';
const CLASSIC = 'classic';

export type Theme = 'classic' | 'endfield';

function readInitial(): Theme {
  if (typeof window === 'undefined') return CLASSIC;
  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === ENDFIELD ? ENDFIELD : CLASSIC;
}

/**
 * 主题切换：经典纸墨 ↔ 终末地工业编辑风。
 * 通过 <html data-theme> 驱动 CSS 覆盖层，默认 classic，用户选择持久化到 localStorage。
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === ENDFIELD) {
      root.setAttribute('data-theme', ENDFIELD);
    } else {
      root.removeAttribute('data-theme');
    }
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === ENDFIELD ? CLASSIC : ENDFIELD));

  return { theme, toggle };
}
