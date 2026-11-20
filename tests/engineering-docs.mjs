import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { checkDocs, inspectDocument } from '../scripts/check-docs.mjs';

const tempParent = resolve(tmpdir());
const root = mkdtempSync(resolve(tempParent, 'fanjin-docs-'));
const write = (file, value) => {
  const target = resolve(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value);
};
try {
  write('package.json', JSON.stringify({ scripts: { 'check:pages': 'echo check' } }));
  write('AGENTS.md', '# Shared rules');
  write('CLAUDE.md', '@AGENTS.md\n');
  write('GEMINI.md', '@./AGENTS.md\n');
  write('.github/copilot-instructions.md', 'Read [AGENTS.md](../AGENTS.md).');
  write('docs/reading guide.md', '# Reading');
  const inspect = source => inspectDocument({ file: 'docs/guide.md', source, root, scripts: { 'check:pages': 'check' } });
  assert.deepEqual(inspect('[rules](../AGENTS.md#rules) [guide](<reading guide.md>) [web](https://example.org)\nnpm run check:pages'), []);
  assert.match(inspect('[missing](missing.md)')[0], /missing link target/);
  assert.match(inspect('npm run typo:check')[0], /unknown npm script/);
  assert.match(inspect('[outside](../../outside.md)')[0], /escapes repository/);
  assert.match(inspect('[broken](%broken.md)')[0], /invalid link encoding/);
  assert.match(inspect('[local](C:/temporary/guide.md)')[0], /absolute local link/);
  assert.match(inspect('[local](file:///C:/temporary/guide.md)')[0], /absolute local link/);
  assert.deepEqual(inspect('```markdown\n[example](not-a-real-file.md)\n```\n`[inline](missing.md)`'), []);
  assert.deepEqual(inspect('~~~~markdown\n[example](missing.md)\n~~~~~'), []);
  assert.match(inspect('C:/Users/Example/private.md')[0], /relative path/);
  assert.deepEqual(checkDocs(root, ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md']), []);
  write('CLAUDE.md', '@AGENTS.md\nDiverging instructions');
  assert.ok(checkDocs(root, ['AGENTS.md']).some(error => error.startsWith('CLAUDE.md:')));
  write('.github/copilot-instructions.md', 'Rules elsewhere');
  assert.ok(checkDocs(root, ['AGENTS.md']).some(error => error.startsWith('.github/')));
  console.log('PASS documentation checks reject broken routes, commands, private paths and diverging agent entries');
} finally {
  assert.equal(dirname(root), tempParent);
  assert.ok(root.startsWith(resolve(tempParent, 'fanjin-docs-')));
  rmSync(root, { recursive: true, force: true });
}
