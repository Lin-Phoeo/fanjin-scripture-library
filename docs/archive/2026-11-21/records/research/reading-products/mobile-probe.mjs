import {writeFileSync} from 'node:fs';
const targets=await (await fetch('http://127.0.0.1:9223/json/list')).json();
const wanted=[['standard','36FEA63ED1444048353AFFA41F11A740'],['sutta','F81BECD2EE724F74B1821E93D07B1340'],['wikisource','77B54B0C14859672647C3E8BC5402C1B']];
const evidence=[];
for(const [name,id] of wanted){
 const target=targets.find(t=>t.id===id);if(!target)throw Error('missing exact tab '+id);
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true})});
 let sequence=0;const pending=new Map();ws.addEventListener('message',e=>{const v=JSON.parse(e.data);const p=pending.get(v.id);if(p){pending.delete(v.id);clearTimeout(p.timer);v.error?p.no(Error(v.error.message)):p.ok(v.result)}});
 const send=(method,params={})=>new Promise((ok,no)=>{const n=++sequence;const timer=setTimeout(()=>{pending.delete(n);no(Error(method+' timeout'))},12000);pending.set(n,{ok,no,timer});ws.send(JSON.stringify({id:n,method,params}))});
 try{
  await send('Page.bringToFront');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await new Promise(r=>setTimeout(r,250));
  const result=await send('Runtime.evaluate',{returnByValue:true,expression:`JSON.stringify((()=>{const nodes=[];function scan(root){for(const e of root.querySelectorAll('*')){if(e.matches('p,h1,h2,nav,button,md-icon-button')&&e.getBoundingClientRect().width>0){const r=e.getBoundingClientRect();if(r.top<844&&r.bottom>0)nodes.push({tag:e.tagName,text:(e.innerText||e.getAttribute('title')||e.id).slice(0,100),width:r.width,left:r.left,font:getComputedStyle(e).fontSize,lineHeight:getComputedStyle(e).lineHeight})}if(e.shadowRoot)scan(e.shadowRoot)}}scan(document);return {title:document.title,url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,visible:nodes}})())`});
  const entry={name,...JSON.parse(result.result.value)};evidence.push(entry);
  try{const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync('output/research/reading-products/'+name+'-mobile.png',Buffer.from(shot.data,'base64'));entry.screenshot=name+'-mobile.png'}catch(e){entry.screenshotError=e.message}
  console.log(JSON.stringify(entry));
 }finally{await send('Emulation.clearDeviceMetricsOverride').catch(()=>{});ws.close()}
}
writeFileSync('output/research/reading-products/mobile-observations.json',JSON.stringify(evidence,null,2));
