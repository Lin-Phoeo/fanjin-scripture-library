import type { Express } from 'express';
import { db } from './db.ts';
import { requireUser } from './security.ts';
import { InputError, positiveId, slugField, textField } from './validation.ts';

const today=()=>new Date(Date.now()+8*3600000).toISOString().slice(0,10);
const previousDay=(day:string)=>new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);
function logDate(value:unknown) {
  if(value===undefined) return today();
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value) throw new InputError('请输入有效日期。');
  const oldest=previousDay(previousDay(previousDay(today())));
  if(value>today()||value<oldest) throw new InputError('可记录今天或最近3天的功课，不能记录未来日期。');
  return value;
}
function minutes(value:unknown) {
  const number=Number(value);
  if(!Number.isInteger(number)||number<1||number>240) throw new InputError('修学时长应为1–240分钟。');
  return number;
}

export function initializeStudy() {
  db.exec(`CREATE TABLE IF NOT EXISTS study_plans (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), scripture_id INTEGER NOT NULL REFERENCES scriptures(id),
    daily_minutes INTEGER NOT NULL DEFAULT 15, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id,scripture_id));
    CREATE TABLE IF NOT EXISTS study_checkins (
    id INTEGER PRIMARY KEY, plan_id INTEGER NOT NULL REFERENCES study_plans(id), user_id INTEGER NOT NULL REFERENCES users(id),
    passage_id INTEGER NOT NULL REFERENCES passages(id), day TEXT NOT NULL, minutes INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(plan_id,passage_id,day));
    CREATE TABLE IF NOT EXISTS study_logs (
      id INTEGER PRIMARY KEY, plan_id INTEGER NOT NULL REFERENCES study_plans(id), user_id INTEGER NOT NULL REFERENCES users(id),
      passage_id INTEGER NOT NULL REFERENCES passages(id), day TEXT NOT NULL, minutes INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(plan_id,day));
    CREATE INDEX IF NOT EXISTS idx_study_logs_user ON study_logs(user_id,day);
    INSERT OR IGNORE INTO study_logs (plan_id,user_id,passage_id,day,minutes,note)
      SELECT c.plan_id,c.user_id,c.passage_id,c.day,
        (SELECT SUM(c2.minutes) FROM study_checkins c2 WHERE c2.plan_id=c.plan_id AND c2.day=c.day),
        COALESCE((SELECT group_concat(c3.note,char(10)) FROM study_checkins c3 WHERE c3.plan_id=c.plan_id AND c3.day=c.day AND c3.note!=''),'')
      FROM study_checkins c WHERE c.id=(SELECT MAX(c4.id) FROM study_checkins c4 WHERE c4.plan_id=c.plan_id AND c4.day=c.day);
    CREATE INDEX IF NOT EXISTS idx_study_user ON study_checkins(user_id,day);
  `);
}

export function registerStudy(app:Express) {
  app.get('/api/me/study',requireUser,(_req,res)=>{
    const userId=res.locals.user.id;
    const plans=db.prepare(`SELECT p.id,s.slug AS scriptureSlug,s.title AS scriptureTitle,p.daily_minutes AS dailyMinutes,p.status,p.created_at AS createdAt,
      (SELECT COUNT(*) FROM passages WHERE scripture_id=s.id) AS totalPassages,
      (SELECT COUNT(DISTINCT passage_id) FROM study_checkins WHERE plan_id=p.id) AS completedPassages
      FROM study_plans p JOIN scriptures s ON s.id=p.scripture_id WHERE p.user_id=? AND p.status!='archived' ORDER BY p.id DESC`).all(userId);
    const checkins=db.prepare(`SELECT c.id,c.plan_id AS planId,c.day AS date,c.minutes,c.note,p.slug AS passageSlug,p.title AS passageTitle,s.title AS scriptureTitle
      FROM study_logs c JOIN passages p ON p.id=c.passage_id JOIN scriptures s ON s.id=p.scripture_id WHERE c.user_id=? ORDER BY c.day DESC,c.id DESC LIMIT 100`).all(userId);
    const stats=db.prepare(`SELECT COUNT(DISTINCT day) AS totalDays,COALESCE(SUM(minutes),0) AS totalMinutes,
      COALESCE(SUM(CASE WHEN day=? THEN minutes ELSE 0 END),0) AS todayMinutes,COUNT(DISTINCT passage_id) AS completedPassages
      FROM study_logs WHERE user_id=?`).get(today(),userId) as Record<string,number>;
    const days=new Set((db.prepare('SELECT DISTINCT day FROM study_checkins WHERE user_id=? ORDER BY day DESC').all(userId) as {day:string}[]).map(c=>c.day));
    let cursor=days.has(today())?today():previousDay(today());let currentStreak=0;
    while(days.has(cursor)){currentStreak++;cursor=previousDay(cursor);}
    const completedPassages=(db.prepare('SELECT COUNT(DISTINCT passage_id) AS count FROM study_checkins WHERE user_id=?').get(userId) as {count:number}).count;
    res.json({plans,checkins,stats:{...stats,completedPassages,currentStreak}});
  });
  app.post('/api/me/study/plans',requireUser,(req,res)=>{
    const scripture=db.prepare("SELECT id FROM scriptures WHERE slug=? AND publish_status='published'").get(slugField(req.body.scriptureSlug)) as {id:number}|undefined;
    if(!scripture) throw new InputError('经典不存在或暂未公开。',404);
    const dailyMinutes=minutes(req.body.dailyMinutes??15);
    const existing=db.prepare('SELECT id,status FROM study_plans WHERE user_id=? AND scripture_id=?').get(res.locals.user.id,scripture.id) as {id:number;status:string}|undefined;
    if(existing) {
      if(existing.status!=='archived') throw new InputError('这部经典已有自修计划，可直接继续阅读。',409);
      db.prepare("UPDATE study_plans SET status='active',daily_minutes=? WHERE id=? AND user_id=?").run(dailyMinutes,existing.id,res.locals.user.id);
      res.json({ok:true,id:existing.id});return;
    }
    const inserted=db.prepare('INSERT INTO study_plans (user_id,scripture_id,daily_minutes) VALUES (?,?,?)').run(res.locals.user.id,scripture.id,dailyMinutes);
    res.json({ok:true,id:Number(inserted.lastInsertRowid)});
  });
  app.patch('/api/me/study/plans/:id',requireUser,(req,res)=>{
    const id=positiveId(req.params.id);
    const plan=db.prepare('SELECT * FROM study_plans WHERE id=? AND user_id=?').get(id,res.locals.user.id) as {status:string;daily_minutes:number}|undefined;
    if(!plan) throw new InputError('自修计划不存在。',404);
    const status=req.body.status??plan.status;
    if(!['active','paused','completed'].includes(status)|| (status==='completed'&&plan.status!=='completed')) throw new InputError('计划状态不正确。');
    db.prepare('UPDATE study_plans SET status=?,daily_minutes=? WHERE id=? AND user_id=?').run(status,req.body.dailyMinutes===undefined?plan.daily_minutes:minutes(req.body.dailyMinutes),id,res.locals.user.id);
    res.json({ok:true});
  });
  app.delete('/api/me/study/plans/:id',requireUser,(req,res)=>{
    const result=db.prepare("UPDATE study_plans SET status='archived' WHERE id=? AND user_id=?").run(positiveId(req.params.id),res.locals.user.id);
    if(!result.changes) throw new InputError('自修计划不存在。',404);
    res.json({ok:true});
  });
  app.post('/api/me/study/checkins',requireUser,(req,res)=>{
    const planId=positiveId(req.body.planId);
    const plan=db.prepare(`SELECT p.id,p.scripture_id FROM study_plans p JOIN scriptures s ON s.id=p.scripture_id
      WHERE p.id=? AND p.user_id=? AND p.status IN ('active','completed') AND s.publish_status='published'`).get(planId,res.locals.user.id) as {id:number;scripture_id:number}|undefined;
    if(!plan) throw new InputError('请先启用可阅读的自修计划。',404);
    const passage=db.prepare('SELECT id FROM passages WHERE scripture_id=? AND slug=?').get(plan.scripture_id,slugField(req.body.passageSlug)) as {id:number}|undefined;
    if(!passage) throw new InputError('该段落不属于当前自修计划。',400);
    const duration=minutes(req.body.minutes);const note=textField(req.body.note,'心得',10000,true);const day=logDate(req.body.date);
    db.transaction(()=>{
      db.prepare('INSERT OR IGNORE INTO study_logs (plan_id,user_id,passage_id,day,minutes,note) VALUES (?,?,?,?,?,?)').run(plan.id,res.locals.user.id,passage.id,day,duration,note);
      db.prepare(`INSERT INTO study_checkins (plan_id,user_id,passage_id,day,minutes,note) VALUES (?,?,?,?,?,?)
        ON CONFLICT(plan_id,passage_id,day) DO NOTHING`).run(plan.id,res.locals.user.id,passage.id,day,duration,note);
      const remaining=(db.prepare('SELECT COUNT(*) AS count FROM passages WHERE scripture_id=? AND id NOT IN (SELECT passage_id FROM study_checkins WHERE plan_id=?)').get(plan.scripture_id,plan.id) as {count:number}).count;
      if(!remaining) db.prepare("UPDATE study_plans SET status='completed' WHERE id=? AND user_id=?").run(plan.id,res.locals.user.id);
    })();
    res.json({ok:true,date:day});
  });
}
