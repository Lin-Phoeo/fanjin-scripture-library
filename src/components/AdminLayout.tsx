import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';

const adminNavigation = [
  { label: '后台首页', to: '/admin' },
  { label: '古籍录入', to: '/admin/editor' },
  { label: '内容审核', to: '/admin/review' },
  { label: '读者勘误', to: '/admin/corrections' },
  { label: '用户权限', to: '/admin/users' },
  { label: '系统配置', to: '/admin/settings' },
] as const;

function AdminLayout() {
  const { session, loading } = useAppState();
  const location = useLocation();
  if (loading) return <div className="route-loading" role="status">正在核验账号…</div>;
  if (!session) return <Navigate replace to={`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`} />;
  if (session.role !== 'admin') {
    return <main className="page-shell"><section className="section-card"><h1>暂无后台访问权限</h1><p>当前账号可继续阅读古籍、安排个人修习和管理摘录。</p><Link className="button-primary" to="/">返回首页</Link></section></main>;
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span>梵烬网后台</span>
          <small>公益经藏与个人自修驿站</small>
        </div>
        <nav className="admin-nav">
          {adminNavigation.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => (isActive ? 'admin-link is-active' : 'admin-link')}
              to={item.to}
              end={item.to === '/admin'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1>古籍内容管理</h1>
            <p>{session.name} · 管理员 · 佛道典籍与诸子著作</p>
          </div>
          <NavLink className="header-button" to="/">
            返回前台
          </NavLink>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
