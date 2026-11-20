import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateScripture } from '../server/validation.ts';

const directory=resolve(process.argv.find(value=>value.startsWith('--directory='))?.slice(12)||'data/catalog');
const paths=(await readdir(directory)).filter(name=>name.endsWith('.json') && name!=='catalog-manifest.json').sort();
const inputs=[];
for(const name of paths) inputs.push(validateScripture(JSON.parse(await readFile(resolve(directory,name),'utf8'))));
if(!inputs.length) throw new Error('No catalog JSON files found.');
if(process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({books:inputs.length,passages:inputs.reduce((sum,book)=>sum+book.passages.length,0),titles:inputs.map(book=>book.title)}));
} else {
  const {db,initializeDatabase}=await import('../server/db.ts');
  const {initializeContent,saveScripture}=await import('../server/content.ts');
  const {initializeStudy}=await import('../server/study.ts');
  const {personalMigration}=await import('../server/personal.ts');
  const {productMigration}=await import('../server/product-migration.ts');
  const {preferencesMigration}=await import('../server/preferences.ts');
  const {bookshelfMigration}=await import('../server/bookshelf.ts');
  try {
    await initializeDatabase([personalMigration,{id:'study-20261120-v3',up:initializeStudy},{id:'content-20261120-v4',up:initializeContent},productMigration,preferencesMigration,bookshelfMigration]);
    // This is an explicit administrative import. Back up before changing existing content.
    if(db.prepare('SELECT id FROM scriptures LIMIT 1').get()) await import('./backup.mjs');
    let imported=0;
    db.transaction(()=>{
      for(const input of inputs) {
        const exists=db.prepare('SELECT id FROM scriptures WHERE slug=?').get(input.slug);
        if(exists && process.argv.includes('--only-missing')) continue;
        saveScripture(input,'来源登记内容导入',exists?input.slug:undefined,process.argv.includes('--published'));
        imported++;
      }
    })();
    console.log(JSON.stringify({imported,skipped:inputs.length-imported,published:process.argv.includes('--published'),titles:inputs.map(book=>book.title)}));
  } finally {db.close();}
}
