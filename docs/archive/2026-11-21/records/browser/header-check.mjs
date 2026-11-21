import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base = 'http://127.0.0.1:5188';
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const target = list.find((item) => item.url.startsWith(base));
if (!target) throw new Error('The local test tab is not open.');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
const pending = new Map(); let seq = 0;
ws.addEventListener('message', (event) => { const message = JSON.parse(event.data); const request = pending.get(message.id); if (request) { pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); } });
const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description); return result.result.value; };
const waitFor = async (expression) => { const start = Date.now(); while (Date.now() - start < 20000) { if (await evaluate(expression)) return; await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error('Wait timed out: ' + expression); };
const nav = async (path, selector) => { await call('Page.navigate', { url: base + path }); await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`); };
const clickText = async (text) => evaluate(`(() => { const element = [...document.querySelectorAll('button,a')].find(item => item.textContent.trim() === ${JSON.stringify(text)}); if (!element) throw new Error('Button not found'); element.click(); })()`);
const assert = (value, label) => { if (!value) throw new Error(label); console.log('PASS ' + label); };
const screenshot = async (name) => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); const path = resolve('output/browser', name + '.png'); mkdirSync(resolve('output/browser'), { recursive: true }); writeFileSync(path, Buffer.from(result.data, 'base64')); return path; };
try{await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});console.log(await evaluate(`({width:innerWidth,docWidth:document.documentElement.scrollWidth,header:document.querySelector('.reading-header-inner').getBoundingClientRect().toJSON(),brand:document.querySelector('.reading-brand').getBoundingClientRect().toJSON(),account:document.querySelector('.reading-account').getBoundingClientRect().toJSON(),style: getComputedStyle(document.querySelector('.reading-header-inner')).cssText})`));}finally{ws.close();}
