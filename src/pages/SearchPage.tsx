import { useI18n } from '../lib/i18n';
import { useEffect,useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { readingUrl } from '../lib/reading-progress';
import Icon from '../components/Icon';

type Results={items:{scriptureSlug:string;scriptureTitle:string;categoryName:string;passageSlug:string;passageTitle:string;field:string;excerpt:string;matchText?:string}[];total:number;page:number;pageSize:number};
function Hit({text,query}:{text:string;query:string}){const i=text.toLowerCase().indexOf(query.toLowerCase());return !query||i<0?<>{text}</>:<>{text.slice(0,i)}<mark>{text.slice(i,i+query.length)}</mark>{text.slice(i+query.length)}</>;}
export default function SearchPage(){
  const { t, displayText } = useI18n();

  const [params,setParams]=useSearchParams(),q=params.get('q')||'',scope=params.get('scope')||'all',page=Number(params.get('page')||1);
  const [keyword,setKeyword]=useState(q),[result,setResult]=useState<Results|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>setKeyword(q),[q]);
  useEffect(()=>{const controller=new AbortController();if(!q){setResult(null);setLoading(false);setError('');return;}setLoading(true);setError('');apiRequest<Results>('/api/search?'+new URLSearchParams({q,scope,page:String(page)}),{signal:controller.signal}).then(setResult).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'检索失败，请重试');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[q,scope,page,retry]);
  return <main className="page-container search-page"><header className="page-title-row"><div><h1>{t("搜索原文")}</h1><p>{t("输入一句话，回到它的上下文。")}</p></div></header>
    <form className="full-search" onSubmit={e=>{e.preventDefault();setParams(keyword.trim()?{q:keyword.trim(),scope}:{});}}><Icon name="search"/><input autoComplete="off" aria-label={t("搜索原文关键词")} maxLength={100} value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder={t("经名、字句…")}/><button className="button" type="submit">{t("搜索")}</button></form>
    {q?<div className="search-options"><span>{loading?t('正在查找…'):t(result?.total+' 个段落')}</span><label>{t("范围")}<select aria-label={t("搜索范围")} value={scope} onChange={e=>setParams({q,scope:e.target.value})}><option value="all">{t("全部内容")}</option><option value="original">{t("原文")}</option><option value="plain">{t("现代导读")}</option><option value="commentary">{t("古代注疏")}</option></select></label></div>:null}
    {error?<div className="feedback-text" role="alert"><p>{t(error)}</p><button onClick={()=>setRetry(v=>v+1)}>{t("重试")}</button></div>:loading?<p role="status">{t("正在检索经藏…")}</p>:!q?<div className="search-start"><p>{t("可以从这些字句开始")}</p><div>{['无','清静','学而时习','修身'].map(word=><button key={word} className="search-suggestion" onClick={()=>setParams({q:displayText(word)})}>{displayText(word)}<Icon name="arrow" size={15}/></button>)}</div><Link className="button-quiet" to="/library">{t("或直接浏览经藏")}<Icon name="chevron" size={16}/></Link></div>:<section className="search-results" aria-live="polite">{result?.items.map(item=><article key={item.scriptureSlug+'/'+item.passageSlug} className="search-hit"><Link to={readingUrl(item.scriptureSlug,item.passageSlug,q).replace('#p-',(item.matchText?'&highlight='+encodeURIComponent(item.matchText):'')+'#p-')}><div><h2>{displayText(item.scriptureTitle)}</h2><span>{displayText(item.passageTitle)}</span></div><p><Hit text={displayText(item.excerpt)} query={displayText(item.matchText||q)}/></p><span className="hit-action">{t("阅读上下文")}<Icon name="arrow" size={16}/></span></Link></article>)}{!result?.items.length?<div className="empty-state"><h2>{t("没有找到匹配字句")}</h2><p>{t("试试更短的关键词。")}</p><Link className="button-secondary" to="/library">{t("浏览经藏")}</Link></div>:null}</section>}
    {result&&result.total>result.pageSize?<nav className="pagination" aria-label={t("搜索分页")}><button className="button-secondary" disabled={page<=1} onClick={()=>setParams({q,scope,page:String(page-1)})}>{t("上一页")}</button><span>{page} / {Math.ceil(result.total/result.pageSize)}</span><button className="button-secondary" disabled={page*result.pageSize>=result.total} onClick={()=>setParams({q,scope,page:String(page+1)})}>{t("下一页")}</button></nav>:null}
  </main>;
}
