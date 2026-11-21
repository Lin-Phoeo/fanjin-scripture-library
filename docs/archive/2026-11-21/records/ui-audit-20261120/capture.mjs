import {writeFileSync} from 'node:fs';
const base='https://lin-phoeo.github.io/fanjin-scripture-library/';
const target=await(await fetch('http://127.0.0.1:9223/json/new?'+encodeURIComponent(base+'#/'),{method:'PUT'})).json();
writeFileSync('output/ui-audit-20261120/tab-id.txt',target.id);
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));const pending=new Map();let seq=0;
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}});
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
const wait=async expression=>{for(let i=0;i<160;i++){try{if(await ev(expression))return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error(expression);};
const observations=[];
try{await call('Page.enable');await call('Runtime.enable');await call('Page.bringToFront');
for(const [device,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
 await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:device==='mobile'});
 for(const[name,path,selector]of[['catalog','/','.workbench-book-row.catalog'],['book','/book/lunyu','.book-toc'],['reader','/read/lunyu/ch-01--p-001','.reader-original'],['notes','/notes','.notes-page'],['study','/study','.study-page']]){
  await call('Page.navigate',{url:base+'#'+path});await wait('!!document.querySelector('+JSON.stringify(selector)+')');await new Promise(r=>setTimeout(r,250));if(name==='catalog'&&await ev(`!![...document.querySelectorAll('.workbench-tabs button')].find(e=>e.textContent==='全部经藏')`)){await ev(`[...document.querySelectorAll('.workbench-tabs button')].find(e=>e.textContent==='全部经藏').click()`);await wait(`!!document.querySelector('.workbench-book-row.catalog')`);}await ev('window.scrollTo(0,0)');
  const data=await ev(`(()=>{const selectors=['.reading-header','.local-storage-notice','h1','.workbench-search','.reader-workspace-toolbar','.reader-chapter-heading','.reader-document','.reader-original','.reader-paragraph-actions','.notes-filter','.note-entry','.study-stats','.study-create-panel','.study-record-panel','.reading-footer'];return {url:location.href,width:innerWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight,text:document.body.innerText.slice(0,5500),elements:selectors.map(selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {selector,x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize,lineHeight:s.lineHeight,padding:s.padding,margin:s.margin,borderRadius:s.borderRadius,background:s.backgroundColor,color:s.color};}).filter(Boolean)}})()`);
  observations.push({name,device,...data});const img=await call('Page.captureScreenshot',{format:'png'});writeFileSync('output/ui-audit-20261120/'+name+'-'+device+'.png',Buffer.from(img.data,'base64'));
 }
}
writeFileSync('output/ui-audit-20261120/observations.json',JSON.stringify(observations,null,2));console.log(JSON.stringify(observations.map(({name,device,scrollHeight,elements})=>({name,device,scrollHeight,elements})),null,2));
await call('Emulation.clearDeviceMetricsOverride');}finally{ws.close()}
