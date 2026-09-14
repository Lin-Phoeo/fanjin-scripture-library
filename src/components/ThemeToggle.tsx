import { useTheme } from '../lib/useTheme';

/**
 * 主题切换悬浮钮：终末地工业风的小胶囊，带 [ ] 角括号母题。
 * 固定在右下角，不干扰正文阅读。
 */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'endfield' ? '切换为经典纸墨主题' : '切换为终末地工业主题'}
      title={theme === 'endfield' ? '切换到经典纸墨主题' : '切换到终末地工业主题'}
    >
      <span className="theme-toggle__bracket">[</span>
      <span className="theme-toggle__label">
        {theme === 'endfield' ? '终末地' : '经典'}
      </span>
      <span className="theme-toggle__bracket">]</span>
    </button>
  );
}
