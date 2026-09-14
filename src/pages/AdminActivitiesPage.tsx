import { useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import {
  createAdminActivity,
  deleteAdminActivity,
  getAdminActivities,
  type ActivityItem,
} from '../lib/api';

const blankForm = {
  slug: '',
  title: '',
  summary: '',
  schedule: '',
  location: '',
  format: '',
  status: '',
};

function AdminActivitiesPage() {
  const { token } = useAppState();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState('');

  const loadActivities = async () => {
    if (!token) {
      return;
    }

    const data = await getAdminActivities(token);
    setActivities(data);
  };

  useEffect(() => {
    void loadActivities();
  }, [token]);

  const save = async () => {
    if (!token) {
      return;
    }

    await createAdminActivity(form, token);
    setForm(blankForm);
    setMessage('活动已创建。');
    await loadActivities();
  };

  const remove = async (id: number) => {
    if (!token) {
      return;
    }

    await deleteAdminActivity(id, token);
    setMessage('活动已删除。');
    await loadActivities();
  };

  return (
    <section className="admin-section">
      <div className="admin-panel">
        <div className="results-header">
          <h2>活动管理</h2>
          <span>{activities.length} 条活动</span>
        </div>

        <div className="form-grid">
          <label>
            slug
            <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
          </label>
          <label>
            活动标题
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="full-span">
            活动摘要
            <textarea rows={4} value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} />
          </label>
          <label>
            活动时间
            <input value={form.schedule} onChange={(event) => setForm((current) => ({ ...current, schedule: event.target.value }))} />
          </label>
          <label>
            活动地点
            <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
          </label>
          <label>
            活动形式
            <input value={form.format} onChange={(event) => setForm((current) => ({ ...current, format: event.target.value }))} placeholder="线上 / 线下" />
          </label>
          <label>
            活动状态
            <input value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} placeholder="报名中 / 招募中 / 长期进行" />
          </label>
        </div>

        <div className="card-actions">
          <button className="primary-link button-reset" type="button" onClick={() => void save()}>
            创建活动
          </button>
        </div>
        {message ? <p className="feedback-text">{message}</p> : null}
      </div>

      <div className="admin-panel">
        <div className="list-stack compact-stack">
          {activities.map((activity) => (
            <article key={activity.id} className="admin-list-row">
              <div>
                <h3>{activity.title}</h3>
                <p>
                  {activity.schedule} · {activity.location} · {activity.status}
                </p>
              </div>
              <div className="row-actions">
                <button type="button" onClick={() => void remove(activity.id)}>
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AdminActivitiesPage;
