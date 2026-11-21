import { writeFileSync } from 'node:fs';
const references = [['minimal','https://minimal.gallery/'],['navbar','https://www.navbar.gallery/'],['animate','https://animate-ui.com/']];
for(const [name,url] of references){
  const target=await(await fetch('http://127.0.0.1:9223/json/new?'+encodeURIComponent(url),{method:'PUT'})).json();
  const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  let sequence=0;const waiting=new Map();ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(waiting.has(m.id)){waiting.get(m.id)(m.result);waiting.delete(m.id);}});
  const call=(method,params={})=>new Promise(resolve=>{const id=++sequence;waiting.set(id,resolve);ws.send(JSON.stringify({id,method,params}));});
  let body='';for(let i=0;i<60;i++){const result=await call('Runtime.evaluate',{expression:'document.body?.innerText||""',returnByValue:true});body=result.result?.value||'';if(body.length>200)break;await new Promise(r=>setTimeout(r,500));}
  writeFileSync('output/design-reference/'+name+'.txt',body);console.log(name+': '+body.slice(0,4500));
  const screenshot=await call('Page.captureScreenshot',{format:'png'});if(screenshot?.data)writeFileSync('output/design-reference/'+name+'.png',Buffer.from(screenshot.data,'base64'));
  ws.close();
}
