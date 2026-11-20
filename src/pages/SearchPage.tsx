import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { readingUrl } from '../lib/reading-progress';

type SearchResult = {items: {scriptureSlug:string;scriptureTitle:string;categoryName:string;passageSlug:string;passageTitle:string;field:string;excerpt:string;matchText?:string}[];total:number;page:number;pageSize:number};
const scopeNames:Record<string,string>={all:'全部内容',original:'经文原文',plain:'白话导读',commentary:'注义'};

function Highlight({text,query}:{text:string;query:string}) {
  if(!query) return <>{text}</>;
  const index=text.toLowerCase().indexOf(query.toLowerCase());
  return index<0?<>{text}</>:<>{text.slice(0,index)}<mark>{text.slice(index,index+query.length)}</mark>{text.slice(index+query.length)}</>;
}

export default function SearchPage() {
  const [params,setParams]=useSearchParams();
  const q=params.get('q')??'';
  const scope=params.get('scope')??'all';
  const page=Number(params.get('page')??1);
  const [keyword,setKeyword]=useState(q);
  const [result,setResult]=useState<SearchResult|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>setKeyword(q),[q]);
  useEffect(()=>{
    const controller=new AbortController();
    if(!q){setResult(null);setError('');setLoading(false);return;}
    setLoading(true);setError('');
    const query=new URLSearchParams({q,scope,page:String(page)});
    apiRequest<SearchResult>('/api/search?'+query,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setResult(data);}).catch(err=>{if(!controller.signal.aborted)setError(err instanceof Error?err.message:'搜索失败，请重试。');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[q,scope,page,retry]);
  return <main className="content-page classic-page"><section className="classic-shell">
    <aside className="classic-sidebar"><div className="classic-side-panel"><div className="classic-side-title">站内搜索</div><div className="classic-reader-meta"><span>搜索经名、原文、白话和注义</span><span>点击结果可直接阅读对应段落</span><span>仅检索已发布经典</span></div></div></aside>
    <section className="classic-main"><article className="classic-article"><h1>在经藏中寻找一句话</h1><p>输入经名或经句，查看上下文与对照解读。</p>
      <form className="classic-search" onSubmit={event=>{event.preventDefault();setParams(keyword.trim()?{q:keyword.trim(),scope}:{});}}>
        <input aria-label="搜索关键词" maxLength={100} value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="输入经名、关键句或注义关键词" />
        <select aria-label="检索范围" value={scope} onChange={e=>setParams({q,scope:e.target.value})}>{Object.entries(scopeNames).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select>
        <button type="submit">搜索</button>
      </form></article>
      <article className="classic-article" aria-live="polite"><h2>搜索结果</h2>
        {error?<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>重新搜索</button></p>:loading?<p role="status">正在搜索…</p>:!q?<p>请输入关键词开始搜索，也可以先<Link to="/canon">浏览经藏</Link>。</p>:<>
          <p>“{q}” · {scopeNames[scope]??'全部内容'} · 共 {result?.total??0} 个段落</p>
          {result?.items.map(item=><div className="classic-line-item" key={item.scriptureSlug+'/'+item.passageSlug}>
            <h3><Link to={(readingUrl(item.scriptureSlug, item.passageSlug, q).replace('#p-', (item.matchText ? '&highlight=' + encodeURIComponent(item.matchText) : '') + '#p-'))}>{item.scriptureTitle} · {item.passageTitle}</Link></h3>
            <p>{item.categoryName} · {scopeNames[item.field]}</p><p><Highlight text={item.excerpt} query={item.matchText || q}/></p>
          </div>)}
          {!result?.items.length?<p>没有找到匹配内容，请尝试更短的经句或经名。</p>:null}
          {result&&result.total>result.pageSize?<nav className="card-actions" aria-label="搜索结果分页"><button disabled={page<=1} onClick={()=>setParams({q,scope,page:String(page-1)})}>上一页</button><span>第 {page} / {Math.ceil(result.total/result.pageSize)} 页</span><button disabled={page*result.pageSize>=result.total} onClick={()=>setParams({q,scope,page:String(page+1)})}>下一页</button></nav>:null}
        </>}
      </article>
    </section></section></main>;
}
