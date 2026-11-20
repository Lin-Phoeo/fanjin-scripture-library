import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const repository = process.env.GITHUB_REPOSITORY?.split('/').at(-1) || 'fanjin-scripture-library';
const base = process.env.PAGES_BASE_PATH || `/${repository}/`;
if (!/^\/(?:[A-Za-z0-9._-]+\/)*$/.test(base)) throw new Error('PAGES_BASE_PATH must be an absolute URL directory path.');
const child = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.config.ts', '--base', base], {
  stdio: 'inherit', windowsHide: true, env: { ...process.env, VITE_STATIC_MODE: 'true' },
});
const [code] = await once(child, 'exit');
process.exitCode = code ?? 1;
