import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';

const adminNavigation = [
  { label: '后台首页', to: '/admin' },
  { label: '经文录入', to: '/admin/editor' },
  { label: '专题管理', to: '/admin/topics' },
  { label: '内容审核', to: '/admin/review' },
  { label: '活动管理', to: '/admin/activities' },
  { label: '用户权限', to: '/admin/users' },
  { label: '系统配置', to: '/admin/settings' },
] as const;

function AdminLayout() {
  const { token, session, loading } = useAppState();

  // 本地是否有已保存的登录凭据（与 AppStateContext 的 STORAGE_KEY 一致）
  const hasSavedToken =
    typeof window !== 'undefined' && window.localStorage.getItem('fanjin-auth-token') !== null;

  // 本地无凭据：必然未登录，直接回登录页
  if (!hasSavedToken) {
    return <Navigate replace to="/auth" />;
  }

  // 有凭据但会话尚未恢复完成：等待，避免把「恢复中」误判成「未登录」
  if (loading || !session) {
    return (
      <div className="admin-shell">
        <main className="admin-main">
          <div className="admin-topbar">
            <div>
              <h1>佛教古籍管理后台</h1>
              <p>正在校验登录状态…</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 已登录但无后台权限：回前台
  if (session.role !== 'admin' && session.role !== 'reviewer') {
    return <Navigate replace to="/" />;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span>梵烬网后台</span>
          <small>内容治理与信息化管理</small>
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
            <h1>佛教古籍管理后台</h1>
            <p>面向经典录入、注义审核、角色权限和专题运营的一体化工作台。</p>
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
