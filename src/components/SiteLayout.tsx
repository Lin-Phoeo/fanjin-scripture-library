import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { frontNavigation } from '../data/site';

const routePrefetchers: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/HomePage'),
  '/canon': () => import('../pages/CanonLibraryPage'),
  '/reader/diamond': () => import('../pages/ReaderPage'),
  '/sages': () => import('../pages/SagesPage'),
  '/topics': () => import('../pages/TopicsPage'),
  '/activities': () => import('../pages/ActivitiesPage'),
  '/search': () => import('../pages/SearchPage'),
  '/discussion': () => import('../pages/DiscussionPage'),
  '/auth': () => import('../pages/AuthPage'),
  '/profile': () => import('../pages/ProfilePage'),
  '/notes': () => import('../pages/NotesPage'),
  '/admin': () => import('../pages/AdminDashboardPage'),
};

function SiteLayout() {
  const { loading, session } = useAppState();
  const prefetchRoute = (to: string) => {
    void routePrefetchers[to]?.();
  };

  useEffect(() => {
    const idle = window.setTimeout(() => {
      prefetchRoute('/reader/diamond');
      prefetchRoute('/sages');
      prefetchRoute('/search');
      prefetchRoute('/discussion');
    }, 900);

    return () => window.clearTimeout(idle);
  }, []);

  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand-lockup">
            <NavLink className="brand-mark" to="/">
              梵烬网
            </NavLink>
            <span className="brand-subtitle">佛教共修公益古籍网</span>
          </div>
          <nav className="site-nav" aria-label="站点导航">
            {frontNavigation.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
                to={item.to}
                onMouseEnter={() => prefetchRoute(item.to)}
                onFocus={() => prefetchRoute(item.to)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <NavLink
              className="header-link"
              to={session ? '/profile' : '/auth'}
              onMouseEnter={() => prefetchRoute(session ? '/profile' : '/auth')}
              onFocus={() => prefetchRoute(session ? '/profile' : '/auth')}
            >
              {session ? `当前用户：${session.name}` : '登录 / 注册'}
            </NavLink>
            <NavLink
              className="header-button"
              to={session ? '/profile' : '/auth'}
              onMouseEnter={() => prefetchRoute(session ? '/profile' : '/auth')}
              onFocus={() => prefetchRoute(session ? '/profile' : '/auth')}
            >
              {session ? '个人中心' : '进入账号'}
            </NavLink>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="loading-banner">正在同步梵烬网数据…</div>
      ) : null}

      <Outlet />

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <h3>梵烬网</h3>
            <p>佛教古籍共修门户</p>
          </div>
          <div>
            <h4>共修入口</h4>
            <Link to="/canon">经藏浏览</Link>
            <Link to="/topics">专题共修</Link>
            <Link to="/activities">活动安排</Link>
          </div>
          <div>
            <h4>账户入口</h4>
            <Link to="/auth">账号系统</Link>
            <Link to="/profile">个人中心</Link>
            <Link to="/admin">后台管理</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default SiteLayout;
