import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { apiRequest } from '../lib/api';

type Correction = { id: number; message: string; excerpt: string; status: 'open' | 'resolved' | 'rejected'; response: string; reporterName: string; scriptureSlug: string; scriptureTitle: string; passageSlug: string; passageTitle: string; createdAt: string; updatedAt: string };
type Result = { items: Correction[]; total: number; page: number; pageSize: number };
const statuses = { open: '待处理', resolved: '已修正', rejected: '不予采纳' };

export default function AdminCorrectionsPage() {
  const { token } = useAppState();
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result>({ items: [], total: 0, page: 1, pageSize: 30 });
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    if (!token) return;
    const version = ++request.current;
    setLoading(true); setError('');
    const query = new URLSearchParams({ page: String(page) });
    if (status) query.set('status', status);
    try {
      const result = await apiRequest<Result>('/api/admin/corrections?' + query, {}, token);
      if (version !== request.current) return;
      setData(result); setResponses(Object.fromEntries(result.items.map((item) => [item.id, item.response])));
    } catch (error) { if (version === request.current) setError(error instanceof Error ? error.message : '勘误记录加载失败。'); }
    finally { if (version === request.current) setLoading(false); }
  }, [token, status, page]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);

  async function update(item: Correction, nextStatus: Correction['status']) {
    if (!token || busy) return;
    if (!window.confirm(nextStatus === 'resolved' ? '确认已完成原文核对与修正？状态更新不会自动修改正文。' : '确认将此勘误标记为“' + statuses[nextStatus] + '”？')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await apiRequest('/api/admin/corrections/' + item.id, { method: 'PATCH', body: JSON.stringify({ status: nextStatus, response: responses[item.id] || '' }) }, token);
      setMessage('勘误处理结果已保存。'); await load();
    } catch (error) { setError(error instanceof Error ? error.message : '处理结果保存失败。'); }
    finally { setBusy(false); }
  }

  return <section className="admin-section"><div className="admin-panel">
    <div className="results-header"><h2>读者勘误</h2><button type="button" disabled={busy || loading} onClick={() => void load()}>刷新</button></div>
    <p>先对照底本核实，再到古籍录入页修正文稿。反馈附带提交时的原文快照，便于校对。</p>
    <label>处理状态 <select value={status} disabled={busy} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
      <option value="">全部记录</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    {error && <p className="feedback-text" role="alert">{error} <button type="button" onClick={() => void load()}>重试</button></p>}
    {message && <p className="feedback-text" role="status">{message}</p>}
    {loading ? <p role="status">正在加载勘误…</p> : !data.items.length && !error ? <p>当前没有{status ? statuses[status as keyof typeof statuses] : ''}的勘误记录。</p> : null}
    {!loading && data.items.map((item) => <article className="editor-passage-card" key={item.id}>
      <div className="results-header"><h3>{item.scriptureTitle} · {item.passageTitle}</h3><span>{statuses[item.status]}</span></div>
      <p>{item.reporterName} · {new Date(item.createdAt).toLocaleString('zh-CN')}</p>
      <blockquote style={{ whiteSpace: 'pre-wrap' }}>{item.excerpt}</blockquote>
      <p style={{ whiteSpace: 'pre-wrap' }}>{item.message}</p>
      <div className="row-actions"><Link className="header-button" to={'/admin/editor?slug=' + encodeURIComponent(item.scriptureSlug)}>核对并编辑</Link><Link className="header-button" to={'/reader/' + encodeURIComponent(item.scriptureSlug) + '?draft=1&passage=' + encodeURIComponent(item.passageSlug)}>预览原段</Link></div>
      <label>处理说明<textarea rows={3} maxLength={4000} disabled={busy} value={responses[item.id] ?? item.response} onChange={(event) => setResponses((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
      <div className="row-actions">
        <button type="button" disabled={busy} onClick={() => void update(item, 'resolved')}>已核实并修正</button>
        <button type="button" disabled={busy} onClick={() => void update(item, 'rejected')}>不予采纳</button>
        {item.status !== 'open' && <button type="button" disabled={busy} onClick={() => void update(item, 'open')}>重新处理</button>}
      </div>
    </article>)}
    <div className="card-actions"><button type="button" disabled={busy || loading || page <= 1} onClick={() => setPage((current) => current - 1)}>上一页</button><span>第 {page} 页 · 共 {data.total} 条</span><button type="button" disabled={busy || loading || page * data.pageSize >= data.total} onClick={() => setPage((current) => current + 1)}>下一页</button></div>
  </div></section>;
}
