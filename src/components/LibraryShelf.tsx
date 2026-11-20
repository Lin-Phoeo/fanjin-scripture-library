import { useI18n } from '../lib/i18n';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import type { ScriptureSummary } from '../lib/api';
import BookCover from './BookCover';
import Icon from './Icon';
import { ErrorNotice, errorMessage } from './AsyncFeedback';

export type ShelfTitle = ScriptureSummary & { wordCount?: number; passageCount?: number };
export const bookDescriptions: Record<string, string> = {
  'heart-sutra': '般若经典，短篇通读。', 'qingjing-jing': '静观与清静的修读。',
  'dao-de-jing-selected': '关于道、无为与知止。', daxue: '从修身出发。', zhongyong: '中和、诚与慎独。', lunyu: '孔子与弟子的言行。',
};
export function wordCountLabel(count?: number) {
  if (!count) return '';
  return count >= 10000 ? `${(count / 10000).toFixed(1)} 万字` : `${count.toLocaleString('zh-CN')} 字`;
}
export default function LibraryShelf({ books, layout = 'grid' }: { books: ShelfTitle[]; layout?: 'grid' | 'list' }) {
  const { t, displayText } = useI18n();

  const { isFavorite, toggleFavorite } = useAppState();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  return <><ErrorNotice message={message} /><div className={`catalog-shelf is-${layout}`}>
    {books.map(book => <article className="catalog-volume" key={book.slug}>
      <Link className="volume-cover-link" to={`/read/${encodeURIComponent(book.slug)}`} aria-label={t(`阅读${book.title}`)}><BookCover slug={book.slug} title={book.title} /></Link>
      <div className="volume-description"><Link to={`/book/${encodeURIComponent(book.slug)}`} className="volume-title"><h2>{displayText(book.title)}</h2></Link>
        <p className="volume-meta">{displayText(book.school) || displayText(book.categoryName)}<span>·</span>{book.isExcerpt ? t('节选') : t('全本')}{book.wordCount ? <><span>·</span>{t(wordCountLabel(book.wordCount))}</> : null}</p>
        <p className="volume-summary">{displayText(bookDescriptions[book.slug] || book.role || book.summary)}</p>
        <div className="volume-actions"><Link className="button-quiet" to={`/read/${encodeURIComponent(book.slug)}`}>{t("开始阅读")}<Icon name="arrow" size={16} /></Link>
          <button className={`icon-button${isFavorite(book.slug) ? ' is-active' : ''}`} type="button" aria-label={t(`${isFavorite(book.slug) ? '取消收藏' : '收藏'}${book.title}`)} aria-pressed={isFavorite(book.slug)} disabled={!!busy} onClick={() => { setBusy(book.slug); setMessage(''); void toggleFavorite(book.slug).catch(reason => setMessage(errorMessage(reason))).finally(() => setBusy('')); }}><Icon name="bookmark" size={18} /></button>
        </div>
      </div>
    </article>)}
  </div></>;
}
