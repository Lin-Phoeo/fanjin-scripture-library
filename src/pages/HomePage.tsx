import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorNotice, errorMessage } from '../components/AsyncFeedback';
import PreferenceChoices from '../components/PreferenceChoices';
import { useAppState } from '../context/AppStateContext';
import { getScriptures } from '../lib/api';
import { usePersonalPreferences } from '../lib/personal-preferences';
import { latestProgress, readingUrl } from '../lib/reading-progress';
import { getLibrary } from '../lib/workbench-api';
import { useResource } from '../lib/useResource';
import { bookSchool, rankBooks, type RecommendationBook } from '../lib/recommendations';

export default function HomePage() {
  const { token, session, favorites, notes, toggleFavorite, loading: accountLoading } = useAppState();
  const books = useResource(() => getScriptures());
  const shelf = useResource(() => token ? getLibrary(token) : Promise.resolve({ items: [] }), [token, session?.id]);
  const progress = useResource(() => latestProgress(), [token, session?.id]);
  const preferences = usePersonalPreferences();
  const [view, setView] = useState<'auto' | 'shelf' | 'catalog'>('auto');
  const [filter, setFilter] = useState<'all' | 'reading' | 'favorites'>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'default' | 'personal'>('default');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const personal = view === 'shelf' || (view === 'auto' && !!shelf.data?.items.length);
  const items = (shelf.data?.items || []).filter((item) => (!query.trim() || item.title.includes(query.trim())) && (filter !== 'reading' || !!item.progressAt) && (filter !== 'favorites' || item.favorite));
  const available = (books.data || []).filter((item) => (!query.trim() || `${item.title} ${item.translator}`.includes(query.trim())) && (!category || item.categoryName === category)) as RecommendationBook[];
  const publicBooks = sort === 'personal' ? (() => {
    const preferred = rankBooks(available, preferences.value);
    const included = new Set(preferred.map((item) => item.slug));
    return [...preferred, ...available.filter((item) => !included.has(item.slug))];
  })() : available;
  const categories = Array.from(new Set((books.data || []).map((item) => item.categoryName)));
  const favorite = async (slug: string) => {
    if (busy) return; setBusy(slug); setMessage('');
    try { await toggleFavorite(slug); shelf.reload(); } catch (reason) { setMessage(errorMessage(reason)); } finally { setBusy(''); }
  };
  return <main className="workbench-home"><header className="workbench-heading"><div><h1>{personal ? '我的书架' : '经藏'}</h1><p>收藏、书签、摘录与阅读进度仅保存在此浏览器。</p></div><Link className="workbench-action" to="/profile">备份 / 导入本机数据</Link></header>
    {session && progress.data ? <section className="workbench-resume"><div><span>上次读到</span><h2>{progress.data.scriptureTitle}</h2><p>{progress.data.passageTitle}</p></div><Link className="ink-button" to={readingUrl(progress.data.scriptureSlug, progress.data.passageSlug)}>继续阅读</Link></section> : null}
    <div className="workbench-tabs" role="group" aria-label="书架视图">{session ? <button type="button" aria-pressed={personal} onClick={() => { setView('shelf'); setQuery(''); }}>我的书架</button> : null}<button type="button" aria-pressed={!personal} onClick={() => { setView('catalog'); setQuery(''); }}>全部经藏</button><Link to="/study">每日功课</Link><details className="workbench-preferences"><summary>阅读偏好</summary><div><h2>兴趣与阅读时间</h2><p>仅影响辅助选读；完整经藏始终可以自由浏览。</p><PreferenceChoices value={preferences.value} update={preferences.update} disabled={preferences.loading || preferences.saving} compact /><div className="preference-storage"><span role="status">{preferences.saving ? '正在保存…' : preferences.status || (session ? '仅保存在此浏览器' : '仅保存在此浏览器')}</span><button type="button" disabled={preferences.loading || preferences.saving} onClick={() => void preferences.reset()}>清除偏好</button></div><ErrorNotice message={preferences.error} retry={preferences.retry} /></div></details></div>
    <div className="workbench-search"><label><span>搜索书名</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={personal ? '查找书架中的书' : '输入书名或作者'} /></label>{personal ? <div className="workbench-filter" role="group" aria-label="书架筛选">{([['all', '全部'], ['reading', '在读'], ['favorites', '收藏']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div> : <label><span>分类</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">全部分类</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>}{!personal ? <label><span>排序</span><select value={sort} onChange={(event) => setSort(event.target.value as 'default' | 'personal')}><option value="default">默认顺序</option><option value="personal">适合这次阅读</option></select></label> : null}<Link className="workbench-action" to={`/search${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`}>搜索原文</Link></div>
    <ErrorNotice message={personal ? shelf.error : books.error} retry={personal ? shelf.reload : books.reload} /><ErrorNotice message={message} />
    {accountLoading || (personal ? shelf.loading : books.loading) ? <p className="workbench-status" role="status">正在载入书目…</p> : personal ? items.length ? <div className="workbench-book-list"><div className="workbench-table-head"><span>书名</span><span>阅读位置</span><span>私人记录</span><span>操作</span></div>{items.map((item) => <article className="workbench-book-row" key={item.slug}><div className="workbench-book-title">{item.publishStatus === 'published' ? <Link to={`/book/${encodeURIComponent(item.slug)}`}><h2>{item.title}</h2></Link> : <h2>{item.title}</h2>}<p>{item.school || item.categoryName}{item.isExcerpt ? ' · 节选' : ''}{item.publishStatus !== 'published' ? ' · 暂未公开' : ''}</p></div><div className="workbench-book-position"><p>{item.passageTitle || '尚未开始'}</p>{item.passageOrder ? <small>最近第 {item.passageOrder} 节 / 共 {item.totalPassages} 节</small> : <small>共 {item.totalPassages} 节</small>}</div><div className="workbench-book-records"><span>{item.notesCount} 条摘录</span><span>{item.bookmarksCount} 处书签</span></div><div className="workbench-row-actions">{item.publishStatus === 'published' ? <Link className="workbench-read" to={item.passageSlug ? readingUrl(item.slug, item.passageSlug) : `/read/${encodeURIComponent(item.slug)}`}>{item.passageSlug ? '继续读' : '阅读'}</Link> : <span className="workbench-unavailable">暂不可读</span>}<button type="button" disabled={!!busy} onClick={() => void favorite(item.slug)}>{item.favorite ? '取消收藏' : '收藏'}</button></div></article>)}</div> : <div className="workbench-empty"><h2>{query || filter !== 'all' ? '没有匹配的书' : '书架还没有书'}</h2><p>{query || filter !== 'all' ? '更换筛选或搜索条件。' : '读过、收藏或做过摘录的经典会自动出现在这里。'}</p><button className="ink-button" type="button" onClick={() => { setView('catalog'); setQuery(''); setFilter('all'); }}>从经藏选书</button></div> : publicBooks.length ? <div className="workbench-book-list"><div className="workbench-table-head catalog"><span>书名 / 作者</span><span>内容与版本</span><span>操作</span></div>{publicBooks.map((item) => <article className="workbench-book-row catalog" key={item.slug}><div className="workbench-book-title"><Link to={`/book/${encodeURIComponent(item.slug)}`}><h2>{item.title}</h2></Link><p>{item.categoryName} · {item.translator}{item.isExcerpt ? ' · 节选' : ''}</p></div><div className="workbench-book-position"><p>{item.summary || item.overlay}</p>{sort === 'personal' ? <small className="workbench-match-reason">{preferences.value.interests.includes(bookSchool(item)) ? `符合 ${bookSchool(item)} 兴趣 · ` : ''}{item.wordCount ? `收录约 ${item.wordCount} 字，按 ${preferences.value.minutes} 分钟安排选读` : '按阅读兴趣与当前可用内容排序'}</small> : null}<Link to={`/book/${encodeURIComponent(item.slug)}`}>版本与篇章目录</Link></div><div className="workbench-row-actions"><Link className="workbench-read" to={`/read/${encodeURIComponent(item.slug)}`}>阅读</Link>{session ? <button type="button" disabled={!!busy} onClick={() => void favorite(item.slug)}>{favorites.some((favorite) => favorite.slug === item.slug) ? '取消收藏' : '收藏'}</button> : null}</div></article>)}</div> : <div className="workbench-empty"><h2>没有匹配的经典</h2><button className="workbench-action" type="button" onClick={() => { setQuery(''); setCategory(''); }}>清除筛选</button></div>}
    {session && notes.length ? <section className="workbench-recent-notes"><header><h2>最近的摘录</h2><Link className="workbench-action" to="/notes">查看全部</Link></header>{notes.slice(0, 3).map((note) => <article key={note.id}><div><Link to={readingUrl(note.scriptureSlug, note.passageSlug)}>{note.scriptureTitle} · {note.passageTitle}</Link><p>{note.note || note.excerpt}</p></div><time>{new Date(note.createdAt).toLocaleDateString('zh-CN')}</time></article>)}</section> : null}
  </main>;
}
