#!/usr/bin/env node
// Dependency-free CDP driver for the persistent Chrome on port 9223.
// Requires Node >= 22 (global WebSocket). No npm install needed.
//
//   node cdp.mjs list
//   node cdp.mjs eval  "<js>"        [--target <idPrefix|urlSubstring|titleSubstring>]
//   node cdp.mjs text  [--target ...]        // document.body.innerText
//   node cdp.mjs nav   "<url>"       [--target ...]
//   node cdp.mjs newtab "<url>"
//   node cdp.mjs cookies [domainFilter] [--out <file>]
//   node cdp.mjs shot      "<path.png>"  [--target ...]
//   node cdp.mjs fullshot  "<path.png>"  [--target ...] [--width 820] [--scale 2]
//
// Env: CDP_PORT (default 9223)

const PORT = process.env.CDP_PORT || '9223';
const BASE = `http://127.0.0.1:${PORT}`;

function die(msg) {
  console.error(`ERR ${msg}`);
  process.exit(1);
}

async function targets() {
  try {
    const r = await fetch(`${BASE}/json/list`);
    if (!r.ok) die(`/json/list HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    die(`cannot reach ${BASE} — run start-chrome-9223.ps1 first (${e.message})`);
  }
}

function pickTarget(list, sel) {
  const pages = list.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!pages.length) die('no page target');
  if (!sel) return pages[0];
  return (
    pages.find((t) => t.id.startsWith(sel)) ||
    pages.find((t) => (t.url || '').includes(sel)) ||
    pages.find((t) => (t.title || '').includes(sel)) ||
    die(`no target matching "${sel}"`)
  );
}

function exactTarget(list, id) {
  return list.find((target) => target.type === 'page' && target.webSocketDebuggerUrl && target.id === id)
    || die('exact target is no longer available; refusing to select another tab');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let seq = 0;
    ws.addEventListener('open', () =>
      resolve({
        send(method, params = {}) {
          const id = ++seq;
          return new Promise((res, rej) => {
            // 定时器必须可清除，否则响应回来后仍把事件循环吊住 120 秒（2026-10-30 修）
            const timer = setTimeout(() => {
              if (pending.has(id)) {
                pending.delete(id);
                rej(new Error(`timeout: ${method}`));
              }
            }, 120000);
            if (typeof timer.unref === 'function') timer.unref();
            pending.set(id, { res, rej, timer });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close: () => ws.close(),
      })
    );
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (msg.id && pending.has(msg.id)) {
        const { res, rej, timer } = pending.get(msg.id);
        pending.delete(msg.id);
        if (timer) clearTimeout(timer);
        if (msg.error) rej(new Error(`${msg.error.message} (${msg.error.code})`));
        else res(msg.result);
      }
    });
    ws.addEventListener('error', () => reject(new Error('websocket error')));
  });
}

const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = {};
const args = [];
for (let i = 1; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i];
  else args.push(argv[i]);
}

if (!cmd || cmd === 'list') {
  const list = await targets();
  if (flags.json) {
    console.log(JSON.stringify(list.filter((target) => target.type === 'page').map(({ id, title, url }) => ({ id, title, url }))));
    process.exit(0);
  }
  for (const t of list) {
    if (t.type === 'page') console.log(`${t.id}\t${t.title || '(no title)'}\t${t.url}`);
  }
  process.exit(0);
}

if (cmd === 'newtab') {
  const url = args[0] || 'about:blank';
  const r = await fetch(`${BASE}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  const t = await r.json().catch(() => null);
  if (!r.ok || !t?.id) die(`new tab failed (HTTP ${r.status})`);
  if (flags.json) {
    console.log(JSON.stringify({ id: t.id, url: t.url || url, title: t.title || '' }));
    process.exit(0);
  }
  console.log(t ? `opened ${t.id} ${url}` : `requested ${url} (HTTP ${r.status})`);
  process.exit(0);
}

const list = await targets();
const t = flags['target-id'] ? exactTarget(list, flags['target-id']) : pickTarget(list, flags.target);
const cdp = await connect(t.webSocketDebuggerUrl);
await cdp.send('Runtime.enable').catch(() => {});

try {
  if (cmd === 'eval') {
    const expr = args[0];
    if (!expr) die('eval needs an expression');
    const r = await cdp.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (r.exceptionDetails) die(`page exception: ${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description || ''}`);
    const v = r.result?.value;
    console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
  } else if (cmd === 'type') {
    // 真实键入：走 Input.insertText，React/Vue 受控输入框才收得到（.value 赋值无效的场景）
    const text = args[0];
    if (text === undefined) die('type needs text');
    if (flags.focus) {
      const sel = JSON.stringify(flags.focus);
      const r0 = await cdp.send('Runtime.evaluate', {
        expression: `(function(){var e=document.querySelector(${sel});if(!e)return false;e.focus();if(e.click){try{e.click()}catch(_){}}return true})()`,
        returnByValue: true,
        userGesture: true,
      });
      if (!r0.result?.value) die(`focus target not found: ${flags.focus}`);
    }
    await cdp.send('Input.insertText', { text });
    if (flags.enter) {
      const k = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...k, text: '\r' });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
    }
    await new Promise((r) => setTimeout(r, Number(flags.wait || 2500)));
    console.log(`typed ${text.length} chars${flags.enter ? ' + Enter' : ''}`);
  } else if (cmd === 'click') {
    // 真实鼠标点击（Input.dispatchMouseEvent）：React/Electron 应用只认受信任事件
    const sel = flags.selector || args[0];
    if (!sel) die('click needs a selector');
    const q = JSON.stringify(sel);
    const rc = await cdp.send('Runtime.evaluate', {
      expression: `(function(){var e=document.querySelector(${q});if(!e)return null;var r=e.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`,
      returnByValue: true,
    });
    const pt = rc.result?.value;
    if (!pt) die(`selector not found: ${sel}`);
    const base = { x: pt.x, y: pt.y, button: 'left', clickCount: 1 };
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y, buttons: 0 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...base, buttons: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base, buttons: 0 });
    await new Promise((r) => setTimeout(r, Number(flags.wait || 400)));
    console.log(`clicked ${sel} @ ${pt.x},${pt.y}`);
  } else if (cmd === 'ktype') {
    // 逐字符真实按键：受控输入框（React）只认这条路，insertText 会被丢掉
    const text = args[0] || '';
    if (flags.focus) {
      const sel = JSON.stringify(flags.focus);
      await cdp.send('Runtime.evaluate', { expression: `(function(){var e=document.querySelector(${sel});if(!e)return false;e.focus();return true})()`, returnByValue: true });
      await new Promise((r) => setTimeout(r, 150));
    }
    for (const ch of text) {
      const isUpper = ch >= 'A' && ch <= 'Z';
      const isDigit = ch >= '0' && ch <= '9';
      const vk = isUpper || (ch >= 'a' && ch <= 'z') ? ch.toUpperCase().charCodeAt(0) : isDigit ? ch.charCodeAt(0) : 0;
      const code = isUpper || (ch >= 'a' && ch <= 'z') ? 'Key' + ch.toUpperCase() : isDigit ? 'Digit' + ch : '';
      await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ch, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await cdp.send('Input.dispatchKeyEvent', { type: 'char', key: ch, code, text: ch, unmodifiedText: ch, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await new Promise((r) => setTimeout(r, 40));
    }
    await new Promise((r) => setTimeout(r, Number(flags.wait || 500)));
    console.log('ktyped ' + text.length + ' chars');
  } else if (cmd === 'key') {
    // 真实按键（Input.dispatchKeyEvent）：Enter 提交、Escape 关闭等
    const k = args[0] || 'Enter';
    const map = {
      Enter: { key: 'Enter', code: 'Enter', vk: 13, text: '\r' },
      Escape: { key: 'Escape', code: 'Escape', vk: 27 },
      ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', vk: 40 },
      ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', vk: 38 },
      Backspace: { key: 'Backspace', code: 'Backspace', vk: 8 },
      Tab: { key: 'Tab', code: 'Tab', vk: 9 },
    };
    const d = map[k] || { key: k, code: k, vk: 0 };
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: d.key, code: d.code, windowsVirtualKeyCode: d.vk, nativeVirtualKeyCode: d.vk });
    if (d.text) await cdp.send('Input.dispatchKeyEvent', { type: 'char', key: d.key, code: d.code, text: d.text, unmodifiedText: d.text, windowsVirtualKeyCode: d.vk, nativeVirtualKeyCode: d.vk });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: d.key, code: d.code, windowsVirtualKeyCode: d.vk, nativeVirtualKeyCode: d.vk });
    await new Promise((r) => setTimeout(r, Number(flags.wait || 400)));
    console.log('key ' + k);
  } else if (cmd === 'wheel') {
    // 真实滚轮（Input.dispatchMouseEvent mouseWheel）：虚拟列表只能这样滚动
    const x = Number(args[0] || 200), y = Number(args[1] || 400), dy = Number(args[2] || 600);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy });
    await new Promise((r) => setTimeout(r, Number(flags.wait || 700)));
    console.log('wheel ' + dy + ' @' + x + ',' + y);
  } else if (cmd === 'text') {
    const r = await cdp.send('Runtime.evaluate', {
      expression: 'document.body ? document.body.innerText : ""',
      returnByValue: true,
    });
    console.log(r.result?.value || '');
  } else if (cmd === 'nav') {
    const url = args[0];
    if (!url) die('nav needs a url');
    const r = await cdp.send('Page.navigate', { url });
    console.log(`navigated -> ${r.frameId || '?'}`);
  } else if (cmd === 'cookies') {
    const r = await cdp.send('Storage.getCookies', {});
    let cks = r.cookies || [];
    if (args[0]) cks = cks.filter((c) => (c.domain || '').includes(args[0]));
    cks = cks.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
    }));
    const out = JSON.stringify(cks, null, 2);
    if (flags.out) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(flags.out, out, 'utf8');
      console.log(`wrote ${cks.length} cookies -> ${flags.out}`);
    } else {
      console.log(`# ${cks.length} cookies`);
      console.log(out);
    }
  } else if (cmd === 'shot') {
    const path = args[0] || 'shot.png';
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path, Buffer.from(r.data, 'base64'));
    console.log(`saved ${path}`);
  } else if (cmd === 'fullshot') {
    // Full-page PNG with fixed width + high DPR, for readable text screenshots.
    const path = args[0] || 'fullshot.png';
    const width = parseInt(flags.width || '820', 10);
    const scale = parseFloat(flags.scale || '2');
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 400,
      deviceScaleFactor: scale,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 500));
    const metrics = await cdp.send('Page.getLayoutMetrics');
    const cs = metrics.cssContentSize || metrics.contentSize;
    const w = Math.ceil(cs.width);
    const h = Math.ceil(cs.height);
    const r = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: w, height: h, scale: 1 },
    });
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path, Buffer.from(r.data, 'base64'));
    try { await cdp.send('Emulation.clearDeviceMetricsOverride'); } catch (_) { /* The tab may close after its screenshot. */ }
    console.log(`saved ${path} (${w}x${h} css @ ${scale}x)`);
  } else {
    die(`unknown command "${cmd}"`);
  }
} finally {
  cdp.close();
}
