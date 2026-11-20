import type { CategoryItem, ScriptureDetail, ScriptureSummary } from './api';
import { localSlug } from './local-store';

export type CatalogBook = ScriptureSummary & { passageCount?: number; totalPassages?: number; wordCount?: number };
export type StaticCatalog = { version: number; generatedAt?: string; settings: Record<string, string>; announcements?: { id: number; title: string; detail: string; createdAt: string }[]; categories: CategoryItem[]; books: CatalogBook[] };
export type SearchItem = { scriptureSlug: string; scriptureTitle: string; categorySlug: string; categoryName: string; school?: string; passageSlug: string; passageTitle: string; original: string; plain: string; commentary: string; normalized?: { title?: string; original?: string; plain?: string; commentary?: string; summary?: string } };
export type SearchShard = {slug:string;categorySlug:string;path:string;passages:number;bloom?:string;hasPlain?:boolean;hasCommentary?:boolean};
type SearchIndex = { version: number; charMap: Record<string, string>; items?: SearchItem[]; shards?: SearchShard[] };
let catalogPromise: Promise<StaticCatalog> | undefined;
let searchPromise: Promise<SearchIndex> | undefined;
const books = new Map<string, Promise<ScriptureDetail>>();
const shardCache = new Map<string, Promise<SearchItem[]>>();
const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';

async function asset<T>(path: string): Promise<T> {
  const response = await fetch(`${base.endsWith('/') ? base : base + '/'}content/${path}`, { credentials: 'omit' });
  if (!response.ok) throw new Error('经典资料暂时无法加载，请检查网络后重试。');
  try { return await response.json() as T; } catch { throw new Error('经典资料格式不正确，请稍后重试。'); }
}
export async function getLocalCatalog() {
  if (!catalogPromise) catalogPromise=asset<StaticCatalog>('index.json').then(catalog=>{
    if(!catalog||catalog.version!==1||!Array.isArray(catalog.books)||!Array.isArray(catalog.categories))throw new Error('经藏目录版本不正确。');
    return catalog;
  }).catch((error:unknown)=>{catalogPromise=undefined;throw error;});
  return catalogPromise;
}
export async function getLocalBook(slugValue:unknown):Promise<ScriptureDetail>{
  const slug=localSlug(slugValue),catalog=await getLocalCatalog();
  if(!catalog.books.some(book=>book.slug===slug&&book.publishStatus==='published'))throw new Error('经典不存在或暂未公开。');
  if(!books.has(slug)){
    if(books.size>=5)books.delete(books.keys().next().value!);
    books.set(slug,asset<ScriptureDetail>(`books/${encodeURIComponent(slug)}.json`).then(book=>{
      if(book.slug!==slug||book.publishStatus!=='published'||!Array.isArray(book.passages))throw new Error('经典资料版本不一致，请刷新页面。');
      return book;
    }).catch((error:unknown)=>{books.delete(slug);throw error;}));
  }
  return books.get(slug)!;
}
export async function getLocalSearch(){
  if(!searchPromise)searchPromise=asset<SearchIndex>('search.json').then(index=>{
    if(!index||![1,2].includes(index.version)||(!Array.isArray(index.items)&&!Array.isArray(index.shards))||!index.charMap)throw new Error('检索资料版本不正确。');
    return index;
  }).catch((error:unknown)=>{searchPromise=undefined;throw error;});
  return searchPromise;
}
export function normalizeLocalSearch(text:string,mapping:Record<string,string>){
  return Array.from(text.normalize('NFKC')).map(char=>mapping[char]??char).join('').toLowerCase();
}
function mayContain(shard:SearchShard,query:string){
  if(!shard.bloom)return true;
  const bits=atob(shard.bloom),letters=Array.from(query);
  const tokens=letters.length<2?[query]:[letters[0]+letters[1],letters[letters.length-2]+letters[letters.length-1]];
  return tokens.every(token=>{let hash=2166136261;for(let i=0;i<token.length;i++)hash=Math.imul(hash^token.charCodeAt(i),16777619)>>>0;const bit=hash%(bits.length*8);return(bits.charCodeAt(bit>>>3)&(1<<(bit&7)))!==0;});
}
async function getShard(shard:SearchShard){
  if(!shardCache.has(shard.slug)){
    if(shardCache.size>=8)shardCache.delete(shardCache.keys().next().value!);
    shardCache.set(shard.slug,asset<{version:number;book?:Partial<SearchItem>;items:SearchItem[]}>(shard.path).then(data=>{
      if(!Array.isArray(data.items))throw new Error('检索分卷格式不正确。');
      return data.items.map(item=>({...data.book,...item})) as SearchItem[];
    }).catch((error:unknown)=>{shardCache.delete(shard.slug);throw error;}));
  }
  return shardCache.get(shard.slug)!;
}
export async function searchLocalCatalog(params:URLSearchParams, signal?:AbortSignal|null){
  const checkCanceled=()=>{if(signal?.aborted)throw new DOMException('检索已取消','AbortError');};
  checkCanceled();
  const query=(params.get('q')||'').trim(),scope=params.get('scope')||'all',page=Number(params.get('page')||1);
  if(query.length>100)throw new Error('搜索关键词最多 100 个字符。');
  if(!['all','original','plain','commentary'].includes(scope))throw new Error('检索范围不正确。');
  if(!Number.isSafeInteger(page)||page<1||page>10000)throw new Error('页码不正确。');
  if(!query)return{items:[],total:0,page,pageSize:10,matchingBookSlugs:[]};
  const [index,catalog]=await Promise.all([getLocalSearch(),getLocalCatalog()]);
  checkCanceled();
  const published=new Set(catalog.books.filter(book=>book.publishStatus==='published').map(book=>book.slug));
  const normalized=normalizeLocalSearch(query,index.charMap),category=params.get('category');
  const shards=(index.shards||[]).filter(shard=>published.has(shard.slug)&&(!category||shard.categorySlug===category)&&mayContain(shard,normalized)&&(scope!=='plain'||shard.hasPlain)&&(scope!=='commentary'||shard.hasCommentary));
  const matched: Array<{scriptureSlug:string;scriptureTitle:string;categoryName:string;passageSlug:string;passageTitle:string;field:string;excerpt:string;matchText?:string}>=[];
  let total=0;
  const matchingBooks=new Set<string>();
  const processItems=(items:SearchItem[])=>{
    for(const item of items){
      if(!published.has(item.scriptureSlug)||(category&&item.categorySlug!==category))continue;
      const fields=scope==='all'?['original','plain','commentary'] as const:[scope as 'original'|'plain'|'commentary'];
      let field=fields.find(key=>(item.normalized?.[key]||normalizeLocalSearch(item[key]||'',index.charMap)).includes(normalized));
      const metadata=scope==='all'&&normalizeLocalSearch(item.scriptureTitle+' '+item.passageTitle+' '+(item.normalized?.summary||''),index.charMap).includes(normalized);
      if(!field&&!metadata)continue;
      field??='original';matchingBooks.add(item.scriptureSlug);
      const resultIndex=total++;
      if(resultIndex<(page-1)*10||resultIndex>=page*10)continue;
      const text=item[field]||'',offset=normalizeLocalSearch(text,index.charMap).indexOf(normalized),start=Math.max(0,offset-45);
      matched.push({scriptureSlug:item.scriptureSlug,scriptureTitle:item.scriptureTitle,categoryName:item.categoryName,passageSlug:item.passageSlug,passageTitle:item.passageTitle,field,excerpt:(start?'…':'')+text.slice(start,start+180)+(text.length>start+180?'…':''),matchText:offset<0?undefined:text.slice(offset,offset+query.length)});
    }
  };
  if(index.items)processItems(index.items);
  // Three concurrent downloads, stable result order; book shards are cached with a bounded LRU.
  for(let start=0;start<shards.length;start+=3){
    checkCanceled();
    const batch=await Promise.all(shards.slice(start,start+3).map(getShard));
    checkCanceled();
    batch.forEach(processItems);
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  return{items:matched,total,page,pageSize:10,matchingBookSlugs:[...matchingBooks]};
}
