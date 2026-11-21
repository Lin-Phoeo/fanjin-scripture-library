import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Runs the original shell chain against a fake cdp.mjs; no browser/network calls.
const run = promisify(execFile);
const dir = await mkdtemp(join(tmpdir(), 'bfetch-repro-'));
try {
  const original = await readFile('{USER_HOME}/.agents/tools/bfetch-text.sh', 'utf8');
  const path = dir.replaceAll('\\', '/');
  await writeFile(join(dir, 'bfetch-original.sh'), original.replace(/^DIR=.*$/m, `DIR="${path}"`));
  await writeFile(join(dir, 'cdp.mjs'), `import {appendFileSync} from 'node:fs';
const args=process.argv.slice(2);appendFileSync(${JSON.stringify(join(dir, 'calls.jsonl'))},JSON.stringify(args)+'\\n');
console.log(args[0]==='eval'?Buffer.from('A mock post body that is longer than twenty bytes.').toString('base64'):'navigated');`);
  const bash = process.env.GIT_BASH || 'C:/Program Files/Git/bin/bash.exe';
  for (let floor = 1; floor <= 3; floor++) await run(bash, [join(dir, 'bfetch-original.sh'), 'https://linux.do/t/topic/123', `https://linux.do/raw/123/${floor}`, join(dir, `raw-${floor}.md`), '0'], { timeout: 10000 });
  const calls = (await readFile(join(dir, 'calls.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  const nav = calls.filter((args) => args[0] === 'nav');
  console.log(JSON.stringify({ floors: 3, navigationCalls: nav.length, allNavigationsHaveTarget: nav.every((args) => args.includes('--target')), allFetchesHaveTarget: calls.filter((args) => args[0] === 'eval').every((args) => args.includes('--target')), expectedNavigationMaximum: 1, regression: nav.length > 1 }, null, 2));
  if (nav.length > 1) process.exitCode = 1;
} finally { await rm(dir, { recursive: true, force: true }); }
