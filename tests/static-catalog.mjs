import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildCatalog } from '../scripts/build-catalog.mjs';

const directory = await mkdtemp(join(tmpdir(), 'fanjin-static-catalog-'));
try {
  const result = await buildCatalog({ outputDirectory: directory });
  const index = JSON.parse(await readFile(join(directory, 'content/index.json'), 'utf8'));
  const search = JSON.parse(await readFile(join(directory, 'content/search.json'), 'utf8'));
  assert.equal(index.version, 1); assert.equal(index.books.length, result.books); assert.equal(index.books.length, 6);
  assert.equal(search.items.length, result.passages);
  assert.ok(index.books.every((book) => book.sourceVerified && book.sourceUrl && book.license && book.licenseUrl && book.categoryName && book.publishStatus === 'published'));
  assert.ok(index.books.every((book) => !('passages' in book)));
  console.log('  PASS static index includes verified public metadata and no private user state');
  for (const book of index.books) {
    const detail = JSON.parse(await readFile(join(directory, 'content/books', `${book.slug}.json`), 'utf8'));
    assert.equal(detail.id, book.id); assert.equal(detail.passages.length, book.passageCount);
    assert.equal(detail.wordCount, book.wordCount);
    assert.ok(detail.passages.every((passage) => passage.id > 0 && passage.originalText && passage.slug));
  }
  console.log('  PASS each static book has compatible complete passages and stable identities');
  const normalize = (text) => Array.from(text).map((character) => search.charMap[character] || character).join('').toLowerCase();
  for (const query of ['學而時習之', '学而时习之']) {
    const hits = search.items.filter((item) => item.normalized.original.includes(normalize(query)));
    assert.ok(hits.some((item) => item.scriptureSlug === 'lunyu'));
  }
  assert.equal(normalize('𠮷學'), '𠮷学');
  console.log('  PASS lightweight query character map matches normalized traditional and simplified passages');
  const heart = JSON.parse(await readFile(resolve('data/catalog/heart-sutra.json'), 'utf8'));
  const publishedHeart = JSON.parse(await readFile(join(directory, 'content/books/heart-sutra.json'), 'utf8'));
  assert.equal(publishedHeart.sourceHeader, heart.sourceHeader);
  assert.equal(await readFile(join(directory, 'content-notices.txt'), 'utf8'), await readFile(resolve('data/catalog/COPYRIGHT.md'), 'utf8'));
  assert.deepEqual(await readFile(join(directory, 'content-sources/heart-sutra-T08n0251.xml')), await readFile(resolve('data/catalog/sources/heart-sutra-T08n0251.xml')));
  assert.match(await readFile(join(directory, 'content-sources/opencc-notices.txt'), 'utf8'), /Apache/);
  const publicFiles = await readdir(directory, { recursive: true });
  assert.ok(publicFiles.every((file) => !/\.sqlite|\.env|admin-access|private|backup/i.test(file)));
  console.log('  PASS only selected public texts and intact licensing notices are published');
  const identities = index.books.map((book) => [book.slug, book.id]);
  await buildCatalog({ outputDirectory: directory });
  const repeated = JSON.parse(await readFile(join(directory, 'content/index.json'), 'utf8'));
  assert.deepEqual(repeated.books.map((book) => [book.slug, book.id]), identities);
  console.log('  PASS catalog regeneration keeps identifiers used by local reader data');
  console.log('\nStatic catalog: 5 passed.');
} finally { await rm(directory, { recursive: true, force: true }); }
