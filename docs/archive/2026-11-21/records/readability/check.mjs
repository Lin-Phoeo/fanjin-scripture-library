import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Uses a disposable Chrome browser context. Never selects, navigates or clears a user tab.
const base = new URL(process.argv[2] || 'http://127.0.0.1:5195/');
const stage = (process.argv[3] || 'after').replace(/[^a-z0-9-]/gi, '');
const output = resolve('output/readability', stage);
mkdirSync(output, { recursive: true });
const version = await (await fetch('http://127.0.0.1:9223/json/version')).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((ok, no) => { ws.addEventListener('open', ok, { once: true }); ws.addEventListener('error', no, { once: true }); });
let sequence = 0;
const requests = new Map();
const apiCalls = [], consoleErrors = [], observations = [], results = [], downloads = [];
ws.addEventListener('message', ({ data }) => {
  const event = JSON.parse(data);
  if (event.method === 'Page.javascriptDialogOpening') void call('Page.handleJavaScriptDialog', {accept:true}, event.sessionId);
  if (event.method === 'Browser.downloadProgress' && event.params.state==='completed') downloads.push(event.params.guid);
  if (event.method === 'Network.requestWillBeSent') { const url = new URL(event.params.request.url); if (url.pathname.includes('/api/')) apiCalls.push(url.href); }
  if (event.method === 'Runtime.exceptionThrown') consoleErrors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
  if (event.id && requests.has(event.id)) { const entry = requests.get(event.id); requests.delete(event.id); clearTimeout(entry.timer); event.error ? entry.reject(new Error(event.error.message)) : entry.resolve(event.result); }
});
const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++sequence; const timer = setTimeout(() => { requests.delete(id); reject(new Error(method + ' timed out')); }, 15000); requests.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
const context = await call('Target.createBrowserContext', { disposeOnDetach: true });
const target = await call('Target.createTarget', { browserContextId: context.browserContextId, url: base.href });
const { sessionId } = await call('Target.attachToTarget', { targetId: target.targetId, flatten: true });
const send = (method, params = {}) => call(method, params, sessionId);
const evaluate = async (expression) => { const reply = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text); return reply.result.value; };
const wait = async (expression) => { const deadline = Date.now() + 12000; while (Date.now() < deadline) { if (await evaluate(expression)) return; await new Promise((done) => setTimeout(done, 80)); } throw new Error('Condition timed out: ' + expression); };
const sleep = (duration) => new Promise((done) => setTimeout(done, duration));
const navigate = async (path) => { await send('Page.navigate', { url: base.href.replace(/#.*$/, '') + '#' + path }); await wait('!!document.querySelector("#root main") && !document.body.innerText.includes("正在载入页面")'); await sleep(150); };
const screenshot = async (name) => { const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(resolve(output, name + '.png'), Buffer.from(shot.data, 'base64')); };
const check = async (name, fn) => { try { const detail = await fn(); results.push({ name, passed: true, detail }); console.log('PASS ' + name); } catch (error) { results.push({ name, passed: false, error: error.message }); console.error('FAIL ' + name + ': ' + error.message); } };
const clickText = async (text) => evaluate(`(()=>{const button=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&e.getBoundingClientRect().width>0);if(!button)throw Error('missing action '+${JSON.stringify(text)});button.click();})()`);
const readState = () => evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open('fanjin-local-v1',1);request.onsuccess=()=>{const db=request.result;const transaction=db.transaction('app','readonly');const query=transaction.objectStore('app').get('state');query.onsuccess=()=>resolve(query.result);query.onerror=()=>reject(query.error);transaction.oncomplete=()=>db.close()};request.onerror=()=>reject(request.error)})`);
const measure = async (name) => { const value = await evaluate(`(()=>{const visible=e=>{if(e.closest('details:not([open])')&&!e.matches('summary'))return false;const r=e.getBoundingClientRect();const style=getComputedStyle(e);return r.width>0&&r.height>0&&style.visibility!=='hidden'&&style.display!=='none'&&r.top<innerHeight&&r.bottom>0};const main=document.querySelector('main');return {url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,firstScreenText:main?.innerText.slice(0,1800),heading:[...document.querySelectorAll('h1,h2')].filter(visible).map(e=>e.textContent.trim()),visibleLinks:[...main.querySelectorAll('a')].filter(visible).map(e=>({text:e.textContent.trim(),href:e.getAttribute('href')})),textBoxes:[...document.querySelectorAll('.reader-original,.catalog-volume,.personal-volume')].filter(visible).slice(0,8).map(e=>({text:e.textContent.slice(0,70),x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize,lineHeight:getComputedStyle(e).lineHeight}))}})()`); observations.push({ name, ...value }); return value; };

try {
 await send('Page.enable'); await send('Page.bringToFront'); await call('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:output,browserContextId:context.browserContextId,eventsEnabled:true}); await send('Network.enable'); await send('Runtime.enable');
 await wait('document.readyState==="complete"');
 const catalog = await (await fetch(new URL('content/index.json', base))).json();
 const heart = await (await fetch(new URL('content/books/heart-sutra.json', base))).json();
 const lunyu = await (await fetch(new URL('content/books/lunyu.json', base))).json();
 const initialNote = { id: 1, scriptureSlug: heart.slug, scriptureTitle: heart.title, passageSlug: heart.passages[0].slug, passageTitle: heart.passages[0].title, note: '界面验收：这条记录必须保留。', excerpt: '验收快照：此字符串不会随书籍文本变化。', createdAt: '2026-11-20T00:00:00.000Z', updatedAt: '2026-11-20T00:00:00.000Z' };
 const fixture = { version: 1, profile: { name: '隔离验收书斋' }, favorites: [{ slug: heart.slug, title: heart.title, overlay: heart.overlay, categoryName: heart.categoryName, createdAt: initialNote.createdAt }], notes: [initialNote], progress: [], bookmarks: [], plans: [], logs: [], preferences: null, counters: { note: 1, bookmark: 0, plan: 0, log: 0 } };
 await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('fanjin-local-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('app');r.onsuccess=()=>{const db=r.result;const tx=db.transaction('app','readwrite');tx.objectStore('app').put(${JSON.stringify(fixture)},'state');tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>reject(tx.error)}})`);
 await send('Page.reload'); await wait('document.readyState==="complete"'); await navigate('/');
 for (const width of [1440,390,320]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===1440?1000:844,deviceScaleFactor:1,mobile:width<700});
  for (const [name,path,ready] of [['home','/','main'],['library','/library','main a'],['book','/book/lunyu','.chapter-browser'],['reader',`/read/${heart.slug}/${heart.passages[0].slug}`,'.reader-original'],['notes','/notes','.note-entry'],['study','/study','main'],['profile','/profile','main']]) {
   await navigate(path); await wait(`!!document.querySelector(${JSON.stringify(ready)})`);
   await check(`${width}px ${name}: no horizontal overflow`,async()=>{const size=await measure(`${width}-${name}`);assert.ok(size.scrollWidth<=size.width+1,`${size.scrollWidth} > ${size.width}`);return{width:size.width,scrollWidth:size.scrollWidth}});
   if(['home','library','book','reader'].includes(name))await screenshot(`${width}-${name}`);
   if(name==='home'||name==='library')await check(`${width}px ${name}: books or direct reading link in first screen`,async()=>{const result=await measure(`${width}-${name}-content`);assert.ok(result.visibleLinks.some(link=>/^#\/(?:book|read|reader)\//.test(link.href||'')),'Only tips/navigation before the fold');return result.heading});
   if(name==='book')await check(`${width}px book: twenty chapter groups replace 512 flat links`,async()=>{const toc=await evaluate(`(()=>{const root=document.querySelector('.chapter-browser');return {groups:root.querySelectorAll('.chapter-line').length,height:root.getBoundingClientRect().height,pageHeight:document.documentElement.scrollHeight,openDetails:root.querySelectorAll('details[open]').length,visibleLinks:[...root.querySelectorAll('a')].filter(e=>e.getBoundingClientRect().height>0&&!e.closest('details:not([open])')).length}})()`);assert.equal(toc.groups,20);assert.equal(toc.openDetails,0);assert.ok(toc.visibleLinks<80);assert.ok(toc.height<3500);return toc});
  }
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await navigate(`/read/${heart.slug}/${heart.passages[0].slug}`);await wait('document.querySelectorAll(".reader-original").length>0');
 await check('reader renders the full short scripture',async()=>{const rendered=await evaluate(`[...document.querySelectorAll('.reader-original')].map(e=>e.textContent).join('')`);for(const passage of heart.passages)assert.ok(rendered.includes(passage.originalText));return heart.passages.length});
 await check('chapter directory remains accessible',async()=>{const present=await evaluate(`!!document.querySelector('[aria-label="展开目录"],[aria-label="收起目录"],.reader-index-toggle')`);assert.ok(present);return true});
 await evaluate("document.querySelector('.reader-workspace-tools button').click()"); await wait('!!document.querySelector(".reader-note-editor textarea")');
 await evaluate(`(()=>{const e=document.querySelector('.reader-note-editor textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'新增心得：真实点击保存');e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await clickText('保存摘录');await wait('document.body.innerText.includes("摘录已保存")');
 await check('UI note save preserves existing snapshots and stores real passage text',async()=>{const state=await readState();assert.equal(state.notes.find(n=>n.id===1).excerpt,initialNote.excerpt);assert.equal(state.notes.length,2);assert.ok(state.notes.some(n=>n.id!==1&&n.excerpt===heart.passages[0].originalText));return state.notes.map(n=>({id:n.id,note:n.note}))});
 for(const [theme,label] of [['paper','素宣'],['sepia','古纸'],['dark','松烟']]){
  await navigate(`/read/${heart.slug}/${heart.passages[0].slug}`);await wait('!!document.querySelector(".reader-original")');await evaluate("(()=>{const b=document.querySelector('.reader-workspace-tools button');if(b?.getAttribute('aria-expanded')==='true')b.click()})()");await clickText('阅读设置');await clickText(label);await clickText('阅读设置');
  for(const width of [1440,390,320]){await send('Emulation.setDeviceMetricsOverride',{width,height:width===1440?1000:844,deviceScaleFactor:1,mobile:width<700});await check(`${theme} ${width}px: readable theme and no hscroll`,async()=>{const value=await measure(`${theme}-${width}`);assert.ok(value.scrollWidth<=value.width+1);const current=await evaluate('document.documentElement.dataset.theme');assert.equal(current,theme);return value.textBoxes});await screenshot(`${theme}-${width}-reader`)}
 }

 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await navigate('/profile');await wait('!!document.querySelector("#settings-tab-backup")');
 await check('profile default preferences tab hides import and destructive actions',async()=>{assert.equal(await evaluate("document.querySelector('[role=tab][aria-selected=true]').textContent"),'偏好');assert.equal(await evaluate("!!document.querySelector('input[type=file]')"),false);return true});
 await clickText('数据备份');await wait('!!document.querySelector("input[type=file]")');await screenshot('390-profile-backup');
 await check('backup tab exposes explicit download and collapsed clear controls',async()=>{assert.equal(await evaluate("document.querySelector('.settings-danger').open"),false);assert.equal(await evaluate("document.querySelector('[role=tabpanel]').id"),'settings-panel-backup');return true});
 await clickText('下载完整备份');
 for(let i=0;i<100&&!downloads.length;i++)await sleep(80);
 let exported;
 await check('real downloaded backup preserves snapshots and complete state',async()=>{assert.ok(downloads.length,'no browser download completed');exported=JSON.parse(readFileSync(resolve(output,downloads.at(-1)),'utf8'));assert.equal(exported.format,'fanjin-local-backup');assert.equal(exported.data.notes.length,2);assert.equal(exported.data.notes.find(n=>n.id===1).excerpt,initialNote.excerpt);return{notes:exported.data.notes.length}});
 if(exported){
  const upload=async(file)=>{const documentNode=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:documentNode.root.nodeId,selector:'input[type=file]'});assert.ok(nodeId);await send('DOM.setFileInputFiles',{nodeId,files:[resolve(output,file)]})};
  const invalid={...exported,data:{...exported.data,profile:{name:{invalid:true}}}};writeFileSync(resolve(output,'invalid-backup.json'),JSON.stringify(invalid));
  await upload('invalid-backup.json');await wait('!!document.querySelector("[role=alert]")');
  await check('invalid backup gives a visible error without replacing data or crashing',async()=>{assert.equal(await evaluate("!!document.querySelector('.settings-backup-preview')"),false);assert.equal((await readState()).notes.length,2);assert.ok(await evaluate("document.querySelector('[role=alert]').textContent.includes('格式')"));return true});
  const restore={...exported,data:{...exported.data,profile:{name:'已恢复验收'}}};writeFileSync(resolve(output,'valid-backup.json'),JSON.stringify(restore));
  await upload('valid-backup.json');await wait('!!document.querySelector(".settings-backup-preview")');
  await check('valid backup remains a preview before explicit confirmation',async()=>{assert.equal((await readState()).profile.name,'隔离验收书斋');assert.ok(await evaluate("document.querySelector('.settings-backup-preview').textContent.includes('已恢复验收')"));return true});
  await clickText('确认替换并导入');await wait('document.body.innerText.includes("备份已导入")');
  await check('confirmed restore preserves note snapshots and updates profile',async()=>{const state=await readState();assert.equal(state.profile.name,'已恢复验收');assert.equal(state.notes.length,2);assert.equal(state.notes.find(n=>n.id===1).excerpt,initialNote.excerpt);return true});
  await screenshot('390-profile-restored');
 }

 // WCAG 1.4.12 spacing override: changes the user's text spacing, not page zoom.
 for(const width of [1440,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===1440?1000:844,deviceScaleFactor:1,mobile:width<700});
  for(const [name,path,ready] of [['reader', '/read/'+heart.slug+'/'+heart.passages[0].slug,'.reader-original'],['library','/library','.catalog-volume'],['book','/book/lunyu','.chapter-line'],['profile','/profile','[role=tab]']]){
   await navigate(path);await wait('!!document.querySelector('+JSON.stringify(ready)+')');
   await evaluate("(()=>{document.querySelector('#test-spacing')?.remove();const s=document.createElement('style');s.id='test-spacing';s.textContent='*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}';document.head.appendChild(s)})()");
   await check('WCAG spacing '+width+'px '+name,async()=>{const size=await measure('spacing-'+width+'-'+name);assert.ok(size.scrollWidth<=size.width+1,size.scrollWidth+' > '+size.width);return size.textBoxes});
   if(width===320)await screenshot('spacing-320-'+name);
   await evaluate("document.querySelector('#test-spacing')?.remove()");
  }
 }
 // A stronger user-font override at 320px: every text-bearing element doubles its computed px size.
 await navigate('/read/'+heart.slug+'/'+heart.passages[0].slug);await wait('!!document.querySelector(".reader-original")');
 await evaluate("(()=>{const rows=[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())).map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const [e,size] of rows)e.style.setProperty('font-size',(size*2)+'px','important')})()");
 await check('320px user text doubled keeps readable content without hscroll',async()=>{const size=await measure('200pct-320-reader');assert.ok(size.scrollWidth<=size.width+1,size.scrollWidth+' > '+size.width);return size.textBoxes});await screenshot('200pct-320-reader');
 // Empty state uses only the isolated fixture database, never a real user browser context.
 const finalSnapshot=await readState();
 const empty={...fixture, favorites:[],notes:[],progress:[],bookmarks:[],plans:[],logs:[],counters:{note:0,bookmark:0,plan:0,log:0}};
 await evaluate('new Promise((resolve,reject)=>{const r=indexedDB.open("fanjin-local-v1",1);r.onsuccess=()=>{const d=r.result;const t=d.transaction("app","readwrite");t.objectStore("app").put('+JSON.stringify(empty)+',"state");t.oncomplete=()=>{d.close();resolve(true)};t.onerror=()=>reject(t.error)}})');
 await send('Page.reload');await wait('document.readyState==="complete"');
 for(const [name,path] of [['notes','/notes'],['study','/study']]){
  await navigate(path);await wait(name==='notes'?'!!document.querySelector("main a[href*=library]")':'!!document.querySelector(".study-create-panel button[type=submit]")');
  await check('320px empty '+name+' presents primary action in first screen',async()=>{const size=await measure('empty-320-'+name);if(name==='notes')assert.ok(size.visibleLinks.some(link=>link.href.includes('/library')));else{const action=await evaluate(`(()=>{const b=document.querySelector('.study-create-panel button[type=submit]');const s=document.querySelector('.study-create-panel select');return{y:b.getBoundingClientRect().y,bottom:b.getBoundingClientRect().bottom,options:s.options.length}})()`);assert.ok(action.y>=0&&action.bottom<844,'Create plan action below first screen');assert.ok(action.options>1)}assert.ok(size.scrollWidth<=size.width+1);return size.heading});await screenshot('empty-320-'+name);
 }
 writeFileSync(resolve(output,'fixture-final.json'),JSON.stringify(finalSnapshot,null,2));
 await check('all interactions made zero API network requests',async()=>{assert.deepEqual(apiCalls,[]);return true});
 await check('no uncaught page errors',async()=>{assert.deepEqual(consoleErrors,[]);return true});

 writeFileSync(resolve(output,'summary.json'),JSON.stringify({base:base.href,stage,catalogBooks:catalog.books.length,lunyuPassages:lunyu.passages.length,results,observations,apiCalls,consoleErrors},null,2));
 const failed=results.filter(result=>!result.passed);console.log(`Readability UI: ${results.length-failed.length} passed, ${failed.length} failed. Artifacts: ${output}`);if(failed.length)process.exitCode=1;
}catch(error){console.error(error);writeFileSync(resolve(output,'fatal.json'),JSON.stringify({message:error.message,apiCalls,consoleErrors,results},null,2));await screenshot('fatal').catch(()=>{});try{writeFileSync(resolve(output,'fatal-dom.txt'),await evaluate('document.body.innerText'))}catch{}process.exitCode=1;}finally{
 await call('Target.disposeBrowserContext',{browserContextId:context.browserContextId}).catch(()=>{});
 ws.close();
}
