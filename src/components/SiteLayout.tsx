import { useI18n } from '../lib/i18n';
import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import Icon from './Icon';

const navigation = [{to:'/',label:'书架',icon:'book'},{to:'/library',label:'经藏',icon:'search'},{to:'/notes',label:'摘录',icon:'note'},{to:'/study',label:'日课',icon:'calendar'}] as const;
export default function SiteLayout() {
  const { t, script, setScript } = useI18n();

  const { storageError } = useAppState();
  const location=useLocation();
  const reading=/^\/(read|reader)\//.test(location.pathname);
  useEffect(()=>{if(!reading)window.scrollTo({top:0,behavior:'instant'});},[location.pathname,reading]);
  useEffect(()=>{document.title=t((reading?'阅读':navigation.find(item=>item.to===location.pathname)?.label||'梵烬')+' · 梵烬');},[location.pathname,reading,t]);
  return <div className={'app-shell reading-site'+(reading?' is-reading':'')}>
    <button className="skip-link" onClick={()=>document.getElementById('main-content')?.focus()}>{t("跳至正文")}</button>
    <header className="app-header"><div className="app-header-inner">
      <Link className="app-brand" to="/" aria-label={t("梵烬书架")}><span className="brand-sign">{t("梵")}</span><strong>{t("梵烬")}</strong></Link>
      <nav className="desktop-navigation" aria-label={t("主导航")}>{navigation.map(item=><NavLink key={item.to} end={item.to==='/'} to={item.to}>{t(item.label)}</NavLink>)}</nav>
      <div className="header-utilities"><button className="script-switch" type="button" aria-label={script==='sc'?'切換為繁體中文':'切换为简体中文'} onClick={()=>setScript(script==='sc'?'tc':'sc')}>{script==='sc'?'繁':'简'}</button><Link className="icon-button" to="/search" aria-label={t("搜索原文")}><Icon name="search"/></Link><Link className="header-library-link" to="/profile"><Icon name="settings" size={19}/><span>{t("我的")}</span></Link></div>
    </div></header>
    {storageError?<p className="storage-error" role="alert">{storageError}<Link to="/profile">{t("管理数据")}</Link></p>:null}
    <div id="main-content" tabIndex={-1}><Outlet/></div>
    {!reading?<footer className="app-footer"><span>{t("梵烬 · 公益阅读")}</span><nav aria-label={t("网站说明")}><Link to="/profile">{t("本机保存与备份")}</Link><Link to="/about">{t("关于")}</Link><Link to="/privacy">{t("隐私")}</Link><a href={import.meta.env.BASE_URL+'content-notices.txt'} target="_blank" rel="noreferrer">{t("版权")}</a></nav></footer>:null}
    {!reading?<nav className="mobile-navigation" aria-label={t("移动导航")}>{navigation.map(item=><NavLink end={item.to==='/'} key={item.to} to={item.to}><Icon name={item.icon}/><span>{t(item.label)}</span></NavLink>)}</nav>:null}
  </div>;
}
