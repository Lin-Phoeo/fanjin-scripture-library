import { useEffect, useState } from 'react';
import { getActivities, type ActivityItem } from '../lib/api';

function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const data = await getActivities();
      setActivities(data);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="content-page classic-page">
      <section className="classic-shell">
        <aside className="classic-sidebar">
          <div className="classic-side-panel">
            <div className="classic-side-title">活动安排</div>
            <div className="classic-side-heading">参与说明</div>
            <div className="classic-reader-meta">
              <span>收录线上线下共修、抄经、校对与读书会</span>
              <span>适合志工、共修成员与寺院组织使用</span>
              <span>后续可继续补报名与签到功能</span>
            </div>
          </div>
        </aside>

        <section className="classic-main">
          <article className="classic-article">
            <h1>共修活动</h1>
            <p>把近期可参与的活动集中整理，方便用户知道什么时候、在哪里、以什么方式加入共修。</p>
          </article>

          <article className="classic-article">
            <h2>活动列表</h2>
            {loading ? (
              <div className="classic-line-item">
                <p>正在加载活动内容…</p>
              </div>
            ) : activities.length ? (
              activities.map((activity) => (
                <div key={activity.id} className="classic-row classic-row-activity">
                  <div>
                    <strong>{activity.title}</strong>
                    <p>
                      {activity.status} · {activity.format}
                    </p>
                    <p>{activity.summary}</p>
                    <p>时间：{activity.schedule}</p>
                    <p>地点：{activity.location}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="classic-line-item">
                <p>当前还没有可展示的活动。</p>
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}

export default ActivitiesPage;
