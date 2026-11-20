import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getScriptures } from '../lib/api';
import { useResource } from '../lib/useResource';
import { usePersonalPreferences } from '../lib/personal-preferences';
import { rankBooks } from '../lib/recommendations';
import LibraryShelf, { type ShelfTitle } from '../components/LibraryShelf';
import { ErrorNotice } from '../components/AsyncFeedback';
import Icon from '../components/Icon';

export default function CanonLibraryPage() {
  const [params,setParams]=useSearchParams();
  const q=params.get('q')||'';
  const school=params.get('school')||'';
  const category=params.get('category')||'';
  const [sort,setSort]=useState('default');
  const preferences=usePersonalPreferences();
  const {data,loading,error,reload}=useResource(()=>getScriptures());
  const all=(data||[]) as ShelfTitle[];
  const schools=['佛家','道家','儒家','诸子'].filter(value=>all.some(book=>book.school===value));
  const filtered=all.filter(book=>(!q||(book.title+' '+book.translator).includes(q))&&(!school||book.school===school)&&(!category||book.categorySlug===category));
  const preferred=sort==='personal'?rankBooks(filtered,preferences.value):filtered;
  const slugs=new Set(preferred.map(book=>book.slug));
  const books=sort==='personal'?[...preferred,...filtered.filter(book=>!slugs.has(book.slug))]:filtered;
  function change(key:string,value:string){const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);if(key==='school')next.delete('category');setParams(next,{replace:true});}
  return <main className="page-container library-page">
    <header className="page-title-row"><div><h1>经藏</h1><p>佛道为主，兼读百家。</p></div><span className="quiet-count">{all.length} 部原典</span></header>
    <div className="collection-toolbar"><div className="segment-tabs" role="group" aria-label="学派筛选">{['',...schools].map(value=><button type="button" key={value} aria-pressed={school===value} onClick={()=>change('school',value)}>{value||'全部'}</button>)}</div>
      <label className="search-field"><Icon name="search" size={18}/><input aria-label="搜索书名或作者" value={q} maxLength={100} onChange={e=>change('q',e.target.value)} placeholder="书名或作者"/></label>
      <label className="sort-control"><span className="sr-only">书目排序</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="default">默认排序</option><option value="personal">按阅读偏好</option></select></label>
    </div>
    {category?<div className="active-filter">已按分类筛选 <button type="button" onClick={()=>change('category','')}>清除</button></div>:null}
    {sort==='personal'?<p className="supporting-note">依据你设置的兴趣与阅读时间排列，完整书目始终保留。</p>:null}
    <ErrorNotice message={error} retry={reload}/>
    {loading?<div className="book-loading" role="status">正在打开经藏…</div>:books.length?<LibraryShelf books={books}/>:!error?<div className="empty-state"><Icon name="book" size={32}/><h2>没有找到匹配的经典</h2><button className="button-secondary" onClick={()=>setParams({})}>查看全部</button></div>:null}
  </main>;
}
