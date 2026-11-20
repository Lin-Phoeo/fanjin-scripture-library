import type { Express } from 'express';
import { db } from './db.ts';
import type { Migration } from './migrations.ts';
import { requireUser } from './security.ts';
import { InputError, positiveId, slugField } from './validation.ts';

export const bookshelfMigration: Migration={id:'personal-bookshelf-20261120-v1',up(){
  db.exec(`CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),scripture_id INTEGER NOT NULL REFERENCES scriptures(id),
    passage_id INTEGER NOT NULL REFERENCES passages(id),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id,passage_id));CREATE INDEX IF NOT EXISTS bookmarks_user ON bookmarks(user_id,scripture_id);`);
}};

export function registerBookshelf(app:Express) {
  app.get('/api/me/library',requireUser,(_req,res)=>{
    const userId=res.locals.user.id;
    const items=db.prepare(`SELECT s.slug,s.title,s.school,s.edition,s.publish_status AS publishStatus,s.is_excerpt AS isExcerpt,c.name AS categoryName,
      r.updated_at AS progressAt,p.slug AS passageSlug,p.title AS passageTitle,p.order_index AS passageOrder,
      f.created_at AS savedAt,CASE WHEN f.user_id IS NULL THEN 0 ELSE 1 END AS favorite,
      (SELECT COUNT(*) FROM passages WHERE scripture_id=s.id) AS totalPassages,
      (SELECT COUNT(*) FROM notes WHERE user_id=@userId AND scripture_id=s.id) AS notesCount,
      (SELECT COUNT(*) FROM bookmarks WHERE user_id=@userId AND scripture_id=s.id) AS bookmarksCount,
      sp.status AS planStatus,sp.daily_minutes AS dailyMinutes
      FROM scriptures s JOIN categories c ON c.id=s.category_id
      LEFT JOIN reading_progress r ON r.scripture_id=s.id AND r.user_id=@userId
      LEFT JOIN passages p ON p.id=r.passage_id
      LEFT JOIN favorites f ON f.scripture_id=s.id AND f.user_id=@userId
      LEFT JOIN study_plans sp ON sp.scripture_id=s.id AND sp.user_id=@userId AND sp.status!='archived'
      WHERE r.user_id=@userId OR f.user_id=@userId OR sp.user_id=@userId
        OR EXISTS(SELECT 1 FROM notes n WHERE n.scripture_id=s.id AND n.user_id=@userId)
        OR EXISTS(SELECT 1 FROM bookmarks b WHERE b.scripture_id=s.id AND b.user_id=@userId)
      ORDER BY COALESCE(r.updated_at,f.created_at,sp.created_at) DESC,s.id`).all({userId}) as Record<string,unknown>[];
    res.json({items:items.map(item=>({...item,isExcerpt:Boolean(item.isExcerpt),favorite:Boolean(item.favorite)}))});
  });
  app.get('/api/bookmarks',requireUser,(req,res)=>{
    const params:unknown[]=[res.locals.user.id];
    let filter='';
    if(req.query.scriptureSlug!==undefined){filter=' AND s.slug=?';params.push(slugField(req.query.scriptureSlug));}
    res.json(db.prepare(`SELECT b.id,b.created_at AS createdAt,s.slug AS scriptureSlug,s.title AS scriptureTitle,p.slug AS passageSlug,p.title AS passageTitle
      FROM bookmarks b JOIN scriptures s ON s.id=b.scripture_id JOIN passages p ON p.id=b.passage_id
      WHERE b.user_id=?${filter} ORDER BY b.id DESC`).all(...params));
  });
  app.post('/api/bookmarks',requireUser,(req,res)=>{
    const target=db.prepare(`SELECT s.id AS scriptureId,p.id AS passageId FROM scriptures s JOIN passages p ON p.scripture_id=s.id
      WHERE s.slug=? AND p.slug=? AND s.publish_status='published'`).get(slugField(req.body.scriptureSlug),slugField(req.body.passageSlug)) as {scriptureId:number;passageId:number}|undefined;
    if(!target) throw new InputError('经典或段落不存在。',404);
    db.prepare('INSERT OR IGNORE INTO bookmarks (user_id,scripture_id,passage_id) VALUES (?,?,?)').run(res.locals.user.id,target.scriptureId,target.passageId);
    const bookmark=db.prepare('SELECT id FROM bookmarks WHERE user_id=? AND passage_id=?').get(res.locals.user.id,target.passageId) as {id:number};
    res.json({ok:true,id:bookmark.id});
  });
  app.delete('/api/bookmarks/:id',requireUser,(req,res)=>{
    const result=db.prepare('DELETE FROM bookmarks WHERE id=? AND user_id=?').run(positiveId(req.params.id),res.locals.user.id);
    if(!result.changes) throw new InputError('书签不存在。',404);
    res.json({ok:true});
  });
}
