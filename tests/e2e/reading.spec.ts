import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test, expect, openRoute, expectNoHorizontalOverflow } from './fixtures';

type HeartBook = { slug: string; title: string; passages: Array<{ slug: string; title: string; originalText: string }> };
const heart: HeartBook = JSON.parse(await readFile(resolve('data/catalog/heart-sutra.json'), 'utf8'));
const first = heart.passages[0];
const readingRoute = `/read/${heart.slug}/${first.slug}`;

async function selectOriginalText(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '阅读设置', exact: true }).click();
  await page.getByRole('button', { name: '原文', exact: true }).click();
  await page.keyboard.press('Escape');
}

test('Pages routes, chapters, source links and simplified search work without a backend', async ({ page, request, baseURL }) => {
  await openRoute(page, '/library');
  await expect(page.getByRole('heading', { name: '经藏', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '开始阅读', exact: false }).first()).toBeVisible();

  await openRoute(page, '/book/heart-sutra');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(heart.title);
  await page.getByText('版本与来源', { exact: true }).click();
  await expect(page.getByRole('link', { name: '原始资料', exact: true })).toHaveAttribute('href', /cbeta-git\/xml-p5/);
  const copyright = page.getByRole('link', { name: '本站内容版权说明' });
  const href = await copyright.getAttribute('href');
  expect(href).toBeTruthy();
  const response = await request.get(new URL(href!, baseURL).href);
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain('CBETA');

  await page.getByRole('link', { name: '开始阅读', exact: false }).click();
  await expect(page.getByRole('group', { name: /按回车选中此段/ })).toHaveCount(heart.passages.length);
  await selectOriginalText(page);
  await page.reload();
  await expect(page.getByRole('group', { name: /按回车选中此段/ }).first()).toContainText(first.originalText);

  await openRoute(page, '/search');
  await page.getByRole('textbox', { name: '搜索原文关键词' }).fill('学而时习之');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  const hit = page.getByRole('link', { name: /阅读上下文/ }).filter({ hasText: '论语' }).first();
  await expect(hit).toBeVisible();
  await hit.click();
  await expect(page.getByRole('group', { name: /按回车选中此段/ }).first()).toContainText(/學而時習之|学而时习之/);
  await expect(page).toHaveURL(/#\/read\/lunyu\//);
});

test('language switching preserves drafts, saved notes, bookmarks and a validated backup', async ({ page }, testInfo) => {
  const draft = 'Smoke 私人草稿：学习與實踐保持原样。';
  await openRoute(page, readingRoute);
  const paragraph = page.getByRole('group', { name: /按回车选中此段/ }).first();
  await selectOriginalText(page);
  await expect(paragraph).toContainText(first.originalText);
  await paragraph.press('Enter');
  await page.getByRole('button', { name: '加书签', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消书签', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '记笔记', exact: true }).click();
  await page.getByRole('textbox', { name: '我的心得', exact: true }).fill(draft);

  await page.getByRole('button', { name: '切換為繁體中文' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant-TW');
  await expect(page.getByRole('textbox', { name: '我的心得', exact: true })).toHaveValue(draft);
  await page.getByRole('button', { name: '切换为简体中文' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans-CN');
  await expect(page.getByRole('textbox', { name: '我的心得', exact: true })).toHaveValue(draft);
  await page.getByRole('button', { name: '保存摘录', exact: true }).click();
  await expect(page.getByText(draft, { exact: true })).toBeVisible();
  await page.reload();
  const notesButton = page.getByRole('button', { name: /^笔记/ });
  await expect(notesButton).toBeVisible();
  if (await notesButton.getAttribute('aria-expanded') !== 'true') await notesButton.click();
  await expect(page.getByText(draft, { exact: true })).toBeVisible();

  await openRoute(page, '/profile');
  await page.getByRole('tab', { name: '数据备份', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载完整备份', exact: true }).click();
  const download = await downloadEvent;
  const backupPath = testInfo.outputPath('isolated-reader-backup.json');
  await download.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, 'utf8'));
  expect(backup.format).toBe('fanjin-local-backup');
  expect(backup.data.notes).toHaveLength(1);
  expect(backup.data.notes[0]).toMatchObject({ note: draft, excerpt: first.originalText, passageSlug: first.slug });
  expect(backup.data.bookmarks).toHaveLength(1);
  expect(backup.data.bookmarks[0].passageSlug).toBe(first.slug);

  const fileInput = page.getByLabel('选择梵烬 JSON 备份', { exact: true });
  await fileInput.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...backup, version: 999 })) });
  await expect(page.getByRole('alert')).toContainText(/不支持|不是支持/);
  await expect(page.getByRole('button', { name: '确认替换并导入' })).toHaveCount(0);

  const restored = { ...backup, data: { ...backup.data, profile: { name: 'Smoke 还原书斋' } } };
  await fileInput.setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(restored)) });
  await expect(page.getByRole('region', { name: '待导入备份预览' })).toContainText('Smoke 还原书斋');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: '确认替换并导入' }).click();
  await page.getByRole('tab', { name: '偏好', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '书斋称呼', exact: true })).not.toHaveValue('Smoke 还原书斋');
  await page.getByRole('tab', { name: '数据备份', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '确认替换并导入' }).click();
  await expect(page.getByRole('status')).toContainText('备份已导入');
  await page.getByRole('tab', { name: '偏好', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '书斋称呼', exact: true })).toHaveValue('Smoke 还原书斋');
  await openRoute(page, '/notes');
  await expect(page.getByText(draft, { exact: true })).toBeVisible();
  await expect(page.getByRole('blockquote')).toContainText(first.originalText);
});

test('320px reading reflows, preserves all short-scripture text and supports keyboard tools', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await openRoute(page, readingRoute);
  await selectOriginalText(page);
  const paragraphs = page.getByRole('group', { name: /按回车选中此段/ });
  await expect(paragraphs).toHaveCount(heart.passages.length);
  for (const [index, passage] of heart.passages.entries()) await expect(paragraphs.nth(index)).toContainText(passage.originalText);
  await expectNoHorizontalOverflow(page);

  const directory = page.getByRole('button', { name: /展开目录|收起目录/ });
  await directory.click();
  await expect(directory).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: '篇章目录', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(directory).toHaveAttribute('aria-expanded', 'false');
  await expect(directory).toBeFocused();

  await page.getByRole('button', { name: '阅读设置', exact: true }).click();
  await page.getByRole('button', { name: '23', exact: true }).click();
  await page.keyboard.press('Escape');
  await expectNoHorizontalOverflow(page);
  await expect(paragraphs.first()).toContainText(first.originalText);
  await page.screenshot({ path: testInfo.outputPath('reader-320px.png') });
});
