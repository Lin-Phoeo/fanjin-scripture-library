import { test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test('controlled assertion failure releases its runner-owned context and server', async ({ page, context, browser }) => {
  const evidence = { pageClosed: false, contextClosed: false, browserDisconnected: false };
  const directory = resolve('output/engineering/e2e-failure-probe');
  mkdirSync(directory, { recursive: true });
  const save = () => writeFileSync(resolve(directory, 'lifecycle.json'), JSON.stringify(evidence, null, 2));
  page.on('close', () => { evidence.pageClosed = true; save(); });
  context.on('close', () => { evidence.contextClosed = true; save(); });
  browser.on('disconnected', () => { evidence.browserDisconnected = true; save(); });
  await page.goto('./#/library');
  save();
  throw new Error('INTENTIONAL_CLEANUP_PROBE');
});
