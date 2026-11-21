import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { preferredUiScript, translateInterface, convertPublicText } from '../../src/lib/i18n.ts';
const maps=JSON.parse(await readFile('public/content/display-maps.json','utf8'));
const storage=new Map();Object.defineProperty(globalThis,'localStorage',{value:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},configurable:true});
for(const language of ['zh-TW','zh-HK','zh-Hant']){Object.defineProperty(globalThis,'navigator',{value:{languages:[language]},configurable:true});assert.equal(preferredUiScript(),'tc');}
Object.defineProperty(globalThis,'navigator',{value:{languages:['zh-CN']},configurable:true});assert.equal(preferredUiScript(),'sc');
storage.set('fanjin-ui-script-v1','tc');assert.equal(preferredUiScript(),'tc');
assert.equal(translateInterface('数据备份 / 导入文件 / 默认设置 / 保存', 'tc', maps),'資料備份 / 匯入檔案 / 預設設定 / 儲存');
assert.equal(convertPublicText('心经与论语','tc',maps),'心經與論語');
assert.equal(convertPublicText('心經與論語','sc',maps),'心经与论语');
assert.equal(translateInterface('阅读设置','tc',maps),'閱讀設定');
console.log('PASS preferred locale, persisted choice, Taiwan UI vocabulary and public title conversion');
