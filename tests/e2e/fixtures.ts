import { test as base, expect, type Page } from '@playwright/test';

// Playwright creates a fresh browser context per test. No persistent profile or CDP is used.
export const test = base.extend<{ staticNetworkGuard: void }>({
  staticNetworkGuard: [async ({ context }, use, testInfo) => {
    const violations: string[] = [];
    const observe = (page: Page) => {
      page.on('pageerror', (error) => violations.push(`Uncaught page error: ${error.message}`));
      page.on('console', (entry) => { if (entry.type() === 'error') violations.push(`Console error: ${entry.text()}`); });
    };
    context.pages().forEach(observe);
    context.on('page', observe);
    context.on('request', (request) => {
      const url = new URL(request.url());
      if (/\/api(?:\/|$)/.test(url.pathname)) violations.push(`Server API request: ${request.method()} ${url.pathname}`);
    });
    context.on('response', (response) => {
      if (response.status() >= 400) violations.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`);
    });
    await use();
    if (violations.length) await testInfo.attach('static-network-errors', { body: violations.join('\n'), contentType: 'text/plain' });
    expect(violations, 'Static reading must not call a server API or emit browser errors').toEqual([]);
  }, { auto: true }],
});

export { expect };

export async function openRoute(page: Page, route: string) {
  await page.goto(`./#${route}`);
  await expect(page.getByRole('main')).toBeVisible();
}

export async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), {
    message: 'Page should reflow without horizontal scrolling',
    timeout: 10_000,
  }).toBeLessThanOrEqual(1);
}
