import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { getMyDiscussions, type DiscussionItem, type ReadingHistoryItem, getReadingHistory } from '../lib/api';

function ProfilePage() {
  const { favorites, notes, session, token } = useAppState();
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const [myDiscussions, setMyDiscussions] = useState<DiscussionItem[]>([]);

  useEffect(() => {
    void (async () => {
      if (!token) {
        setHistory([]);
        setMyDiscussions([]);
        return;
      }
      const [historyData, discussionData] = await Promise.all([
        getReadingHistory(token),
        getMyDiscussions(token),
      ]);
      setHistory(historyData);
      setMyDiscussions(discussionData);
    })();
  }, [token]);

  return (
    <main className="content-page">
      <section className="page-hero">
        <p className="eyebrow">个人中心</p>
        <h1>{session?.name ?? '尚未登录'}</h1>
        <p className="page-lead">
          {session ? `${session.role} · 当前为前端演示账号状态` : '登录后可同步收藏经典、摘录体会和共修参与记录。'}
        </p>
      </section>

      <section className="stat-grid">
        <article className="overview-card">
          <span className="overview-label">收藏经典</span>
          <strong>{favorites.length} 部</strong>
        </article>
        <article className="overview-card">
          <span className="overview-label">摘录记录</span>
          <strong>{notes.length} 条</strong>
        </article>
        <article className="overview-card">
          <span className="overview-label">账号状态</span>
          <strong>{session ? '已登录' : '访客'}</strong>
        </article>
        <article className="overview-card">
          <span className="overview-label">我的讨论</span>
          <strong>{myDiscussions.length} 条</strong>
        </article>
      </section>

      <section className="card-grid">
        <article className="content-card">
          <h2>我的收藏与摘录</h2>
          <p>查看重点经句、管理摘录备注，并快速跳回原文位置继续阅读。</p>
          <Link className="primary-link" to="/notes">
            进入管理
          </Link>
        </article>
        <article className="content-card">
          <h2>继续阅读</h2>
          <p>你可以回到经藏页继续浏览，或直接从最近阅读记录返回到上次停留位置。</p>
          <div className="card-actions">
            <Link className="primary-link" to="/canon">
              浏览经藏
            </Link>
            <Link className="secondary-link" to="/search">
              打开搜索
            </Link>
          </div>
        </article>
        <article className="content-card">
          <h2>我的讨论</h2>
          <p>回到你发起过的共修主题，继续查看回复与补充讨论内容。</p>
          <Link className="primary-link" to="/discussion">
            打开讨论区
          </Link>
        </article>
      </section>

      <section className="public-panel">
        <div className="results-header">
          <h2>最近阅读</h2>
          <span>{history.length} 条记录</span>
        </div>
        <div className="list-stack compact-stack public-list-stack">
          {history.length ? (
            history.map((item) => (
              <article key={item.id} className="list-card">
                <div>
                  <span className="content-kicker">{new Date(item.viewedAt).toLocaleString('zh-CN')}</span>
                  <h3>{item.scriptureTitle}</h3>
                  <p>{item.passageTitle ?? '经典入口'}</p>
                </div>
                <Link
                  className="header-button"
                  to={`/reader/${item.scriptureSlug}${item.passageSlug ? `?passage=${item.passageSlug}` : ''}`}
                >
                  继续阅读
                </Link>
              </article>
            ))
          ) : (
            <article className="list-card">
              <p>登录后阅读过的经典会记录在这里。</p>
            </article>
          )}
        </div>
      </section>

      <section className="public-panel">
        <div className="results-header">
          <h2>我发起的讨论</h2>
          <span>{myDiscussions.length} 条主题</span>
        </div>
        <div className="list-stack compact-stack public-list-stack">
          {myDiscussions.length ? (
            myDiscussions.map((item) => (
              <article key={item.id} className="list-card">
                <div>
                  <span className="content-kicker">{item.scriptureTitle ?? item.topicTitle ?? '我的讨论'}</span>
                  <h3>{item.title}</h3>
                  <p>
                    {item.repliesCount} 条回复 · {item.likesCount} 次赞同
                  </p>
                </div>
                <Link
                  className="header-button"
                  to={
                    item.topicSlug
                      ? `/discussion?topic=${item.topicSlug}&discussion=${item.id}`
                      : item.scriptureSlug
                        ? `/discussion?scripture=${item.scriptureSlug}&discussion=${item.id}`
                        : `/discussion?discussion=${item.id}`
                  }
                >
                  查看讨论
                </Link>
              </article>
            ))
          ) : (
            <article className="list-card">
              <p>登录后你发起过的讨论会显示在这里。</p>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}

export default ProfilePage;
