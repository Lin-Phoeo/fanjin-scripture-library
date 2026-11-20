import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorNotice, errorMessage } from '../components/AsyncFeedback';
import { useAppState } from '../context/AppStateContext';
import { getCategories, getScriptures, type ScriptureSummary } from '../lib/api';
import type { BookMetadata } from '../lib/books';
import { useResource } from '../lib/useResource';

export default function CanonLibraryPage() {
  const { isFavorite, toggleFavorite } = useAppState();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const query = params.get('q') ?? '';
  const school = params.get('school') ?? '';
  const tag = params.get('tag') ?? '';
  const [keyword, setKeyword] = useState(query);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const { data, loading, error, reload } = useResource(() => Promise.all([getScriptures(query, category), getCategories()]), [query, category]);
  useEffect(() => setKeyword(query), [query]);
  const books = (data?.[0] ?? []) as Array<ScriptureSummary & BookMetadata>;
  const schools = Array.from(new Set(books.map((item) => item.school).filter((value): value is string => !!value)));
  const tags = Array.from(new Set(books.flatMap((item) => item.tags ?? [])));
  const visible = books.filter((item) => (!school || item.school === school) && (!tag || item.tags?.includes(tag)));
  const change = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next); };
  return <main className="content-page library-page"><header className="page-heading"><h1>经藏目录</h1><p>从经典原文出发。每部书的底本、篇幅与数字来源，可在详情页查看。</p><form className="classic-search" onSubmit={(event) => { event.preventDefault(); change('q', keyword.trim()); }}><input aria-label="经藏关键词" value={keyword} maxLength={100} onChange={(event) => setKeyword(event.target.value)} placeholder="搜经名、作者或关键句" /><button type="submit">搜索经藏</button></form></header>
    <section className="library-filters" aria-label="经藏筛选"><div><span>分类</span><button type="button" aria-pressed={!category} onClick={() => change('category', '')}>全部</button>{(data?.[1] ?? []).map((item) => <button type="button" key={item.slug} aria-pressed={category === item.slug} onClick={() => change('category', item.slug)}>{item.name}</button>)}</div>{schools.length ? <div><span>学派</span><button type="button" aria-pressed={!school} onClick={() => change('school', '')}>全部</button>{schools.map((value) => <button type="button" key={value} aria-pressed={school === value} onClick={() => change('school', value)}>{value}</button>)}</div> : null}{tags.length ? <div><span>特征</span><button type="button" aria-pressed={!tag} onClick={() => change('tag', '')}>全部</button>{tags.map((value) => <button type="button" key={value} aria-pressed={tag === value} onClick={() => change('tag', value)}>{value}</button>)}</div> : null}</section>
    <ErrorNotice message={error} retry={reload} /><ErrorNotice message={message} />
    {loading ? <p role="status">正在整理经藏…</p> : visible.length ? <><p className="library-count">共 {visible.length} 部经典</p><section className="library-grid">{visible.map((book) => <article className="library-book" key={book.slug}><p className="reading-meta">{book.school || book.categoryName}<span>{book.isExcerpt ? '节选' : book.isExcerpt === false ? '全本' : '篇幅待核验'}</span></p><Link to={`/book/${encodeURIComponent(book.slug)}`}><h2>{book.title}</h2></Link><p className="book-byline">{book.dynasty} · {book.translator}</p><p>{book.summary || book.overlay}</p>{book.wordCount ? <small>约 {book.wordCount.toLocaleString('zh-CN')} 字</small> : null}<footer><Link className="quiet-link" to={`/book/${encodeURIComponent(book.slug)}`}>版本与目录 ↗</Link><button className="quiet-link" disabled={!!busy} type="button" onClick={() => { setBusy(book.slug); setMessage(''); void toggleFavorite(book.slug).catch((reason) => setMessage(errorMessage(reason))).finally(() => setBusy('')); }}>{busy === book.slug ? '保存中…' : isFavorite(book.slug) ? '取消收藏' : '收藏'}</button></footer></article>)}</section></> : !error ? <div className="empty-reading-state"><h2>暂未找到匹配的经典</h2><p>试试更短的关键词，或回到全部经藏。</p><button className="quiet-link" type="button" onClick={() => { setParams({}); setKeyword(''); }}>重置筛选</button></div> : null}
  </main>;
}
