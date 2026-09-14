import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sages } from '../data/sages';
import {
  type CategoryItem,
  type DiscussionItem,
  type HomeResponse,
  type TopicSummary,
  getCategories,
  getDiscussions,
  getHomeData,
  getTopics,
} from '../lib/api';

function HomePage() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('金刚经');
  const [homeData, setHomeData] = useState<HomeResponse | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);

  useEffect(() => {
    void (async () => {
      const [nextHome, nextCategories, nextTopics, nextDiscussions] = await Promise.all([
        getHomeData(),
        getCategories(),
        getTopics(),
        getDiscussions(),
      ]);
      setHomeData(nextHome);
      setCategories(nextCategories);
      setTopics(nextTopics.slice(0, 3));
      setDiscussions(nextDiscussions.slice(0, 4));
    })();
  }, []);

  return (
    <main className="content-page classic-page">
      <section className="classic-shell classic-home-shell">
        <aside className="classic-sidebar">
          <div className="classic-side-panel">
            <div className="classic-side-title">经藏目录</div>
            <div className="classic-table-grid">
              {categories.map((category) => (
                <Link key={category.slug} className="classic-table-cell" to={`/canon?category=${category.slug}`}>
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="classic-side-panel">
            <div className="classic-side-heading">常用入口</div>
            <div className="classic-link-list">
              <Link to="/canon">经藏浏览</Link>
              <Link to="/sages">高僧大德</Link>
              <Link to="/topics">专题共修</Link>
              <Link to="/discussion">共修讨论</Link>
              <Link to="/notes">收藏摘录</Link>
            </div>
          </div>
        </aside>

        <section className="classic-main home-classic-main">
          <div className="classic-article classic-home-intro classic-home-hero-panel">
            <div className="classic-home-hero-copy">
              <h1>{homeData?.settings.site_name ?? '梵烬网'}</h1>
              <p className="classic-home-subtitle">{homeData?.settings.site_subtitle ?? '佛教共修公益古籍网'}</p>
              <p>
                {homeData?.settings.site_description ??
                  '以经藏、祖师注义、人物行谊与专题共修为主轴，方便居士闻思、道场共学、志工整理。'}
              </p>
              <div className="classic-home-manifest">
                <span>经藏研读</span>
                <span>祖师注义</span>
                <span>高僧人物</span>
                <span>专题共修</span>
              </div>
            </div>
            <form
              className="classic-search classic-home-search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate(`/search?q=${encodeURIComponent(searchValue.trim() || '金刚经')}`);
              }}
            >
              <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="输入经名、句子或人物名" />
              <button type="submit">搜索</button>
            </form>
          </div>

          <section className="home-section-grid home-section-grid--primary">
            <div className="classic-article">
              <div className="section-header-inline">
                <h2>推荐经典</h2>
                <Link className="section-header-link" to="/canon">
                  查看更多
                </Link>
              </div>
              {(homeData?.featuredScriptures ?? []).slice(0, 3).map((item) => (
                <div key={item.slug} className="classic-row">
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {item.category} · {item.overlay}
                    </p>
                  </div>
                  <Link className="classic-inline-link" to={`/reader/${item.slug}`}>
                    进入阅读
                  </Link>
                </div>
              ))}
            </div>

            <div className="classic-article">
              <div className="section-header-inline">
                <h2>高僧大德</h2>
                <Link className="section-header-link" to="/sages">
                  查看更多
                </Link>
              </div>
              {sages.slice(0, 3).map((sage) => (
                <div key={sage.slug} className="classic-row">
                  <div>
                    <strong>{sage.name}</strong>
                    <p>
                      {sage.honorific} · {sage.era} · {sage.studyFocus.slice(0, 2).join(' / ')}
                    </p>
                  </div>
                  <Link className="classic-inline-link" to="/sages">
                    查看人物
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="home-section-grid home-section-grid--secondary">
            <div className="classic-article">
              <div className="section-header-inline">
                <h2>专题共修</h2>
                <Link className="section-header-link" to="/topics">
                  查看更多
                </Link>
              </div>
              {topics.map((topic) => (
                <div key={topic.slug} className="classic-row">
                  <div>
                    <strong>{topic.title}</strong>
                    <p>
                      {topic.duration} · {topic.schedule} · {topic.participants} 人参与
                    </p>
                  </div>
                  <Link className="classic-inline-link" to={`/discussion?topic=${topic.slug}`}>
                    进入专题
                  </Link>
                </div>
              ))}
            </div>

            <div className="classic-article">
              <div className="section-header-inline">
                <h2>最新讨论</h2>
                <Link className="section-header-link" to="/discussion">
                  查看更多
                </Link>
              </div>
              {discussions.slice(0, 3).map((thread) => (
                <div key={thread.id} className="classic-row compact-row">
                  <div>
                    <strong>{thread.title}</strong>
                    <p>{thread.scriptureTitle ?? thread.topicTitle ?? '讨论'} · {thread.authorName}</p>
                  </div>
                  <Link
                    className="classic-inline-link"
                    to={
                      thread.topicSlug
                        ? `/discussion?topic=${thread.topicSlug}`
                        : thread.scriptureSlug
                          ? `/discussion?scripture=${thread.scriptureSlug}`
                          : '/discussion'
                    }
                  >
                    查看
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="home-section-grid home-section-grid--tertiary">
            <div className="classic-article">
              <div className="section-header-inline">
                <h2>公告通知</h2>
                <Link className="section-header-link" to="/activities">
                  查看更多
                </Link>
              </div>
              {(homeData?.announcements ?? []).slice(0, 2).map((item) => (
                <div key={item.id} className="classic-line-item compact-line-item">
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

export default HomePage;
