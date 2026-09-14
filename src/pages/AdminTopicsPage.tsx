import { useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import {
  createAdminTopic,
  deleteAdminTopic,
  getAdminTopics,
  getAdminScriptures,
  type ScriptureSummary,
  type TopicSummary,
} from '../lib/api';

const blankForm = {
  slug: '',
  title: '',
  summary: '',
  goal: '',
  schedule: '',
  duration: '',
  participants: '0',
  scriptureSlugs: [] as string[],
};

function AdminTopicsPage() {
  const { token } = useAppState();
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [scriptures, setScriptures] = useState<ScriptureSummary[]>([]);
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    if (!token) {
      return;
    }

    const [topicData, scriptureData] = await Promise.all([
      getAdminTopics(token),
      getAdminScriptures(token),
    ]);
    setTopics(topicData);
    setScriptures(scriptureData);
  };

  useEffect(() => {
    void loadData();
  }, [token]);

  const save = async () => {
    if (!token) {
      return;
    }

    await createAdminTopic(
      {
        ...form,
        participants: Number(form.participants || 0),
      },
      token,
    );
    setForm(blankForm);
    setMessage('专题已创建。');
    await loadData();
  };

  const remove = async (id: number) => {
    if (!token) {
      return;
    }

    await deleteAdminTopic(id, token);
    setMessage('专题已删除。');
    await loadData();
  };

  return (
    <section className="admin-section">
      <div className="admin-panel">
        <div className="results-header">
          <h2>专题管理</h2>
          <span>{topics.length} 个专题</span>
        </div>

        <div className="form-grid">
          <label>
            slug
            <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
          </label>
          <label>
            专题标题
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="full-span">
            专题摘要
            <textarea rows={3} value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} />
          </label>
          <label className="full-span">
            修学目标
            <textarea rows={3} value={form.goal} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))} />
          </label>
          <label>
            学习安排
            <input value={form.schedule} onChange={(event) => setForm((current) => ({ ...current, schedule: event.target.value }))} />
          </label>
          <label>
            持续时长
            <input value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} />
          </label>
          <label>
            参与人数
            <input value={form.participants} onChange={(event) => setForm((current) => ({ ...current, participants: event.target.value }))} />
          </label>
          <label>
            关联经典
            <select
              multiple
              value={form.scriptureSlugs}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  scriptureSlugs: Array.from(event.target.selectedOptions).map((option) => option.value),
                }))
              }
            >
              {scriptures.map((scripture) => (
                <option key={scripture.slug} value={scripture.slug}>
                  {scripture.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="card-actions">
          <button className="primary-link button-reset" type="button" onClick={() => void save()}>
            创建专题
          </button>
        </div>
        {message ? <p className="feedback-text">{message}</p> : null}
      </div>

      <div className="admin-panel">
        <div className="list-stack compact-stack">
          {topics.map((topic) => (
            <article key={topic.id} className="admin-list-row">
              <div>
                <h3>{topic.title}</h3>
                <p>
                  {topic.duration} · {topic.schedule} · {topic.participants} 人
                </p>
              </div>
              <div className="row-actions">
                <button type="button" onClick={() => void remove(topic.id)}>
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

export default AdminTopicsPage;
