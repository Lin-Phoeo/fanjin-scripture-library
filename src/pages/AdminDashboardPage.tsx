import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { getAdminDashboard, type AdminDashboardResponse } from '../lib/api';

export default function AdminDashboardPage() {
  const { token } = useAppState();
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try { setDashboard(await getAdminDashboard(token)); }
    catch (error) { setError(error instanceof Error ? error.message : '后台概览加载失败。'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  const queue = dashboard?.queue.filter((item) => ['待审核', '待修改', '待发布', '待复核'].includes(item.status)) ?? [];
  return <section className="admin-section">
    <div className="admin-panel"><div className="results-header"><h2>经藏内容概览</h2><button type="button" disabled={loading} onClick={() => void load()}>刷新</button></div>
      {error && <p className="feedback-text" role="alert">{error} <button type="button" onClick={() => void load()}>重试</button></p>}
      {loading && <p role="status">正在加载后台概览…</p>}
      <div className="card-actions"><Link className="primary-link" to="/admin/editor">录入与校订</Link><Link className="primary-link" to="/admin/corrections">处理读者勘误</Link></div>
    </div>
    {dashboard && <><div className="admin-metric-grid">
      <article className="admin-card"><span>注册读者</span><strong>{dashboard.metrics.userCount}</strong></article>
      <article className="admin-card"><span>馆藏经典</span><strong>{dashboard.metrics.scriptureCount}</strong></article>
      <article className="admin-card"><span>私人摘录</span><strong>{dashboard.metrics.noteCount}</strong></article>
      <article className="admin-card"><span>待处理审核</span><strong>{queue.length}</strong></article>
    </div><div className="admin-panel"><div className="results-header"><h2>待处理内容</h2><Link to="/admin/review">查看审核队列</Link></div>
      {!queue.length && <p>目前没有待处理的内容审核。</p>}
      {queue.map((item) => <article key={item.id} className="admin-list-row"><div><h3>{item.title}</h3><p>{item.type} · {item.submitter}</p></div><span>{item.status}</span></article>)}
    </div></>}
  </section>;
}
