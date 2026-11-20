import type { Express } from 'express';
import { db } from './db.ts';
import { InputError } from './validation.ts';
import { requireUser } from './security.ts';
import type { Migration } from './migrations.ts';

export const preferencesMigration: Migration = {
  id: 'reading-preferences-20261120-v1',
  up() {
    db.exec(`CREATE TABLE IF NOT EXISTS reading_preferences (
      user_id INTEGER PRIMARY KEY REFERENCES users(id), interests TEXT NOT NULL DEFAULT '[]',
      minutes INTEGER NOT NULL DEFAULT 15, intention TEXT NOT NULL DEFAULT 'quiet',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  },
};

export function registerPreferences(app: Express) {
  app.get('/api/me/preferences', requireUser, (_req, res) => {
    const row=db.prepare('SELECT interests,minutes,intention FROM reading_preferences WHERE user_id=?').get(res.locals.user.id) as {interests:string;minutes:number;intention:string}|undefined;
    res.json(row?{...row,interests:JSON.parse(row.interests)}:null);
  });
  app.put('/api/me/preferences',requireUser,(req,res)=>{
    const {interests,minutes,intention}=req.body;
    if(!Array.isArray(interests)||interests.length>4||interests.some(value=>typeof value!=='string'||!['佛家','道家','儒家','诸子'].includes(value))) throw new InputError('请选择有效的阅读兴趣。');
    if(![5,15,30].includes(minutes)) throw new InputError('请选择5、15或30分钟的阅读节奏。');
    if(!['quiet','understand','reflect'].includes(intention)) throw new InputError('请选择有效的阅读方式。');
    const values={interests:[...new Set(interests)],minutes,intention};
    db.prepare(`INSERT INTO reading_preferences (user_id,interests,minutes,intention) VALUES (?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET interests=excluded.interests,minutes=excluded.minutes,intention=excluded.intention,updated_at=CURRENT_TIMESTAMP
      WHERE reading_preferences.user_id=?`).run(res.locals.user.id,JSON.stringify(values.interests),minutes,intention,res.locals.user.id);
    res.json(values);
  });
  app.delete('/api/me/preferences',requireUser,(_req,res)=>{
    db.prepare('DELETE FROM reading_preferences WHERE user_id=?').run(res.locals.user.id);
    res.json({ok:true});
  });
}
