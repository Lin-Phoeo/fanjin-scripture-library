import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Current operating documents only; dated research is evidence, not a live runbook.
export const operatingDocuments = [
  'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md',
  'README.md', 'PRODUCT.md', 'DESIGN.md', 'docs/README.md',
  'docs/ARCHITECTURE.md', 'docs/API.md', 'docs/DATABASE.md',
  'docs/DEVELOPMENT.md', 'docs/DEPLOYMENT.md', 'docs/CONTENT_IMPORT.md',
  'docs/CONTENT_SOURCES.md', 'docs/agents/WORKFLOW.md', 'docs/agents/STATUS.md',
];

function proseOnly(source) {
  let fence;
  return source.split('\n').map((line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      return '';
    }
    if (marker) { fence = marker[1]; return ''; }
    return line;
  }).join('\n').replace(/(`+)[^\n]*?\1/g, '');
}

export function inspectDocument({ file, source, root, scripts, exists = existsSync }) {
  const errors = [];
  for (const [, raw] of proseOnly(source).matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = raw.startsWith('<') ? raw.slice(1, raw.indexOf('>')) : raw.split(/\s+["']/)[0];
    if (/^(?:[a-z]:[\\/]|file:)/i.test(target)) { errors.push(`${file}: absolute local link is not portable: ${target}`); continue; }
    if (/^(?:https?:|mailto:|tel:|#)/i.test(target)) continue;
    if (/^[a-z][a-z\d+.-]*:/i.test(target)) { errors.push(`${file}: unsupported link scheme: ${target}`); continue; }
    let local;
    try { local = decodeURIComponent(target.split(/[?#]/)[0]); }
    catch { errors.push(`${file}: invalid link encoding: ${target}`); continue; }
    const absolute = resolve(root, dirname(file), local);
    const within = relative(root, absolute);
    if (isAbsolute(local) || within === '..' || within.startsWith('../') || within.startsWith('..\\') || isAbsolute(within)) {
      errors.push(`${file}: link escapes repository: ${target}`);
    } else if (!exists(absolute)) errors.push(`${file}: missing link target: ${target}`);
  }
  for (const [, command] of source.matchAll(/\bnpm run ([\w:-]+)/g)) {
    if (!Object.hasOwn(scripts, command)) errors.push(`${file}: unknown npm script: ${command}`);
  }
  if (/(?:\b[A-Z]:[\\/]Users[\\/]|\/Users\/|\/home\/)[^\s`]+/i.test(source)) {
    errors.push(`${file}: use a repository-relative path or user-directory placeholder`);
  }
  return errors;
}

export function checkDocs(root, files = operatingDocuments) {
  const { scripts } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const errors = [];
  for (const file of files) {
    const absolute = resolve(root, file);
    if (!existsSync(absolute)) { errors.push(`missing operating document: ${file}`); continue; }
    errors.push(...inspectDocument({ file, source: readFileSync(absolute, 'utf8'), root, scripts }));
  }
  for (const [file, expected] of [['CLAUDE.md', '@AGENTS.md'], ['GEMINI.md', '@./AGENTS.md']]) {
    if (existsSync(resolve(root, file)) && readFileSync(resolve(root, file), 'utf8').trim() !== expected) {
      errors.push(`${file}: keep the shared AGENTS.md import as the only content`);
    }
  }
  const copilot = resolve(root, '.github/copilot-instructions.md');
  if (existsSync(copilot) && !readFileSync(copilot, 'utf8').includes('[AGENTS.md](../AGENTS.md)')) {
    errors.push('.github/copilot-instructions.md: shared AGENTS.md reference is missing');
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkDocs(resolve('.'));
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`PASS ${operatingDocuments.length} operating documents: links, commands and shared agent entries`);
}
