import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';

function AuthPage() {
  const navigate = useNavigate();
  const { session, signIn, signOut, signUp } = useAppState();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('fanjin123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSignIn = () => {
    void (async () => {
      const result = await signIn(name, password);
      if (!result.ok) {
        setMessage(result.message ?? '登录失败');
        return;
      }

      setMessage('');
      navigate('/profile');
    })();
  };

  const handleSignUp = () => {
    void (async () => {
      if (password !== confirmPassword) {
        setMessage('两次输入的密码不一致。');
        return;
      }

      const result = await signUp(name, password);
      if (!result.ok) {
        setMessage(result.message ?? '注册失败');
        return;
      }

      setMessage('');
      navigate('/profile');
    })();
  };

  return (
    <main className="content-page auth-page">
      <section className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">账号系统</p>
          <h1>{mode === 'sign-in' ? '登录后可使用收藏、摘录、讨论与共修记录。' : '注册后即可进入个人中心，开始共修与沉淀记录。'}</h1>
          <p className="page-lead">当前已接入基础注册与登录。找回密码和更完整的账号安全机制仍是后续上线前需要补齐的部分。</p>
          <div className="classic-reader-meta auth-notes">
            <span>登录后可同步收藏经典、摘录和阅读历史</span>
            <span>普通用户、审核员、管理员都可按权限进入不同区域</span>
          </div>
        </div>

        <form className="auth-form auth-form-classic" onSubmit={(event) => event.preventDefault()}>
          <div className="row-actions">
            <button className={mode === 'sign-in' ? 'primary-link button-reset' : 'secondary-link button-reset'} type="button" onClick={() => setMode('sign-in')}>
              登录
            </button>
            <button className={mode === 'sign-up' ? 'primary-link button-reset' : 'secondary-link button-reset'} type="button" onClick={() => setMode('sign-up')}>
              注册
            </button>
          </div>
          <label>
            法名 / 昵称
            <input type="text" placeholder="请输入你的昵称" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            密码
            <input type="password" placeholder="请输入密码" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {mode === 'sign-up' ? (
            <label>
              确认密码
              <input
                type="password"
                placeholder="请再次输入密码"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          ) : null}
          <div className="card-actions">
            <button
              className="primary-link button-reset"
              type="button"
              onClick={mode === 'sign-in' ? handleSignIn : handleSignUp}
            >
              {mode === 'sign-in' ? (session ? '切换账号' : '登录') : '注册并登录'}
            </button>
            {session ? (
              <button className="secondary-link button-reset" type="button" onClick={signOut}>
                退出登录
              </button>
            ) : (
              <button className="secondary-link button-reset" type="button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
                {mode === 'sign-in' ? '切换到注册' : '切换到登录'}
              </button>
            )}
          </div>
          {message ? <p className="feedback-text">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
