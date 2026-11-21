import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import baseline from '../../../playwright.config';

export default defineConfig({
  ...baseline,
  testDir: resolve('output/engineering/e2e-failure-probe'),
  testMatch: 'failure.spec.ts',
  outputDir: resolve('output/engineering/e2e-failure-probe/results'),
  retries: 0,
  webServer: {
    ...(Array.isArray(baseline.webServer) ? baseline.webServer[0] : baseline.webServer!),
    cwd: resolve('.'),
  },
});
