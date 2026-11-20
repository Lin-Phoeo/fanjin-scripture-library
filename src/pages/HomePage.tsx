import { useI18n } from '../lib/i18n';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { getScriptures } from '../lib/api';
import { getLibrary } from '../lib/workbench-api';
import { latestProgress, readingUrl } from '../lib/reading-progress';
import { useResource } from '../lib/useResource';
import LibraryShelf, { type ShelfTitle } from '../components/LibraryShelf';
import BookCover from '../components/BookCover';
import Icon from '../components/Icon';
import { ErrorNotice } from '../components/AsyncFeedback';

export default function HomePage(){
  const { t, displayText } = useI18n();

  const {token,notes,loading:accountLoading}=useAppState();
  const catalog=useResource(()=>getScriptures());
  const shelf=useResource(()=>getLibrary(token));
  const progress=useResource(latestProgress);
  const [filter,setFilter]=useState<'all'|'reading'|'favorites'>('all');
  const [query,setQuery]=useState('');
  const recent=progress.data;
  const hasBooks=!!shelf.data?.items.length;
  const items=(shelf.data?.items||[]).filter(book=>(!query||(book.title.includes(query)||displayText(book.title).includes(query)))&&(filter!=='reading'||book.progressAt)&&(filter!=='favorites'||book.favorite));
  const loading=accountLoading||shelf.loading||catalog.loading;
  return <main className="page-container shelf-page">
    <header className="page-title-row"><div><h1>{hasBooks?t('我的书架'):t('从一卷开始')}</h1><p>{hasBooks?t('接着上次的书页。'):t('挑一本，直接读。')}</p></div><Link className="button-quiet" to="/profile"><Icon name="download" size={17}/>{t("数据备份")}</Link></header>
    <ErrorNotice message={shelf.error||catalog.error} retry={()=>{shelf.reload();catalog.reload();}}/>
    {recent?<section className="continue-volume"><BookCover compact slug={recent.scriptureSlug} title={recent.scriptureTitle}/><div><span className="continue-label">{t("继续阅读")}</span><h2>{displayText(recent.scriptureTitle)}</h2><p>{displayText(recent.passageTitle)}</p></div><Link className="button" to={readingUrl(recent.scriptureSlug,recent.passageSlug)}>{t("接着读")}<Icon name="arrow" size={18}/></Link></section>:null}
    {loading?<p className="book-loading" role="status">{t("正在打开书架…")}</p>:hasBooks?<>
      <div className="collection-toolbar"><div className="segment-tabs" role="group" aria-label={t("书架筛选")}>{([['all','全部'],['reading','在读'],['favorites','收藏']] as const).map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{t(label)}</button>)}</div><label className="search-field"><Icon name="search" size={18}/><input aria-label={t("查找书架中的书")} placeholder={t("找一本书")} value={query} onChange={e=>setQuery(e.target.value)}/></label><Link className="button-quiet" to="/library">{t("添加经典")}<Icon name="book" size={17}/></Link></div>
      {items.length?<div className="personal-shelf">{items.map(book=><article className="personal-volume" key={book.slug}><BookCover compact slug={book.slug} title={book.title}/><div className="personal-volume-copy"><h2>{displayText(book.title)}</h2><p>{displayText(book.passageTitle)||t('尚未开始')}{book.publishStatus!=='published'?t(' · 暂不可读'):''}</p><div className="record-markers">{book.bookmarksCount?<span><Icon name="bookmark" size={14}/>{book.bookmarksCount}</span>:null}{book.notesCount?<span><Icon name="note" size={14}/>{book.notesCount}</span>:null}{book.passageOrder?<span>{t("第")}{book.passageOrder} / {book.totalPassages}{t("段")}</span>:null}</div></div>{book.publishStatus==='published'?<Link className="icon-button" aria-label={t('继续阅读'+book.title)} to={book.passageSlug?readingUrl(book.slug,book.passageSlug):'/read/'+book.slug}><Icon name="arrow"/></Link>:null}</article>)}</div>:<div className="empty-state"><p>{t("没有匹配的书")}</p><button className="button-secondary" onClick={()=>{setFilter('all');setQuery('');}}>{t("重置筛选")}</button></div>}
    </>:<><LibraryShelf books={(catalog.data||[]).slice(0,6) as ShelfTitle[]}/><div className="catalog-view-all"><Link className="button-secondary" to="/library">{t(`查看全部 ${catalog.data?.length||0} 部经典`)}<Icon name="arrow" size={17}/></Link></div></>}
    {hasBooks&&notes.length?<section className="recent-writing"><div className="section-title-row"><h2>{t("最近写下")}</h2><Link className="button-quiet" to="/notes">{t("全部摘录")}<Icon name="chevron" size={16}/></Link></div>{notes.slice(0,2).map(note=><Link key={note.id} className="recent-note" to={readingUrl(note.scriptureSlug,note.passageSlug)}><span>{displayText(note.scriptureTitle)}</span><p>{note.note||note.excerpt}</p><Icon name="chevron" size={18}/></Link>)}</section>:null}
    {!hasBooks?<div className="local-save-hint"><Icon name="info" size={17}/><span>{t("读过的书会自动留在书架。个人记录仅保存在此浏览器。")}</span><Link to="/profile">{t("管理")}</Link></div>:null}
  </main>;
}
