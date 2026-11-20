import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateScripture } from './validation.ts';

async function main() {
  const args=process.argv.slice(2);
  const file=args.find(arg=>!arg.startsWith('--'));
  if(!file) throw new Error('请提供经典 JSON 文件路径。');
  const payload=JSON.parse(readFileSync(resolve(file),'utf8'));
  const input=validateScripture(payload);
  const published=args.includes('--published');
  if(args.includes('--dry-run')) {
    console.log('预检完成：'+input.title+'，'+input.passages.length+' 个段落，'+(published?'直接发布':'待审核')+'。未写入内容。');
    return;
  }
  const {db,initializeDatabase}=await import('./db.ts');
  const {initializeContent,saveScripture}=await import('./content.ts');
  const {initializeStudy}=await import('./study.ts');
  const {personalMigration}=await import('./personal.ts');
  const {productMigration}=await import('./product-migration.ts');
  const {preferencesMigration}=await import('./preferences.ts');
  const {bookshelfMigration}=await import('./bookshelf.ts');
  try {
    await initializeDatabase([
      personalMigration,
      {id:'study-20261120-v3',up:initializeStudy},
      {id:'content-20261120-v4',up:initializeContent},
      productMigration,
      preferencesMigration,
      bookshelfMigration,
    ]);
    const exists=db.prepare('SELECT id FROM scriptures WHERE slug=?').get(input.slug);
    saveScripture(input,typeof payload.submitter==='string'?payload.submitter.slice(0,100):'批量导入',exists?input.slug:undefined,published);
    console.log('导入完成：'+input.title+'，'+input.passages.length+' 个段落，'+(published?'已发布':'待审核')+'。');
  } finally {db.close();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'导入失败。');process.exitCode=1;});
