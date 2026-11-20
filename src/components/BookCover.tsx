import { useI18n } from '../lib/i18n';
const colors: Record<string, string> = {
  'heart-sutra': 'pine', 'qingjing-jing': 'stone', 'dao-de-jing-selected': 'sage',
  daxue: 'clay', zhongyong: 'sand', lunyu: 'ink',
};
const titles: Record<string, string> = {
  'heart-sutra': '心经', 'qingjing-jing': '清静经', 'dao-de-jing-selected': '道德经',
  daxue: '大学', zhongyong: '中庸', lunyu: '论语',
};
export default function BookCover({ slug, title, compact = false }: { slug: string; title: string; compact?: boolean }) {
  const { t, displayText } = useI18n();
  const fullTitle = displayText(titles[slug] || title);
  const characters = Array.from(fullTitle);
  const shortTitle = characters.length > 8 ? characters.slice(0, 7).join('') + '…' : fullTitle;
  return <div className={`book-cover cover-${colors[slug] || 'pine'}${compact ? ' is-compact' : ''}`} aria-hidden="true"><span className={`cover-title${characters.length > 4 ? ' is-long' : ''}`}>{shortTitle}</span><span className="cover-imprint">{t("梵烬 · 原典")}</span></div>;
}
