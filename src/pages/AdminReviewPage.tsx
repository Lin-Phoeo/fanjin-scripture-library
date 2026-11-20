import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { getAdminReviewByFilter, type ReviewItem, updateReviewStatus } from '../lib/api';

const actionable = ['待审核', '待修改', '待复核', '待发布'];

export default function AdminReviewPage() {
  const { token } = useAppState();
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const request = useRef(0);
  const load = useCallback(async () => {
    if (!token) return;
    const current = ++request.current;
    setLoading(true); setError('');
    try { const data = await getAdminReviewByFilter({ status: statusFilter }, token); if (current === request.current) setQueue(data); }
    catch (error) { if (current === request.current) setError(error instanceof Error ? error.message : '审核队列加载失败。'); }
    finally { if (current === request.current) setLoading(false); }
  }, [token, statusFilter]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);

  async function handleStatus(item: ReviewItem, status: string) {
    if (!token || busy) return;
    if (!window.confirm(status === '已通过' ? '确认发布“' + item.title + '”？请先核对原文、来源与注释。' : '确认将“' + item.title + '”退回修改？')) return;
    setBusy(true); setMessage(''); setError('');
    try { await updateReviewStatus(item.id, status, token); setMessage(status === '已通过' ? '审核通过，经典已公开。' : '已退回修改，前台暂不可见。'); await load(); }
    catch (error) { setError(error instanceof Error ? error.message : '审核失败，请刷新后重试。'); }
    finally { setBusy(false); }
  }

  return <section className="admin-section"><div className="admin-panel">
    <div className="results-header"><h2>内容审核</h2><span>{queue.length} 条记录</span><button type="button" disabled={busy || loading} onClick={() => void load()}>刷新队列</button></div>
    <label>审核状态 <select value={statusFilter} disabled={busy} onChange={(event) => setStatusFilter(event.target.value)}>
      <option value="">全部状态</option>{[...actionable, '已通过', '已替代', '已下架'].map((status) => <option key={status}>{status}</option>)}
    </select></label>
    {error && <p className="feedback-text" role="alert">{error} <button type="button" onClick={() => void load()}>重新加载</button></p>}
    {message && <p className="feedback-text" role="status">{message}</p>}
    {loading ? <p role="status">正在加载审核队列…</p> : !error && !queue.length ? <p>当前筛选下没有审核记录。</p> : null}
    {!loading && queue.map((item) => {
      const linked = item.targetKind === 'scripture' && Boolean(item.targetSlug);
      const canReview = linked && actionable.includes(item.status);
      return <article key={item.id} className="admin-list-row">
        <div><h3>{item.title}</h3><p>{item.type} · {item.submitter} · {item.status}</p>{!linked && <p>历史记录，无关联内容。</p>}</div>
        <div className="row-actions">
          {linked && <><Link className="header-button" to={'/reader/' + encodeURIComponent(item.targetSlug!) + '?draft=1'}>预览</Link><Link className="header-button" to={'/admin/editor?slug=' + encodeURIComponent(item.targetSlug!)}>打开编辑</Link></>}
          {canReview && <><button type="button" disabled={busy} onClick={() => void handleStatus(item, '已通过')}>通过并发布</button><button type="button" disabled={busy || item.status === '待修改'} onClick={() => void handleStatus(item, '待修改')}>退回修改</button></>}
        </div>
      </article>;
    })}
  </div></section>;
}
