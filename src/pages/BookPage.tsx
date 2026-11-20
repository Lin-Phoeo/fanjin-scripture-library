import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorNotice } from '../components/AsyncFeedback';
import BookCover from '../components/BookCover';
import Icon from '../components/Icon';
import { bookDescriptions, wordCountLabel } from '../components/LibraryShelf';
import { getBook, safeExternalUrl } from '../lib/books';
import { readingUrl } from '../lib/reading-progress';
import { groupChapters } from '../lib/chapter-groups';
import { useResource } from '../lib/useResource';

export default function BookPage(){
  const {slug=''}=useParams();
  const [query,setQuery]=useState('');
  const {data:book,loading,error,reload}=useResource(()=>getBook(slug),[slug]);
  if(loading)return <main className="page-container"><p role="status">正在打开经典…</p></main>;
  if(!book||error)return <main className="page-container"><h1>暂时无法打开经典</h1><ErrorNotice message={error||'内容暂不可用'} retry={reload}/><Link className="button-secondary" to="/library">返回经藏</Link></main>;
  const chapters=groupChapters(book.passages,book.title);
  const source=safeExternalUrl(book.sourceUrl),license=safeExternalUrl(book.licenseUrl);
  const matches=query.trim()?book.passages.filter((p,i)=>p.title.includes(query.trim())||String(i+1)===query.trim()):[];
  return <main className="page-container book-page">
    <Link className="breadcrumb-link" to="/library">经藏 <Icon name="chevron" size={14}/> {book.school||book.categoryName}</Link>
    <header className="book-overview"><BookCover slug={book.slug} title={book.title}/><div><span className="book-scope">{book.isExcerpt?'节选':'全本'} · {wordCountLabel(book.wordCount)} · {chapters.length} {chapters.length===1?'篇':'章'}</span><h1>{book.title}</h1><p className="book-attribution">{book.dynasty} · {book.translator}</p><p className="book-introduction">{bookDescriptions[book.slug]||book.role}</p><div className="card-actions"><Link className="button" to={readingUrl(book.slug,book.passages[0].slug)}>开始阅读 <Icon name="arrow" size={18}/></Link><Link className="button-secondary" to={'/study?scripture='+encodeURIComponent(book.slug)}>加入日课</Link></div></div></header>
    <section className="chapter-browser"><div className="section-title-row"><h2>目录</h2><label className="search-field"><Icon name="search" size={17}/><input aria-label="查找篇章或段落" value={query} onChange={e=>setQuery(e.target.value)} placeholder="篇章名或段落序号"/></label></div>
      {query.trim()?<div className="chapter-search-results">{matches.length?matches.map(p=><Link key={p.slug} to={readingUrl(book.slug,p.slug)}>{p.title}<Icon name="chevron" size={17}/></Link>):<p>没有找到，换个关键词试试。</p>}</div>:<div className="chapter-list">{chapters.map((chapter,i)=><div className="chapter-line" key={chapter.key}><Link className="chapter-open" to={readingUrl(book.slug,chapter.passages[0].slug)}><span className="chapter-order">{String(i+1).padStart(2,'0')}</span><strong>{chapter.title}</strong><span>{chapter.passages.length} 段</span><Icon name="chevron" size={18}/></Link>{chapter.passages.length>1?<details className="chapter-paragraphs"><summary>段落定位</summary><nav aria-label={chapter.title+'段落'}>{chapter.passages.map((p,j)=><Link key={p.slug} title={p.originalText.slice(0,80)} to={readingUrl(book.slug,p.slug)}>{chapter.start+j+1}</Link>)}</nav></details>:null}</div>)}</div>}
    </section>
    <details className="edition-disclosure"><summary><span>版本与来源</span><span>{book.sourceName||'查看底本与许可'}<Icon name="chevron" size={18}/></span></summary><div className="edition-content"><p>{book.summary}</p><dl><div><dt>底本</dt><dd>{book.edition||'底本待核对'}</dd></div><div><dt>来源</dt><dd>{book.sourceName} {source?<a href={source} target="_blank" rel="noreferrer">原始资料</a>:null}</dd></div><div><dt>范围</dt><dd>{book.isExcerpt?'本次为节选收录。':'本次为所注明正文的完整收录。'} 共 {book.passages.length} 段。</dd></div><div><dt>许可</dt><dd>{book.license||'许可待核对'} {license?<a href={license} target="_blank" rel="noreferrer">许可原文</a>:null}</dd></div></dl><p className="supporting-note">{book.sourceVerified?'来源与许可声明已核对，仍可通过勘误持续完善文本。':'来源信息待核对。'}</p>{book.sourceHeader?<details className="source-header"><summary>完整出版声明</summary><pre>{book.sourceHeader}</pre></details>:null}<a href={import.meta.env.BASE_URL+'content-notices.txt'} target="_blank" rel="noreferrer">本站内容版权说明</a></div></details>
  </main>;
}
