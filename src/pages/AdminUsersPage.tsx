import { useCallback, useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import { apiRequest, type AdminUser, getAdminUsers } from '../lib/api';

const roles: Record<string, string> = { user: '读者', reviewer: '历史审核角色（无后台权限）', admin: '管理员' };

export default function AdminUsersPage() {
  const { token, session } = useAppState();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try { setUsers(await getAdminUsers(token)); }
    catch (error) { setError(error instanceof Error ? error.message : '账号列表加载失败。'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  async function update(user: AdminUser, patch: { role?: string; status?: string }) {
    if (!token || busy) return;
    const action = patch.role ? '调整为' + roles[patch.role] : patch.status === 'disabled' ? '停用' : '启用';
    if (!window.confirm('确认将“' + user.name + '”' + action + '？该账号的现有登录会话会失效。')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await apiRequest('/api/admin/users/' + user.id, { method: 'PATCH', body: JSON.stringify(patch) }, token);
      setMessage('“' + user.name + '”的账号设置已更新。');
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : '更新失败。'); }
    finally { setBusy(false); }
  }

  return <section className="admin-section"><div className="admin-panel">
    <div className="results-header"><h2>账号与权限</h2><button type="button" disabled={busy || loading} onClick={() => void load()}>刷新列表</button></div>
    <p>读者管理个人书斋。古籍录入、审核、勘误、账号和站点配置均由管理员处理。</p>
    {error && <p className="feedback-text" role="alert">{error} <button type="button" onClick={() => void load()}>重试</button></p>}
    {message && <p className="feedback-text" role="status">{message}</p>}
    {loading && <p role="status">正在加载账号…</p>}
    {!loading && !error && !users.length && <p>暂无账号。</p>}
    {users.map((user) => <article key={user.id} className="admin-list-row">
      <div><h3>{user.name}{session?.id === user.id ? '（当前账号）' : ''}</h3><p>{roles[user.role] ?? user.role} · {user.status === 'disabled' ? '已停用' : '正常'} · {new Date(user.createdAt).toLocaleDateString('zh-CN')}</p></div>
      <div className="row-actions">
        <label>角色 <select aria-label={user.name + '的角色'} value={user.role} disabled={busy || loading || session?.id === user.id} onChange={(event) => void update(user, { role: event.target.value })}>
          {Object.entries(roles).filter(([value]) => value !== 'reviewer' || user.role === 'reviewer').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <button type="button" disabled={busy || loading || session?.id === user.id} onClick={() => void update(user, { status: user.status === 'disabled' ? 'active' : 'disabled' })}>{user.status === 'disabled' ? '启用账号' : '停用账号'}</button>
      </div>
    </article>)}
    <p className="muted-text">当前管理员的权限由其他管理员调整。站点始终保留至少一名可用管理员。</p>
  </div></section>;
}
