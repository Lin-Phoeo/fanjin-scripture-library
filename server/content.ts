import type { Express } from 'express';
import { db, normalizeSearch } from './db.ts';
import { requireStaff } from './security.ts';
import { InputError, positiveId, textField, validateScripture, type ScriptureInput } from './validation.ts';

export function initializeContent() {
  const hasColumn=(table:string,column:string)=>(db.prepare(`PRAGMA table_info(${table})`).all() as {name:string}[]).some(c=>c.name===column);
  for(const table of ['discussions','discussion_replies']) {
    if(!hasColumn(table,'visibility')) db.exec(`ALTER TABLE ${table} ADD COLUMN visibility TEXT NOT NULL DEFAULT 'visible'`);
  }
  db.exec(`CREATE TABLE IF NOT EXISTS content_audit (id INTEGER PRIMARY KEY, actor_id INTEGER NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS idx_passages_scripture ON passages(scripture_id,order_index);
    CREATE INDEX IF NOT EXISTS idx_history_user ON reading_history(user_id,viewed_at);
    CREATE INDEX IF NOT EXISTS idx_replies_discussion ON discussion_replies(discussion_id,visibility);
    CREATE INDEX IF NOT EXISTS idx_review_target ON review_queue(target_kind,target_slug,id);
  `);
  const columns:Record<string,Record<string,string>>={
    scriptures:{school:"TEXT NOT NULL DEFAULT ''",tags:"TEXT NOT NULL DEFAULT '[]'",edition:"TEXT NOT NULL DEFAULT ''",source_name:"TEXT NOT NULL DEFAULT ''",source_url:"TEXT NOT NULL DEFAULT ''",license:"TEXT NOT NULL DEFAULT ''",license_url:"TEXT NOT NULL DEFAULT ''",is_excerpt:'INTEGER NOT NULL DEFAULT 1',source_verified:'INTEGER NOT NULL DEFAULT 0',source_header:"TEXT NOT NULL DEFAULT ''"},
    passages:{content_tc:'TEXT',content_sc:'TEXT',classical_commentary:'TEXT',commentary_source:'TEXT',modern_guide:'TEXT'}
  };
  for(const [table,fields] of Object.entries(columns)) for(const [column,type] of Object.entries(fields)) if(!hasColumn(table,column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  for(const [slug,name,sort] of [['dao','道家经典',4],['ru','儒家经典',5],['zhuzi','诸子百家',6]] as const) db.prepare('INSERT OR IGNORE INTO categories (slug,name,description,sort_order) VALUES (?,?,?,?)').run(slug,name,'原典阅读与个人研习',sort);
  const exists=db.prepare("SELECT name FROM sqlite_master WHERE name='scripture_search_v2'").get();
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS scripture_search_v2 USING fts5(scripture_id UNINDEXED,passage_slug UNINDEXED,scripture_title,title,original_text,plain_text,commentary_text,summary,tokenize='trigram');
    CREATE TRIGGER IF NOT EXISTS passages_search_v2_insert AFTER INSERT ON passages BEGIN
      INSERT INTO scripture_search_v2(rowid,scripture_id,passage_slug,scripture_title,title,original_text,plain_text,commentary_text,summary)
      SELECT new.id,new.scripture_id,new.slug,normalize_text(s.title),normalize_text(new.title),normalize_text(new.original_text||' '||coalesce(new.content_tc,'')||' '||coalesce(new.content_sc,'')),normalize_text(coalesce(new.modern_guide,'')),normalize_text(coalesce(new.classical_commentary,'')),normalize_text(s.summary) FROM scriptures s WHERE s.id=new.scripture_id;
    END;
    CREATE TRIGGER IF NOT EXISTS passages_search_v2_delete AFTER DELETE ON passages BEGIN DELETE FROM scripture_search_v2 WHERE rowid=old.id; END;
    CREATE TRIGGER IF NOT EXISTS passages_search_v2_update AFTER UPDATE ON passages BEGIN
      DELETE FROM scripture_search_v2 WHERE rowid=old.id;
      INSERT INTO scripture_search_v2(rowid,scripture_id,passage_slug,scripture_title,title,original_text,plain_text,commentary_text,summary)
      SELECT new.id,new.scripture_id,new.slug,normalize_text(s.title),normalize_text(new.title),normalize_text(new.original_text||' '||coalesce(new.content_tc,'')||' '||coalesce(new.content_sc,'')),normalize_text(coalesce(new.modern_guide,'')),normalize_text(coalesce(new.classical_commentary,'')),normalize_text(s.summary) FROM scriptures s WHERE s.id=new.scripture_id;
    END;
    CREATE TRIGGER IF NOT EXISTS scriptures_search_v2_update AFTER UPDATE OF title,summary ON scriptures BEGIN
      UPDATE scripture_search_v2 SET scripture_title=normalize_text(new.title),summary=normalize_text(new.summary) WHERE scripture_id=new.id;
    END;
  `);
  if(!exists) db.exec(`INSERT INTO scripture_search_v2(rowid,scripture_id,passage_slug,scripture_title,title,original_text,plain_text,commentary_text,summary)
    SELECT p.id,p.scripture_id,p.slug,normalize_text(s.title),normalize_text(p.title),normalize_text(p.original_text||' '||coalesce(p.content_tc,'')||' '||coalesce(p.content_sc,'')),normalize_text(coalesce(p.modern_guide,'')),normalize_text(coalesce(p.classical_commentary,'')),normalize_text(s.summary) FROM passages p JOIN scriptures s ON s.id=p.scripture_id`);

}

export function saveScripture(input: ScriptureInput, actor: string, existingSlug?: string, published = false) {
  if (published) assertPublishable(input);
  const category=db.prepare('SELECT id FROM categories WHERE slug=?').get(input.categorySlug) as {id:number}|undefined;
  if(!category) throw new InputError('经藏分类不存在。');
  const existing=existingSlug ? db.prepare('SELECT id,slug FROM scriptures WHERE slug=?').get(existingSlug) as {id:number;slug:string}|undefined : undefined;
  if(existingSlug && !existing) throw new InputError('经典不存在。',404);
  if(existing && existingSlug!==input.slug) throw new InputError('已创建经典的标识不可修改，以保留阅读链接。');
  return db.transaction(()=>{
    const status=published?'published':'pending_review';
    let id=existing?.id;
    const values=[input.title,category.id,input.dynasty,input.translator,input.role,input.overlay,input.summary,status];
    if(id) db.prepare('UPDATE scriptures SET title=?,category_id=?,dynasty=?,translator=?,role=?,overlay=?,summary=?,publish_status=? WHERE id=?').run(...values,id);
    else id=Number(db.prepare('INSERT INTO scriptures (title,category_id,dynasty,translator,role,overlay,summary,publish_status,slug) VALUES (?,?,?,?,?,?,?,?,?)').run(...values,input.slug).lastInsertRowid);
    db.prepare('UPDATE scriptures SET school=?,tags=?,edition=?,source_name=?,source_url=?,license=?,license_url=?,is_excerpt=?,source_verified=?,source_header=? WHERE id=?').run(input.school,JSON.stringify(input.tags),input.edition,input.sourceName,input.sourceUrl,input.license,input.licenseUrl,input.isExcerpt?1:0,input.sourceVerified?1:0,input.sourceHeader,id);
    const oldPassages=db.prepare('SELECT id,slug FROM passages WHERE scripture_id=?').all(id) as {id:number;slug:string}[];
    const incoming=new Set(input.passages.map(p=>p.slug));
    for(const old of oldPassages) {
      if(incoming.has(old.slug)) continue;
      if(db.prepare('SELECT id FROM notes WHERE passage_id=? UNION ALL SELECT id FROM reading_history WHERE passage_id=? LIMIT 1').get(old.id,old.id) || (db.prepare("SELECT name FROM sqlite_master WHERE name='study_checkins'").get() && db.prepare('SELECT id FROM study_checkins WHERE passage_id=? LIMIT 1').get(old.id))) throw new InputError(`段落“${old.slug}”已有关联摘录或阅读记录，请保留其标识和段落。`,409);
      for(const table of ['reading_progress','correction_reports','study_logs','bookmarks']) {
        if(db.prepare('SELECT name FROM sqlite_master WHERE name=?').get(table) && db.prepare(`SELECT 1 FROM ${table} WHERE passage_id=? LIMIT 1`).get(old.id)) throw new InputError('该段落已被个人记录引用，请保留稳定标识。',409);
      }
      db.prepare('DELETE FROM passages WHERE id=?').run(old.id);
    }
    const upsert=db.prepare(`INSERT INTO passages (scripture_id,slug,title,order_index,original_text,plain_text,commentary_text,audio_url) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(scripture_id,slug) DO UPDATE SET title=excluded.title,order_index=excluded.order_index,original_text=excluded.original_text,plain_text=excluded.plain_text,commentary_text=excluded.commentary_text,audio_url=excluded.audio_url`);
    input.passages.forEach((p,i)=>{
      upsert.run(id,p.slug,p.title,i+1,p.originalText,p.plainText,p.commentaryText,p.audioUrl);
      db.prepare('UPDATE passages SET content_tc=?,content_sc=?,classical_commentary=?,commentary_source=?,modern_guide=? WHERE scripture_id=? AND slug=?').run(p.contentTc,p.contentSc,p.classicalCommentary,p.commentarySource,p.modernGuide,id,p.slug);
    });
    db.prepare("UPDATE review_queue SET status='已替代' WHERE target_kind='scripture' AND target_slug=? AND status IN ('待审核','待修改','待复核','待发布')").run(input.slug);
    db.prepare("INSERT INTO review_queue (title,type,submitter,status,target_kind,target_slug) VALUES (?,?,?,?, 'scripture',?)").run(input.title,existing?'经典更新':'经典录入',actor,published?'已通过':'待审核',input.slug);
    return {ok:true,slug:input.slug};
  })();
}

function assertPublishable(input: {edition?:string;sourceName?:string;sourceUrl?:string;license?:string;licenseUrl?:string;sourceVerified?:boolean}) {
  if(!input.edition || !input.sourceName || !input.sourceUrl || !input.license || !input.licenseUrl || !input.sourceVerified) {
    throw new InputError('发布前请补齐底本、来源链接、许可及许可链接，并确认已完成来源核验。',409);
  }
}

function audit(actor:number,action:string,target:string,detail='') {
  db.prepare('INSERT INTO content_audit (actor_id,action,target,detail) VALUES (?,?,?,?)').run(actor,action,target,detail);
}

const scriptureSelect = `SELECT s.id,s.slug,s.title,s.dynasty,s.translator,s.role,s.overlay,s.summary,s.publish_status AS publishStatus,
  c.slug AS categorySlug,c.name AS categoryName,s.school,s.tags,s.edition,s.source_name AS sourceName,s.source_url AS sourceUrl,
  s.license,s.license_url AS licenseUrl,s.is_excerpt AS isExcerpt,s.source_verified AS sourceVerified,s.source_header AS sourceHeader,(SELECT COALESCE(SUM(length(original_text)),0) FROM passages WHERE scripture_id=s.id) AS wordCount
  FROM scriptures s JOIN categories c ON c.id=s.category_id`;
function presentScripture(row:Record<string,unknown>) {
  return {...row,tags:JSON.parse(String(row.tags||'[]')),isExcerpt:Boolean(row.isExcerpt),sourceVerified:Boolean(row.sourceVerified)};
}
function scriptureList(query:Record<string,unknown>, admin=false) {
  let sql=scriptureSelect+(admin?' WHERE 1=1':" WHERE s.publish_status='published'");
  const params:unknown[]=[];
  for(const [key,column] of [['category','c.slug'],['school','s.school']] as const) {
    const value=textField(query[key],key,100,true);if(value){sql+=` AND ${column}=?`;params.push(value);}
  }
  const q=normalizeSearch(textField(query.q,'关键词',100,true));
  if(q){sql+=' AND (instr(normalize_text(s.title),?)>0 OR instr(normalize_text(s.summary),?)>0 OR EXISTS(SELECT 1 FROM scripture_search_v2 f WHERE f.scripture_id=s.id AND (instr(f.original_text,?)>0 OR instr(f.plain_text,?)>0 OR instr(f.commentary_text,?)>0)))';params.push(q,q,q,q,q);}
  const tag=textField(query.tag,'标签',40,true);
  if(tag){sql+=' AND EXISTS(SELECT 1 FROM json_each(s.tags) WHERE value=?)';params.push(tag);}
  return (db.prepare(sql+' ORDER BY c.sort_order,s.id').all(...params) as Record<string,unknown>[]).map(presentScripture);
}
function scriptureDetail(slug:string,admin=false) {
  const row=db.prepare(scriptureSelect+` WHERE s.slug=?${admin?'':" AND s.publish_status='published'"}`).get(slug) as Record<string,unknown>|undefined;
  if(!row) throw new InputError('经典不存在或暂未公开。',404);
  const passages=db.prepare(`SELECT id,slug,title,order_index AS orderIndex,original_text AS originalText,
    plain_text AS plainText,commentary_text AS commentaryText,audio_url AS audioUrl,content_tc AS contentTc,content_sc AS contentSc,
    classical_commentary AS classicalCommentary,commentary_source AS commentarySource,modern_guide AS modernGuide
    FROM passages WHERE scripture_id=? ORDER BY order_index,id`).all(row.id);
  return {...presentScripture(row),passages};
}

export function registerContent(app: Express) {
  app.get('/api/scriptures',(req,res)=>res.json(scriptureList(req.query)));
  app.get('/api/scriptures/:slug',(req,res)=>res.json(scriptureDetail(String(req.params.slug))));
  app.get('/api/admin/scriptures',requireStaff,(req,res)=>res.json(scriptureList(req.query,true)));
  app.get('/api/admin/scriptures/:slug',requireStaff,(req,res)=>res.json(scriptureDetail(String(req.params.slug),true)));
  app.post('/api/admin/scriptures',requireStaff,(req,res)=>{
    const input=validateScripture(req.body);
    res.json(saveScripture(input,res.locals.user.name));
  });
  app.put('/api/admin/scriptures/:slug',requireStaff,(req,res)=>{
    const input=validateScripture(req.body);
    res.json(saveScripture(input,res.locals.user.name,String(req.params.slug)));
  });
  app.patch('/api/admin/review/:id',requireStaff,(req,res)=>{
    const id=positiveId(req.params.id);
    const status=textField(req.body.status,'审核状态',20);
    if(!['已通过','待修改'].includes(status)) throw new InputError('审核状态仅支持已通过或待修改。');
    const item=db.prepare('SELECT * FROM review_queue WHERE id=?').get(id) as {target_kind:string;target_slug:string;status:string}|undefined;
    if(!item) throw new InputError('审核记录不存在。',404);
    if(item.target_kind!=='scripture' || !item.target_slug) throw new InputError('该历史记录没有可审核的内容。',409);
    const latest=db.prepare("SELECT id FROM review_queue WHERE target_kind='scripture' AND target_slug=? ORDER BY id DESC LIMIT 1").get(item.target_slug) as {id:number};
    if(latest.id!==id || !['待审核','待修改','待复核','待发布'].includes(item.status)) throw new InputError('该审核已完成或内容已更新，请刷新队列。',409);
    if(status==='已通过') {
      const source=db.prepare('SELECT edition,source_name AS sourceName,source_url AS sourceUrl,license,license_url AS licenseUrl,source_verified AS sourceVerified FROM scriptures WHERE slug=?').get(item.target_slug) as {edition:string;sourceName:string;sourceUrl:string;license:string;licenseUrl:string;sourceVerified:boolean}|undefined;
      if(!source) throw new InputError('经典不存在。',404);
      assertPublishable(source);
    }
    db.transaction(()=>{
      const changed=db.prepare('UPDATE scriptures SET publish_status=? WHERE slug=?').run(status==='已通过'?'published':'changes_requested',item.target_slug);
      if(!changed.changes) throw new InputError('待审核经典不存在。',404);
      db.prepare('UPDATE review_queue SET status=? WHERE id=?').run(status,id);
      audit(res.locals.user.id,'review',item.target_slug,status);
    })();
    res.json({ok:true});
  });
  app.post('/api/admin/scriptures/:slug/unpublish',requireStaff,(req,res)=>{
    const result=db.prepare("UPDATE scriptures SET publish_status='changes_requested' WHERE slug=?").run(req.params.slug);
    if(!result.changes) throw new InputError('经典不存在。',404);
    db.prepare("UPDATE review_queue SET status='已下架' WHERE target_kind='scripture' AND target_slug=?").run(req.params.slug);
    audit(res.locals.user.id,'unpublish',String(req.params.slug));
    res.json({ok:true});
  });

  app.get('/api/search',(req,res)=>{
    const q=normalizeSearch(textField(req.query.q??'','关键词',100,true));
    const scope=String(req.query.scope??'all');
    const column:Record<string,string>={original:'original_text',plain:'plain_text',commentary:'commentary_text'};
    if(!['all',...Object.keys(column)].includes(scope)) throw new InputError('检索范围不正确。');
    const page=req.query.page===undefined?1:positiveId(req.query.page);
    if(page>10000) throw new InputError('页码超出范围。');
    if(!q) {res.json({items:[],total:0,page,pageSize:10});return;}
    const params:unknown[]=[];
    let where="s.publish_status='published'";
    const fts=Array.from(q).length>=3;
    if(fts) {where+=' AND scripture_search_v2 MATCH ?';params.push(`${column[scope]?column[scope]+': ':''}"${q.replaceAll('"','""')}"`);}
    else {
      const columns=scope==='all'?['scripture_title','title','original_text','plain_text','commentary_text','summary']:[column[scope]];
      where+=` AND (${columns.map(c=>`instr(lower(scripture_search_v2.${c}),lower(?))>0`).join(' OR ')})`;
      params.push(...columns.map(()=>q));
    }
    const category=textField(req.query.category??'','分类',100,true);
    if(category){where+=' AND c.slug=?';params.push(category);}
    const from='FROM scripture_search_v2 JOIN passages p ON p.id=scripture_search_v2.rowid JOIN scriptures s ON s.id=scripture_search_v2.scripture_id JOIN categories c ON c.id=s.category_id';
    const total=(db.prepare(`SELECT COUNT(*) AS count ${from} WHERE ${where}`).get(...params) as {count:number}).count;
    const rows=db.prepare(`SELECT s.slug AS scriptureSlug,s.title AS scriptureTitle,c.name AS categoryName, passage_slug AS passageSlug,p.title AS passageTitle,p.original_text AS original,coalesce(p.modern_guide,'') AS plain,coalesce(p.classical_commentary,'') AS commentary ${from} WHERE ${where} ORDER BY ${fts?'rank,':''} s.id,scripture_search_v2.rowid LIMIT 10 OFFSET ?`).all(...params,(page-1)*10) as {scriptureSlug:string;scriptureTitle:string;categoryName:string;passageSlug:string;passageTitle:string;original:string;plain:string;commentary:string}[];
    const items=rows.map(row=>{
      const field=scope==='all'?(['original','plain','commentary'] as const).find(k=>normalizeSearch(row[k]).toLowerCase().includes(q.toLowerCase()))??'original':scope as 'original'|'plain'|'commentary';
      const content=row[field]; const index=normalizeSearch(content).toLowerCase().indexOf(q.toLowerCase()); const start=Math.max(0,index-45);
      return {scriptureSlug:row.scriptureSlug,scriptureTitle:row.scriptureTitle,categoryName:row.categoryName,passageSlug:row.passageSlug,passageTitle:row.passageTitle,field,matchText:index>=0?content.slice(index,index+q.length):q,excerpt:(start?'…':'')+content.slice(start,start+180)+(content.length>start+180?'…':'')};
    });
    res.json({items,total,page,pageSize:10});
  });
  app.get('/api/admin/audit',requireStaff,(_req,res)=>res.json(db.prepare('SELECT a.id,u.name AS actor,a.action,a.target,a.detail,a.created_at AS createdAt FROM content_audit a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100').all()));
}
