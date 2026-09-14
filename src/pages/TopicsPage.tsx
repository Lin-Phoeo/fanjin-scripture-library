import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTopics, type TopicSummary } from '../lib/api';

function TopicsPage() {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState('');

  useEffect(() => {
    void (async () => {
      const data = await getTopics();
      setTopics(data);
      setActiveSlug((current) => current || data[0]?.slug || '');
      setLoading(false);
    })();
  }, []);

  const activeTopic = useMemo(
    () => topics.find((topic) => topic.slug === activeSlug) ?? topics[0] ?? null,
    [activeSlug, topics],
  );

  return (
    <main className="content-page classic-page">
      <section className="classic-shell">
        <aside className="classic-sidebar">
          <div className="classic-side-panel">
            <div className="classic-side-title">专题共修</div>
            <div className="classic-side-heading">专题索引</div>
            <div className="classic-link-list">
              {topics.map((topic) => (
                <button
                  key={topic.slug}
                  className={activeTopic?.slug === topic.slug ? 'classic-filter-link is-current' : 'classic-filter-link'}
                  onClick={() => setActiveSlug(topic.slug)}
                  type="button"
                >
                  {topic.title}
                </button>
              ))}
            </div>
          </div>

          <div className="classic-side-panel">
            <div className="classic-side-heading">共修说明</div>
            <div className="classic-reader-meta">
              <span>依经典组织学习次第</span>
              <span>适合短期精读与长期共修</span>
              <span>可直接跳转讨论与阅读</span>
            </div>
          </div>
        </aside>

        <section className="classic-main">
          {loading || !activeTopic ? (
            <article className="classic-article">
              <h1>专题共修</h1>
              <p>正在从数据库载入专题内容…</p>
            </article>
          ) : (
            <>
              <article className="classic-article">
                <h1>{activeTopic.title}</h1>
                <div className="classic-meta-line">专题时长：{activeTopic.duration}</div>
                <div className="classic-meta-line">修学安排：{activeTopic.schedule}</div>
                <div className="classic-meta-line">当前参与：{activeTopic.participants} 人</div>
                <div className="classic-reading-intro">{activeTopic.summary}</div>
                <div className="classic-reading-block">
                  <p className="classic-reading-paragraph classic-reading-paragraph-helper">{activeTopic.goal}</p>
                </div>
                <div className="classic-reading-actions classic-reading-actions-bar">
                  <Link className="classic-inline-button" to={`/discussion?topic=${activeTopic.slug}`}>
                    进入专题讨论
                  </Link>
                  {activeTopic.scriptures[0] ? (
                    <Link className="classic-inline-button" to={`/reader/${activeTopic.scriptures[0].scriptureSlug}`}>
                      从第一部经典开始
                    </Link>
                  ) : null}
                </div>
              </article>

              <article className="classic-article">
                <h2>专题经典</h2>
                {activeTopic.scriptures.map((scripture, index) => (
                  <div key={scripture.scriptureSlug} className="classic-row">
                    <div>
                      <strong>
                        第 {index + 1} 部 · {scripture.scriptureTitle}
                      </strong>
                      <p>作为本专题的阅读主线，可直接进入阅读与摘录。</p>
                    </div>
                    <Link className="classic-inline-link" to={`/reader/${scripture.scriptureSlug}`}>
                      进入阅读
                    </Link>
                  </div>
                ))}
              </article>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export default TopicsPage;
