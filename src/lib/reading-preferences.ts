import { useEffect, useState } from 'react';
import { preferredUiScript, READING_SCRIPT_EVENT } from './i18n';

export type ReadingPreferences = {
  theme: 'paper' | 'sepia' | 'dark';
  fontSize: 16 | 17 | 18 | 20 | 23;
  lineHeight: 1.85 | 1.9 | 1.95;
  script: 'original' | 'sc' | 'tc';
  commentary: boolean;
  guide: boolean;
};
const key = 'fanjin-reading-preferences-v1';
export function readPreferences(): ReadingPreferences {
  const defaults: ReadingPreferences = { theme: 'paper', fontSize: typeof window !== 'undefined' && window.innerWidth < 740 ? 17 : 18, lineHeight: 1.9, script: preferredUiScript(), commentary: true, guide: false };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return {
      theme: ['paper', 'sepia', 'dark'].includes(saved.theme) ? saved.theme : defaults.theme,
      fontSize: [16, 17, 18, 20, 23].includes(saved.fontSize) ? saved.fontSize : defaults.fontSize,
      lineHeight: [1.85, 1.9, 1.95].includes(saved.lineHeight) ? saved.lineHeight : defaults.lineHeight,
      script: ['original', 'sc', 'tc'].includes(saved.script) ? saved.script : defaults.script,
      commentary: typeof saved.commentary === 'boolean' ? saved.commentary : defaults.commentary,
      guide: typeof saved.guide === 'boolean' ? saved.guide : defaults.guide,
    };
  } catch { return defaults; }
}
export function applyTheme(theme: ReadingPreferences['theme']) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}
export function useReadingPreferences() {
  const [preferences, setPreferences] = useState(readPreferences);
  useEffect(() => {
    const synchronize = (event: Event) => { const script = (event as CustomEvent<'sc' | 'tc'>).detail; if (script === 'sc' || script === 'tc') setPreferences((current) => ({ ...current, script })); };
    window.addEventListener(READING_SCRIPT_EVENT, synchronize);
    return () => window.removeEventListener(READING_SCRIPT_EVENT, synchronize);
  }, []);
  const update = (changes: Partial<ReadingPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...changes };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Reading stays available when storage is full or disabled. */ }
      applyTheme(next.theme);
      return next;
    });
  };
  return [preferences, update] as const;
}
