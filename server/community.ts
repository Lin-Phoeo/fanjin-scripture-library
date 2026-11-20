import type { Express } from 'express';
import { db } from './db.ts';
import { requireAdmin } from './security.ts';
import { InputError, positiveId, slugField, textField } from './validation.ts';

export function registerCommunity(app: Express) {
  const topicInput = (body: Record<string,unknown>) => {
    const values = {slug:slugField(body.slug),title:textField(body.title,'专题标题'),summary:textField(body.summary,'摘要',4000),goal:textField(body.goal,'修学目标',4000),schedule:textField(body.schedule,'学习安排',500),duration:textField(body.duration,'持续时长',100)};
    if (!Array.isArray(body.scriptureSlugs) || body.scriptureSlugs.length > 100) throw new InputError('请选择关联经典，最多100部。');
    const ids = [...new Set(body.scriptureSlugs)].map(slug => {
      const row = db.prepare('SELECT id FROM scriptures WHERE slug=?').get(slugField(slug)) as {id:number}|undefined;
      if (!row) throw new InputError('关联经典不存在。');
      return row.id;
    });
    return {values,ids};
  };
  app.post('/api/admin/topics',requireAdmin,(req,res)=>{
    const {values,ids} = topicInput(req.body);
    const id = db.transaction(()=>{
      const result=db.prepare('INSERT INTO topics (slug,title,summary,goal,schedule,duration,participants) VALUES (@slug,@title,@summary,@goal,@schedule,@duration,0)').run(values);
      const topicId=Number(result.lastInsertRowid);
      for(const scriptureId of ids) db.prepare('INSERT INTO topic_scriptures VALUES (?,?)').run(topicId,scriptureId);
      return topicId;
    })();
    res.json({ok:true,id});
  });
  app.put('/api/admin/topics/:id',requireAdmin,(req,res)=>{
    const id=positiveId(req.params.id);
    if(!db.prepare('SELECT id FROM topics WHERE id=?').get(id)) throw new InputError('专题不存在。',404);
    const {values,ids}=topicInput(req.body);
    db.transaction(()=>{
      db.prepare('UPDATE topics SET slug=@slug,title=@title,summary=@summary,goal=@goal,schedule=@schedule,duration=@duration WHERE id=@id').run({...values,id});
      db.prepare('DELETE FROM topic_scriptures WHERE topic_id=?').run(id);
      for(const scriptureId of ids) db.prepare('INSERT INTO topic_scriptures VALUES (?,?)').run(id,scriptureId);
    })();
    res.json({ok:true});
  });
  app.delete('/api/admin/topics/:id',requireAdmin,(req,res)=>{
    const id=positiveId(req.params.id);
    db.transaction(()=>{
      db.prepare('UPDATE discussions SET topic_id=NULL WHERE topic_id=?').run(id);
      db.prepare('DELETE FROM topic_scriptures WHERE topic_id=?').run(id);
      db.prepare('DELETE FROM topics WHERE id=?').run(id);
    })();
    res.json({ok:true});
  });
  const activityInput=(body:Record<string,unknown>)=>{
    const value={slug:slugField(body.slug),title:textField(body.title,'活动标题'),summary:textField(body.summary,'活动摘要',4000),schedule:textField(body.schedule,'活动时间',500),location:textField(body.location,'活动地点',500),format:textField(body.format,'活动形式',100),status:textField(body.status,'活动状态',40)};
    if(!['报名中','招募中','长期进行','进行中','已结束','已取消','暂停报名'].includes(value.status)) throw new InputError('请选择有效的活动状态。');
    return value;
  };
  app.post('/api/admin/activities',requireAdmin,(req,res)=>{
    const result=db.prepare('INSERT INTO activities (slug,title,summary,schedule,location,format,status) VALUES (@slug,@title,@summary,@schedule,@location,@format,@status)').run(activityInput(req.body));
    res.json({ok:true,id:Number(result.lastInsertRowid)});
  });
  app.put('/api/admin/activities/:id',requireAdmin,(req,res)=>{
    const result=db.prepare('UPDATE activities SET slug=@slug,title=@title,summary=@summary,schedule=@schedule,location=@location,format=@format,status=@status WHERE id=@id').run({...activityInput(req.body),id:positiveId(req.params.id)});
    if(!result.changes) throw new InputError('活动不存在。',404);
    res.json({ok:true});
  });
  app.delete('/api/admin/activities/:id',requireAdmin,(req,res)=>{
    const id=positiveId(req.params.id);
    db.prepare('DELETE FROM activities WHERE id=?').run(id);
    res.json({ok:true});
  });
}
