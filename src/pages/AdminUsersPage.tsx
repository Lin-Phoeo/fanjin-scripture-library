import { useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import { type AdminUser, getAdminUsers, updateAdminUserRole } from '../lib/api';

function AdminUsersPage() {
  const { token } = useAppState();
  const [users, setUsers] = useState<AdminUser[]>([]);

  const loadUsers = async () => {
    if (!token) {
      return;
    }
    const data = await getAdminUsers(token);
    setUsers(data);
  };

  useEffect(() => {
    void loadUsers();
  }, [token]);

  return (
    <section className="admin-section">
      <div className="admin-panel">
        <h2>用户权限管理</h2>
        {users.map((user) => (
          <article key={user.id} className="admin-list-row">
            <div>
              <h3>{user.name}</h3>
              <p>
                当前角色 {user.role} · 创建时间 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
              </p>
            </div>
            <select
              value={user.role}
              onChange={async (event) => {
                if (!token) {
                  return;
                }
                await updateAdminUserRole(user.id, event.target.value, token);
                await loadUsers();
              }}
            >
              <option value="user">user</option>
              <option value="reviewer">reviewer</option>
              <option value="admin">admin</option>
            </select>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminUsersPage;
