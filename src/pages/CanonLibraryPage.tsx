import { useI18n } from '../lib/i18n';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getScriptures } from '../lib/api';
import { useResource } from '../lib/useResource';
import { usePersonalPreferences } from '../lib/personal-preferences';
import { rankBooks } from '../lib/recommendations';
import LibraryShelf, { type ShelfTitle } from '../components/LibraryShelf';
import { ErrorNotice } from '../components/AsyncFeedback';
import Icon from '../components/Icon';

export default function CanonLibraryPage() {
  const { t, displayText } = useI18n();

  const [params,setParams]=useSearchParams();
  const q=params.get('q')||'';
  const school=params.get('school')||'';
  const category=params.get('category')||'';
  const sort=params.get('sort')==='personal'?'personal':'default';
  const preferences=usePersonalPreferences();
  const {data,loading,error,reload}=useResource(()=>getScriptures());
  const all=(data||[]) as ShelfTitle[];
  const schools=['佛家','道家','儒家','诸子'].filter(value=>all.some(book=>book.school===value));
  const normalizedQuery=displayText(q,'sc').toLowerCase();
  const filtered=all.filter(book=>(!q||displayText([book.title,book.titleSc,book.titleTc,book.translator].join(' '),'sc').toLowerCase().includes(normalizedQuery))&&(!school||book.school===school)&&(!category||book.categorySlug===category));
  const preferred=sort==='personal'?rankBooks(filtered,preferences.value):filtered;
  const slugs=new Set(preferred.map(book=>book.slug));
  const books=sort==='personal'?[...preferred,...filtered.filter(book=>!slugs.has(book.slug))]:filtered;
  const pageSize=18;
  const pages=Math.max(1,Math.ceil(books.length/pageSize));
  const rawPage=Number(params.get('page')||1);
  const page=Math.min(pages,Math.max(1,Number.isSafeInteger(rawPage)?rawPage:1));
  const pageBooks=books.slice((page-1)*pageSize,page*pageSize);
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[page]);
  function change(key:string,value:string){const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);if(key!=='page')next.delete('page');if(key==='school')next.delete('category');setParams(next,{replace:key!=='page'});}
  return <main className="page-container library-page">
    <header className="page-title-row"><div><h1>{t("经藏")}</h1><p>{t("佛道为主，兼读百家。")}</p></div><span className="quiet-count">{all.length}{t("部原典")}</span></header>
    <div className="collection-toolbar"><div className="segment-tabs" role="group" aria-label={t("学派筛选")}>{['',...schools].map(value=><button type="button" key={value} aria-pressed={school===value} onClick={()=>change('school',value)}>{t(value||'全部')}</button>)}</div>
      <label className="search-field"><Icon name="search" size={18}/><input aria-label={t("搜索书名或作者")} value={q} maxLength={100} onChange={e=>change('q',e.target.value)} placeholder={t("书名或作者")}/></label>
      <label className="sort-control"><span className="sr-only">{t("书目排序")}</span><select value={sort} onChange={e=>change('sort',e.target.value==='default'?'':e.target.value)}><option value="default">{t("默认排序")}</option><option value="personal">{t("按阅读偏好")}</option></select></label>
    </div>
    {category?<div className="active-filter">{t("已按分类筛选")}<button type="button" onClick={()=>change('category','')}>{t("清除")}</button></div>:null}
    {sort==='personal'?<p className="supporting-note">{t("依据你设置的兴趣与阅读时间排列，完整书目始终保留。")}</p>:null}
    <ErrorNotice message={error} retry={reload}/>
    {loading?<div className="book-loading" role="status">{t("正在打开经藏…")}</div>:books.length?<><LibraryShelf books={pageBooks}/>{pages>1?<nav className="pagination" aria-label={t('经藏分页')}><button className="button-secondary" disabled={page===1} onClick={()=>change('page',String(page-1))}>{t('上一页')}</button><span>{t(`第 ${page} / ${pages} 页 · ${books.length} 部`)}</span><button className="button-secondary" disabled={page===pages} onClick={()=>change('page',String(page+1))}>{t('下一页')}</button></nav>:null}</>:!error?<div className="empty-state"><Icon name="book" size={32}/><h2>{t("没有找到匹配的经典")}</h2><button className="button-secondary" onClick={()=>setParams({})}>{t("查看全部")}</button></div>:null}
  </main>;
}
