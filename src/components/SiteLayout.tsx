import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { frontNavigation } from '../data/site';
import { getPublicSettings } from '../lib/api';
import { useResource } from '../lib/useResource';

function SiteLayout() {
  const { storageError } = useAppState();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: settings, reload } = useResource(getPublicSettings);
  const brandName = settings?.site_name || '梵烬';
  const subtitle = settings?.site_subtitle || '东方经典个人自修驿站';
  useEffect(() => { const listener = () => reload(); window.addEventListener('fanjin-settings-updated', listener); return () => window.removeEventListener('fanjin-settings-updated', listener); }, [reload]);
  useEffect(() => { setMenuOpen(false); if (!(location.pathname.startsWith('/read/') || location.pathname.startsWith('/reader/'))) window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  useEffect(() => { document.title = `${frontNavigation.find((item) => item.to === location.pathname)?.label ?? (location.pathname.startsWith('/reader/') || location.pathname.startsWith('/read/') ? '静心阅读' : '我的书斋')} · ${brandName} · ${subtitle}`; document.querySelector('meta[name="description"]')?.setAttribute('content', settings?.site_description || '公益阅读佛道与诸子经典，保存私人摘录、心得与日常功课。'); }, [location.pathname, settings, brandName, subtitle]);
  return <div className="page-shell reading-site">
    <button className="skip-link" type="button" onClick={() => document.getElementById('main-content')?.focus()}>跳至正文</button>
    <header className="reading-header"><div className="reading-header-inner">
      <Link className="reading-brand" to="/" aria-label={`${brandName} · ${subtitle}`}><span className="brand-seal" aria-hidden="true">梵</span><span><strong>{brandName}</strong><small>{subtitle}</small></span></Link>
      <button className="mobile-menu" type="button" aria-label={menuOpen ? '关闭导航' : '打开导航'} aria-expanded={menuOpen} aria-controls="reading-navigation" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? '关闭' : '目录'}</button>
      <nav id="reading-navigation" className={menuOpen ? 'reading-nav is-open' : 'reading-nav'} aria-label="主导航">{frontNavigation.map((item) => <NavLink key={item.to} end={item.to === '/'} to={item.to} className={({ isActive }) => isActive ? 'is-current' : ''}>{item.label}</NavLink>)}</nav>
      <Link className="reading-account" to="/profile">本机书斋</Link>
    </div></header>
    <div className="local-storage-notice">记录保存在此浏览器，无云端同步。<Link to="/profile">备份 / 导入</Link></div>{storageError ? <p className="local-storage-error" role="alert">{storageError}</p> : null}<div id="main-content" tabIndex={-1}><Outlet /></div>
    <footer className="reading-footer"><div><Link className="footer-brand" to="/">{brandName}</Link><p>{settings?.footer_notice || '为阅读留一方清净，为自己留一点时间。'}</p><small>公益开放 · 私人自修 · 各版本来源与许可见经典详情</small></div><nav aria-label="页脚导航"><Link to="/library">浏览经藏</Link><Link to="/study">我的自修</Link><Link to="/notes">私人摘录</Link><Link to="/about">关于梵烬</Link><Link to="/privacy">隐私说明</Link><a href={`${import.meta.env.BASE_URL}content-notices.txt`} target="_blank" rel="noreferrer">内容来源与转载说明</a></nav><div className="footer-note">佛道为本，兼读诸子。<br />一卷一念，各有所得。</div></footer>
    <nav className="mobile-bottom-nav" aria-label="移动导航"><NavLink end to="/">首页</NavLink><NavLink to="/library">经藏</NavLink><NavLink to="/study">自修</NavLink><NavLink to="/profile">我的</NavLink></nav>
  </div>;
}
export default SiteLayout;
