import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT || 4178);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('E2E_PORT must be an unprivileged local port.');
const repository = process.env.GITHUB_REPOSITORY?.split('/').at(-1) || 'fanjin-scripture-library';
const basePath = process.env.PAGES_BASE_PATH || `/${repository}/`;
if (!/^\/(?:[A-Za-z0-9._-]+\/)*$/.test(basePath)) throw new Error('PAGES_BASE_PATH must be an absolute URL directory.');
const baseURL = `http://127.0.0.1:${port}${basePath}`;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: 'line',
  outputDir: 'test-results/e2e',
  use: {
    baseURL,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    acceptDownloads: true,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
  // Playwright owns both the browser and this server. Never reuse a user service or CDP session.
  webServer: {
    command: `node node_modules/vite/bin/vite.js preview --config vite.config.ts --host 127.0.0.1 --port ${port} --strictPort --base ${basePath}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 15_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
  },
});
