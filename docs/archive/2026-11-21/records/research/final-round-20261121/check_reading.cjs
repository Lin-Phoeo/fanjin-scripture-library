const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  let browser;
  const result = {checks:[], browserClosed:false};
  try {
    browser = await chromium.launch({headless:true});
    const context = await browser.newContext({viewport:{width:1280,height:1000}});
    try {
      const page = await context.newPage();
      await page.goto(pathToFileURL(path.join(__dirname,'deliverable','阅读版.html')).href);
      await page.screenshot({path:path.join(__dirname,'html-desktop.png')});
      result.checks.push(await page.evaluate(() => ({
        viewport:'desktop',title:document.title,
        tocLinks:document.querySelectorAll('nav a').length,
        overflow:document.documentElement.scrollWidth>innerWidth,
        remoteResources:[...document.querySelectorAll('[src],link[href]')].map(e=>e.src||e.href).filter(s=>/^https?:/.test(s)),
        headingCount:document.querySelectorAll('h2').length,
        brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash)
      })));
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:path.join(__dirname,'html-mobile.png')});
      result.checks.push(await page.evaluate(() => ({
        viewport:'mobile',overflow:document.documentElement.scrollWidth>innerWidth,
        overflowElements:[...document.body.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>e.tagName)
      })));
    } finally { await context.close(); }
  } finally {
    if (browser) {
      await browser.close();
      result.browserClosed = !browser.isConnected();
    }
    fs.writeFileSync(path.join(__dirname,'reading-checks.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
  }
})().catch(e=>{console.error(e);process.exitCode=1});
