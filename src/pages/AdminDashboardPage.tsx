import { useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import { getAdminDashboard, type AdminDashboardResponse } from '../lib/api';

function AdminDashboardPage() {
  const { token } = useAppState();
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    void (async () => {
      const data = await getAdminDashboard(token);
      setDashboard(data);
    })();
  }, [token]);

  if (!dashboard) {
    return (
      <section className="admin-section">
        <div className="admin-panel">
          <p>正在加载后台数据概览…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-metric-grid">
        <article className="admin-card">
          <span>用户数</span>
          <strong>{dashboard.metrics.userCount}</strong>
        </article>
        <article className="admin-card">
          <span>经典数</span>
          <strong>{dashboard.metrics.scriptureCount}</strong>
        </article>
        <article className="admin-card">
          <span>摘录数</span>
          <strong>{dashboard.metrics.noteCount}</strong>
        </article>
        <article className="admin-card">
          <span>讨论数</span>
          <strong>{dashboard.metrics.discussionCount}</strong>
        </article>
      </div>

      <div className="admin-panel">
        <h2>待处理队列</h2>
        {dashboard.queue.map((item) => (
          <article key={item.id} className="admin-list-row">
            <div>
              <h3>{item.title}</h3>
              <p>
                {item.type} · {item.submitter}
              </p>
            </div>
            <span>{item.status}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminDashboardPage;
