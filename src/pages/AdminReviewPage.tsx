import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { getAdminReviewByFilter, type ReviewItem, updateReviewStatus } from '../lib/api';

function AdminReviewPage() {
  const { token } = useAppState();
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  const loadQueue = async (nextStatus = statusFilter) => {
    if (!token) {
      return;
    }
    const data = await getAdminReviewByFilter({ status: nextStatus }, token);
    setQueue(data);
  };

  useEffect(() => {
    void loadQueue();
  }, [token]);

  const handleStatus = async (id: number, status: string) => {
    if (!token) {
      return;
    }
    await updateReviewStatus(id, status, token);
    await loadQueue();
  };

  return (
    <section className="admin-section">
      <div className="admin-panel">
        <div className="panel-stack">
          <div className="results-header">
            <h2>内容审核</h2>
            <span>{queue.length} 条待处理记录</span>
          </div>
          <div className="form-grid">
            <label>
              审核状态
              <select
                value={statusFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatusFilter(value);
                  void loadQueue(value);
                }}
              >
                <option value="">全部状态</option>
                <option value="待审核">待审核</option>
                <option value="待修改">待修改</option>
                <option value="已通过">已通过</option>
                <option value="待发布">待发布</option>
                <option value="待复核">待复核</option>
              </select>
            </label>
          </div>
        </div>
        {queue.map((item) => (
          <article key={item.id} className="admin-list-row">
            <div>
              <h3>{item.title}</h3>
              <p>
                {item.type} · {item.submitter} · 当前状态 {item.status}
              </p>
            </div>
            <div className="row-actions">
              {item.targetKind === 'scripture' && item.targetSlug ? (
                <Link className="header-button" to={`/reader/${item.targetSlug}?draft=1`}>
                  预览
                </Link>
              ) : null}
              {item.targetKind === 'scripture' && item.targetSlug ? (
                <Link className="header-button" to={`/admin/editor?slug=${item.targetSlug}`}>
                  打开编辑
                </Link>
              ) : null}
              <button type="button" onClick={() => void handleStatus(item.id, '已通过')}>
                通过
              </button>
              <button type="button" onClick={() => void handleStatus(item.id, '待修改')}>
                驳回修改
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminReviewPage;
