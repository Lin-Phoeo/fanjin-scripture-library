import { useI18n } from '../lib/i18n';
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
  const { t, displayText } = useI18n();

  const {slug=''}=useParams();
  const [query,setQuery]=useState('');
  const {data:book,loading,error,reload}=useResource(()=>getBook(slug),[slug]);
  if(loading)return <main className="page-container"><p role="status">{t("正在打开经典…")}</p></main>;
  if(!book||error)return <main className="page-container"><h1>{t("暂时无法打开经典")}</h1><ErrorNotice message={error||'内容暂不可用'} retry={reload}/><Link className="button-secondary" to="/library">{t("返回经藏")}</Link></main>;
  const chapters=groupChapters(book.passages,book.title);
  const source=safeExternalUrl(book.sourceUrl),license=safeExternalUrl(book.licenseUrl);
  const staticSource=(value?:string)=>value&&/^content-sources\/[a-zA-Z0-9._-]+$/.test(value)?import.meta.env.BASE_URL+value:undefined;
  const sourceFile=staticSource(book.sourceFileUrl),sourceHeader=staticSource(book.sourceHeaderUrl);
  const matches=query.trim()?book.passages.filter((p,i)=>displayText(p.title).includes(query.trim())||p.title.includes(query.trim())||String(i+1)===query.trim()):[];
  return <main className="page-container book-page">
    <Link className="breadcrumb-link" to="/library">{t("经藏")}<Icon name="chevron" size={14}/> {displayText(book.school)||displayText(book.categoryName)}</Link>
    <header className="book-overview"><BookCover slug={book.slug} title={book.title}/><div><span className="book-scope">{book.isExcerpt?t('节选'):t('全本')} · {t(wordCountLabel(book.wordCount))} · {chapters.length} {chapters.length===1?t('篇'):t('章')}</span><h1>{displayText(book.title)}</h1><p className="book-attribution">{displayText(book.dynasty)} · {displayText(book.translator)}</p><p className="book-introduction">{displayText(bookDescriptions[book.slug]||book.role)}</p><div className="card-actions"><Link className="button" to={readingUrl(book.slug,book.passages[0].slug)}>{t("开始阅读")}<Icon name="arrow" size={18}/></Link><Link className="button-secondary" to={'/study?scripture='+encodeURIComponent(book.slug)}>{t("加入日课")}</Link></div></div></header>
    <section className="chapter-browser"><div className="section-title-row"><h2>{t("目录")}</h2><label className="search-field"><Icon name="search" size={17}/><input aria-label={t("查找篇章或段落")} value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("篇章名或段落序号")}/></label></div>
      {query.trim()?<div className="chapter-search-results">{matches.length?matches.map(p=><Link key={p.slug} to={readingUrl(book.slug,p.slug)}>{displayText(p.title)}<Icon name="chevron" size={17}/></Link>):<p>{t("没有找到，换个关键词试试。")}</p>}</div>:<div className="chapter-list">{chapters.map((chapter,i)=><div className="chapter-line" key={chapter.key}><Link className="chapter-open" to={readingUrl(book.slug,chapter.passages[0].slug)}><span className="chapter-order">{String(i+1).padStart(2,'0')}</span><strong>{displayText(chapter.title)}</strong><span>{chapter.passages.length}{t("段")}</span><Icon name="chevron" size={18}/></Link>{chapter.passages.length>1?<details className="chapter-paragraphs"><summary>{t("段落定位")}</summary><nav aria-label={t(chapter.title+'段落')}>{chapter.passages.map((p,j)=><Link key={p.slug} title={p.originalText.slice(0,80)} to={readingUrl(book.slug,p.slug)}>{chapter.start+j+1}</Link>)}</nav></details>:null}</div>)}</div>}
    </section>
    <details className="edition-disclosure"><summary><span>{t("版本与来源")}</span><span>{displayText(book.sourceName)||t('查看底本与许可')}<Icon name="chevron" size={18}/></span></summary><div className="edition-content"><p>{displayText(book.summary)}</p><dl><div><dt>{t("底本")}</dt><dd>{displayText(book.edition)||t('底本待核对')}</dd></div><div><dt>{t("来源")}</dt><dd>{displayText(book.sourceName)} {source?<a href={source} target="_blank" rel="noreferrer">{t("原始资料")}</a>:null}</dd></div><div><dt>{t("范围")}</dt><dd>{book.isExcerpt?t('本次为节选收录。'):t('本次为所注明正文的完整收录。')}{t("共")}{book.passages.length}{t("段。")}</dd></div><div><dt>{t("许可")}</dt><dd>{book.license||t('许可待核对')} {license?<a href={license} target="_blank" rel="noreferrer">{t("许可原文")}</a>:null}</dd></div></dl><p className="supporting-note">{book.sourceVerified?t('来源与许可声明已核对，仍可通过勘误持续完善文本。'):t('来源信息待核对。')}</p>{book.sourceHeader?<details className="source-header"><summary>{t("完整出版声明")}</summary><pre>{book.sourceHeader}</pre></details>:null}{sourceHeader?<p><a href={sourceHeader} target="_blank" rel="noreferrer">{t('下载完整出版声明')}</a></p>:null}{sourceFile?<p><a href={sourceFile} target="_blank" rel="noreferrer">{t('下载来源原始文件')}</a></p>:null}<a href={import.meta.env.BASE_URL+'content-notices.txt'} target="_blank" rel="noreferrer">{t("本站内容版权说明")}</a></div></details>
  </main>;
}
