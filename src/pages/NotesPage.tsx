import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorNotice, errorMessage } from '../components/AsyncFeedback';
import { useAppState } from '../context/AppStateContext';
import { apiRequest } from '../lib/api';
import { readingUrl } from '../lib/reading-progress';

export default function NotesPage() {
  const { favorites, notes, removeNote, toggleFavorite, token, loading, refreshUserData } = useAppState();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  useEffect(() => {
    const clear = () => { setEditingId(null); setDraft(''); setMessage('本机记录已替换，已关闭旧笔记草稿。'); };
    window.addEventListener('fanjin-local-data-changing', clear);
    return () => window.removeEventListener('fanjin-local-data-changing', clear);
  }, []);
  const books = useMemo(() => Array.from(new Map(notes.map((item) => [item.scriptureSlug, item.scriptureTitle])).entries()), [notes]);
  const visible = notes.filter((item) => (!filter || item.scriptureSlug === filter) && (!keyword.trim() || `${item.excerpt} ${item.note} ${item.passageTitle}`.includes(keyword.trim())));
  const mutate = async (action: () => Promise<void>, success = '') => { if (busy) return; setBusy(true); setMessage(''); try { await action(); setMessage(success); } catch (error) { setMessage(errorMessage(error)); } finally { setBusy(false); } };
  const exportNotes = async (format: 'md' | 'json') => {
    if (!token) return;
    await mutate(async () => {
      const data = await apiRequest<string | unknown[]>(`/api/notes/export?format=${format}`);
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const url = URL.createObjectURL(new Blob([content], { type: format === 'md' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `梵烬-私人摘录.${format}`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, '已导出全部私人摘录。');
  };
  if (loading) return <main className="content-page"><p role="status">正在载入收藏摘录…</p></main>;
  return <main className="content-page notes-page"><header className="page-heading"><h1>摘录与心得</h1><p>留住原文，也留住当时的自己。摘录原文会保存为当时的快照。</p><div className="card-actions"><button className="ink-button" type="button" disabled={!notes.length || busy} onClick={() => void exportNotes('md')}>导出 Markdown</button><button className="quiet-link" type="button" disabled={!notes.length || busy} onClick={() => void exportNotes('json')}>导出 JSON ↗</button></div></header><ErrorNotice message={message} />
    <section className="notes-filter"><label>按经典筛选<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">全部经典</option>{books.map(([slug, title]) => <option key={slug} value={slug}>{title}</option>)}</select></label><label>查找摘录<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入经句或心得关键词" /></label><span>{visible.length} 条</span></section>
    <section className="notes-timeline" aria-label="私人摘录">{visible.length ? visible.map((item) => <article className="note-entry" key={item.id}><header><div><span className="reading-meta">{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span><h2>{item.scriptureTitle}</h2><p>{item.passageTitle}</p></div><Link className="quiet-link" to={readingUrl(item.scriptureSlug, item.passageSlug)}>回到原段 ↗</Link></header><blockquote>{item.excerpt}</blockquote>{editingId === item.id ? <form onSubmit={(event) => { event.preventDefault(); if (!token) return; void mutate(async () => { await apiRequest(`/api/notes/${item.id}`, { method: 'PUT', body: JSON.stringify({ note: draft.trim() }) }, token); await refreshUserData(); setEditingId(null); }, '心得已更新，原文快照保持不变。'); }}><label>编辑我的心得<textarea autoFocus rows={5} maxLength={10000} value={draft} onChange={(event) => setDraft(event.target.value)} /></label><div className="card-actions"><button className="ink-button" type="submit" disabled={busy}>保存修改</button><button className="quiet-link" type="button" disabled={busy} onClick={() => setEditingId(null)}>取消</button></div></form> : item.note ? <p className="note-thought">{item.note}</p> : <p className="form-footnote">此刻只摘录了原文，日后仍可补写心得。</p>}<footer><button className="quiet-link" type="button" disabled={busy} onClick={() => { setEditingId(item.id); setDraft(item.note); }}>编辑心得</button><button className="quiet-link" type="button" disabled={busy} onClick={() => { if (window.confirm('确定删除这条私人摘录？此操作无法恢复。')) void mutate(() => removeNote(item.id), '摘录已删除。'); }}>删除</button></footer></article>) : <div className="empty-reading-state"><h2>{notes.length ? '还没有匹配的摘录' : '第一则摘录，尚待相遇'}</h2><p>{notes.length ? '换一个关键词或重置筛选看看。' : '阅读时点击任意段落，便能留下原文与心得。'}</p>{notes.length ? <button className="quiet-link" type="button" onClick={() => { setFilter(''); setKeyword(''); }}>重置筛选</button> : <Link className="quiet-link" to="/library">去经藏翻一卷 →</Link>}</div>}</section>
    <section className="favorite-shelf"><div className="reading-section-heading"><h2>收藏经典</h2><span className="reading-meta">{favorites.length} 部</span></div>{favorites.length ? favorites.map((item) => <article key={item.slug} className="list-card"><div><span className="content-kicker">{item.categoryName}</span><h3>{item.title}</h3></div><div className="row-actions"><Link className="quiet-link" to={`/book/${encodeURIComponent(item.slug)}`}>打开经典 ↗</Link><button type="button" disabled={busy} onClick={() => void mutate(() => toggleFavorite(item.slug))}>取消收藏</button></div></article>) : <p>收藏的经典会在这里等你下次翻阅。</p>}</section>
  </main>;
}
