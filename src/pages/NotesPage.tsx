import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorNotice, errorMessage } from '../components/AsyncFeedback';
import { useAppState } from '../context/AppStateContext';
import { apiRequest } from '../lib/api';
import { readingUrl } from '../lib/reading-progress';

export default function NotesPage() {
  const { notes, removeNote, token, loading, refreshUserData } = useAppState();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState<number[]>([]);
  useEffect(() => {
    const clear = () => { setEditingId(null); setDraft(''); setExpanded([]); setMessage('本机记录已替换，已关闭旧笔记草稿。'); };
    window.addEventListener('fanjin-local-data-changing', clear);
    return () => window.removeEventListener('fanjin-local-data-changing', clear);
  }, []);
  useEffect(() => {
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll<HTMLDetailsElement>('.notes-page details[open]').forEach((details) => { details.open = false; details.querySelector<HTMLElement>('summary')?.focus(); });
    };
    window.addEventListener('keydown', closeMenu);
    return () => window.removeEventListener('keydown', closeMenu);
  }, []);
  const books = useMemo(() => Array.from(new Map(notes.map((item) => [item.scriptureSlug, { title: item.scriptureTitle, count: notes.filter((note) => note.scriptureSlug === item.scriptureSlug).length }])).entries()), [notes]);
  const visible = notes.filter((item) => (!filter || item.scriptureSlug === filter) && (!keyword.trim() || `${item.excerpt} ${item.note} ${item.passageTitle}`.includes(keyword.trim())));
  const mutate = async (action: () => Promise<void>, success = '') => { if (busy) return; setBusy(true); setMessage(''); try { await action(); setMessage(success); } catch (error) { setMessage(errorMessage(error)); } finally { setBusy(false); } };
  const exportNotes = async (format: 'md' | 'json') => {
    await mutate(async () => {
      const data = await apiRequest<string | unknown[]>(`/api/notes/export?format=${format}`);
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const url = URL.createObjectURL(new Blob([content], { type: format === 'md' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `梵烬-私人摘录.${format}`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, '已导出全部摘录。');
  };
  if (loading) return <main className="notes-page tool-page"><p role="status">正在载入摘录…</p></main>;
  return <main className="notes-page tool-page"><header className="tool-page-heading"><div><h1>摘录与心得</h1><p>{notes.length ? `${notes.length} 条记录，保存在此浏览器。` : '阅读时选中一段原文，就能留下摘录和心得。'}</p></div>{notes.length ? <details className="notes-export"><summary className="button-secondary">导出全部</summary><div><button type="button" disabled={busy} onClick={() => void exportNotes('md')}>Markdown 文件</button><button type="button" disabled={busy} onClick={() => void exportNotes('json')}>JSON 文件</button></div></details> : null}</header><ErrorNotice message={message} />
    {!notes.length ? <section className="tool-empty"><h2>还没有摘录</h2><p>选一本书开始读，遇到想留下的句子时点“记笔记”。</p><Link className="button" to="/library">去经藏选书</Link></section> : <div className="notes-workspace"><aside className="notes-book-index" aria-label="按经典筛选"><button type="button" aria-pressed={!filter} onClick={() => setFilter('')}><span>全部经典</span><small>{notes.length}</small></button>{books.map(([slug, book]) => <button type="button" key={slug} aria-pressed={filter === slug} onClick={() => setFilter(slug)}><span>{book.title}</span><small>{book.count}</small></button>)}</aside><section className="notes-results"><label className="notes-search"><span className="sr-only">搜索摘录与心得</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索经句或心得" /></label><p className="notes-result-count">{visible.length} 条摘录</p>
      {visible.length ? visible.map((item) => <article className="note-entry" key={item.id}><header><div><Link to={readingUrl(item.scriptureSlug, item.passageSlug)}><h2>{item.scriptureTitle}</h2></Link><p>{item.passageTitle}</p></div><time>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</time></header><blockquote className={expanded.includes(item.id) || editingId === item.id ? 'is-expanded' : ''}>{item.excerpt}</blockquote>
        {editingId === item.id ? <form className="note-edit-form" onSubmit={(event) => { event.preventDefault(); void mutate(async () => { await apiRequest(`/api/notes/${item.id}`, { method: 'PUT', body: JSON.stringify({ note: draft.trim() }) }, token); await refreshUserData(); setEditingId(null); }, '心得已更新，原文快照保持不变。'); }}><label>我的心得<textarea autoFocus rows={6} maxLength={10000} value={draft} onChange={(event) => setDraft(event.target.value)} /></label><div><button className="button" type="submit" disabled={busy}>保存修改</button><button className="button-quiet" type="button" disabled={busy} onClick={() => setEditingId(null)}>取消</button></div></form> : item.note ? <p className={`note-thought${expanded.includes(item.id) ? ' is-expanded' : ''}`}>{item.note}</p> : null}
        <footer><button className="button-quiet" type="button" onClick={() => setExpanded((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}>{expanded.includes(item.id) ? '收起' : '展开全文'}</button><Link className="button-quiet" to={readingUrl(item.scriptureSlug, item.passageSlug)}>回到原文</Link><details><summary>更多</summary><div><button type="button" disabled={busy} onClick={() => { setEditingId(item.id); setDraft(item.note); }}>编辑心得</button><button type="button" disabled={busy} onClick={() => { if (window.confirm('确定删除这条摘录？删除后无法恢复。')) void mutate(() => removeNote(item.id), '摘录已删除。'); }}>删除摘录</button></div></details></footer></article>) : <section className="tool-empty"><h2>没有匹配的摘录</h2><button className="button-secondary" type="button" onClick={() => { setFilter(''); setKeyword(''); }}>清除筛选</button></section>}
    </section></div>}
  </main>;
}
