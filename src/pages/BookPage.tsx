import { Link, useParams } from 'react-router-dom';
import { ErrorNotice } from '../components/AsyncFeedback';
import { getBook, safeExternalUrl } from '../lib/books';
import { readingUrl } from '../lib/reading-progress';
import { useResource } from '../lib/useResource';

export default function BookPage() {
  const { slug = '' } = useParams();
  const { data: book, loading, error, reload } = useResource(() => getBook(slug), [slug]);
  if (loading) return <main className="content-page"><p role="status">正在打开经典介绍…</p></main>;
  if (!book || error) return <main className="content-page"><h1>暂时无法打开这部经典</h1><ErrorNotice message={error || '经典不存在或尚未公开。'} retry={reload} /><Link className="quiet-link" to="/library">返回经藏</Link></main>;
  const source = safeExternalUrl(book.sourceUrl);
  const licenseUrl = safeExternalUrl(book.licenseUrl);
  return <main className="content-page book-detail-page"><nav className="book-breadcrumb"><Link to="/library">经藏目录</Link><span>/</span><span>{book.categoryName}</span></nav><header className="book-detail-header"><p className="reading-meta">{book.school || book.categoryName} · {book.isExcerpt ? '节选收录' : book.isExcerpt === false ? '全本收录' : '篇幅待核验'}</p><h1>{book.title}</h1><p>{book.dynasty} · {book.translator}</p><p>{book.summary}</p><div className="card-actions">{book.passages[0] ? <Link className="ink-button" to={readingUrl(book.slug, book.passages[0].slug)}>开始阅读 →</Link> : null}<Link className="quiet-link" to={`/study?scripture=${encodeURIComponent(book.slug)}`}>加入个人功课 ↗</Link></div></header>
    <section className="edition-panel" aria-labelledby="edition-heading"><h2 id="edition-heading">版本、来源与使用说明</h2><p className="source-status">{book.sourceVerified ? '来源信息已核验' : '来源与许可尚待人工核验，请勿将收录视为转载授权。'}</p><dl><div><dt>所用底本</dt><dd>{book.edition || '尚未登记底本，内容版本待核验。'}</dd></div><div><dt>数字文本来源</dt><dd>{book.sourceName || '尚未登记数字来源。'} {source ? <a href={source} target="_blank" rel="noreferrer">查看原始来源 ↗</a> : null}</dd></div><div><dt>许可与转载范围</dt><dd>{book.license || '当前文本尚无可核验的许可声明，请勿据此推定可转载。'} {licenseUrl ? <a href={licenseUrl} target="_blank" rel="noreferrer">查看许可原文 ↗</a> : null}</dd></div>{book.attribution ? <div><dt>署名要求</dt><dd>{book.attribution}</dd></div> : null}{book.sourceNote ? <div><dt>整理说明</dt><dd>{book.sourceNote}</dd></div> : null}<div><dt>篇幅</dt><dd>{book.isExcerpt ? '本页收录的是节选，请结合完整底本阅读。' : book.isExcerpt === false ? '全本收录。' : '篇幅范围待核验。'} 共 {book.passages.length} 节{book.wordCount ? `，约 ${book.wordCount.toLocaleString('zh-CN')} 字` : ''}。</dd></div></dl><p className="form-footnote">古代作者与当前数字文本整理者的权利不同；具体转载范围以本版本的来源与许可为准。古注与现代导读分别展示。</p></section>
    {book.sourceHeader ? <details className="source-header"><summary>原始出版声明</summary><p><a href={`${import.meta.env.BASE_URL}content-notices.txt`} target="_blank" rel="noreferrer">内容来源与转载说明</a>{book.slug === 'heart-sutra' ? <> · <a href={`${import.meta.env.BASE_URL}content-sources/heart-sutra-T08n0251.xml`} target="_blank" rel="noreferrer">心经原始 XML</a></> : null}</p><pre>{book.sourceHeader}</pre></details> : null}<section className="book-toc"><div className="reading-section-heading"><h2>篇章目录</h2><span className="reading-meta">{book.passages.length} 节</span></div>{book.passages.map((passage, index) => <Link key={passage.slug} to={readingUrl(book.slug, passage.slug)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{passage.title}</strong><span aria-hidden="true">→</span></Link>)}</section>
  </main>;
}
