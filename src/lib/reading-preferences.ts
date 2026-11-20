import { useState } from 'react';

export type ReadingPreferences = {
  theme: 'paper' | 'sepia' | 'dark';
  fontSize: 16 | 17 | 18 | 20 | 23;
  lineHeight: 1.85 | 1.9 | 1.95;
  script: 'sc' | 'tc';
  commentary: boolean;
  guide: boolean;
};
const key = 'fanjin-reading-preferences-v1';
export function readPreferences(): ReadingPreferences {
  const defaults: ReadingPreferences = { theme: 'paper', fontSize: typeof window !== 'undefined' && window.innerWidth < 740 ? 17 : 18, lineHeight: 1.9, script: 'sc', commentary: true, guide: false };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return {
      theme: ['paper', 'sepia', 'dark'].includes(saved.theme) ? saved.theme : defaults.theme,
      fontSize: [16, 17, 18, 20, 23].includes(saved.fontSize) ? saved.fontSize : defaults.fontSize,
      lineHeight: [1.85, 1.9, 1.95].includes(saved.lineHeight) ? saved.lineHeight : defaults.lineHeight,
      script: saved.script === 'tc' ? 'tc' : 'sc',
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
