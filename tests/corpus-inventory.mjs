import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  checkedPath, distinct, sha256, sourceIdentity, verifyBuddhistEdition,
  verifyDaoEdition, verifyHash, verifyInventory, verifyPassages, verifyPublication,
} from './helpers/corpus-checks.mjs';
import { runCorpusNegativeChecks } from './helpers/corpus-negative-checks.mjs';

const bytes = (path) => readFile(resolve(checkedPath(path)));
const read = async (path) => JSON.parse((await bytes(path)).toString('utf8'));
const catalogue = (name) => `data/catalog/${checkedPath(name)}`;
const [manifest, buddhist, dao, buddhistInventory, daoInventory, established] = await Promise.all([
  read('data/catalog/catalog-manifest.json'), read('data/catalog/buddhist-coverage.json'),
  read('data/catalog/sources/dao-expansion/expansion-report.json'), read('data/catalog/sources/buddhist-inventory.json'),
  read('data/catalog/sources/dao-expansion/inventory.json'), read('tests/fixtures/corpus-established-sources.json'),
]);
distinct(manifest.files, 'publication manifest');
assert.ok(manifest.files.length, 'Publication manifest cannot be empty');
for (const filename of manifest.files) assert.match(filename, /^[a-z0-9][a-z0-9-]*\.json$/, 'Manifest must contain JSON basenames');
const inventories = { cbeta: verifyInventory(buddhistInventory, 'id', 'Buddhist inventory'), dao: verifyInventory(daoInventory, 'repo', 'Dao inventory') };
distinct(buddhist.files, 'Buddhist coverage files');
distinct(buddhist.books.map((row) => row.id), 'Buddhist coverage IDs');
distinct(buddhist.books.map((row) => row.filename), 'Buddhist coverage rows');
assert.deepEqual([...buddhist.files].sort(), buddhist.books.map((row) => row.filename).sort(), 'Buddhist coverage files/rows disagree');
distinct(dao.books.map((row) => row.repo), 'Dao provenance repositories');
distinct(dao.books.map((row) => row.slug), 'Dao provenance slugs');
distinct(established.books.map((row) => row.filename), 'Established source baselines');

const evidence = new Map();
const register = (filename, item) => { assert.ok(!evidence.has(filename), `${filename}: duplicate evidence route`); evidence.set(filename, item); };
for (const row of buddhist.books) register(row.filename, { kind: 'cbeta', id: row.id, row });
for (const row of dao.books) register(`${row.slug}.json`, { kind: 'dao', id: row.repo, row });
for (const row of established.books) register(row.filename, row);
const books = new Map(await Promise.all(manifest.files.map(async (filename) => [filename, await read(catalogue(filename))])));
distinct([...books.values()].map((book) => book.slug), 'Published book slugs');
for (const [filename, book] of books) {
  assert.equal(filename, `${book.slug}.json`, `${filename}: published filename/slug mismatch`);
  verifyPublication(book, evidence.get(filename), inventories);
  verifyPassages(book);
}
console.log(`PASS every manifest edition (${books.size}) has explicit reviewed source evidence; unreviewed identities cannot be renamed into publication`);

let sourceBytes = 0;
for (const row of buddhist.books) {
  assert.ok(books.has(row.filename), `${row.filename}: reviewed coverage missing from manifest`);
  const book = books.get(row.filename), source = await bytes(catalogue(book.sourceFile));
  verifyBuddhistEdition(row, book, source);
  sourceBytes += source.length;
}
assert.equal(buddhist.totals.books, buddhist.books.length, 'Buddhist declared book total mismatch');
assert.equal(buddhist.totals.passages, buddhist.books.reduce((sum, row) => sum + row.passages, 0), 'Buddhist declared passage total mismatch');
assert.equal(buddhist.totals.characters, buddhist.books.reduce((sum, row) => sum + row.characters, 0), 'Buddhist declared character total mismatch');
assert.equal(buddhist.totals.sourceBytes, sourceBytes, 'Buddhist declared source size mismatch');
console.log(`PASS Buddhist coverage (${buddhist.books.length}) matches source hashes, intact headers, actual source anchors and declared totals`);

for (const row of dao.books) {
  const filename = `${row.slug}.json`;
  assert.ok(books.has(filename), `${filename}: reviewed coverage missing from manifest`);
  const prefix = `sources/dao-expansion/${row.repo}/`;
  const provenance = await read(catalogue(`${prefix}provenance.json`));
  const sources = new Map(await Promise.all(provenance.files.map(async (file) => [file.file, await bytes(catalogue(prefix + checkedPath(file.file)))])));
  verifyDaoEdition(row, books.get(filename), provenance, sources);
}
assert.equal(dao.newBooks, dao.books.length, 'Dao declared book total mismatch');
assert.equal(dao.newPassages, dao.books.reduce((sum, row) => sum + row.passages, 0), 'Dao declared passage total mismatch');
console.log(`PASS Dao coverage (${dao.books.length}) matches every provenance source and preserves annotated-edition labels`);

for (const baseline of established.books) {
  const book = books.get(baseline.filename);
  assert.ok(book, `${baseline.filename}: established publication missing`);
  assert.equal(book.sourceUrl, baseline.sourceUrl, `${book.slug}: established source changed`);
  const source = await bytes(catalogue(baseline.sourceFile));
  verifyHash(source, baseline.sourceSha256, baseline.sourceFile);
  if (!baseline.legacyOnly) assert.equal(sha256(JSON.stringify(book.passages.map((p) => [p.slug, p.originalText]))), baseline.publishedPassagesSha256, `${book.slug}: established paragraph identities/text changed`);
  if (baseline.kind === 'literary') {
    const upstream = JSON.parse(source);
    assert.equal(upstream.url, book.sourceUrl, `${book.slug}: upstream reference mismatch`);
    const chapters = Array.isArray(upstream.content) ? upstream.content : [upstream.content];
    assert.deepEqual(book.passages.map((p) => p.originalText), chapters.flatMap((chapter) => chapter.paragraphs), `${book.slug}: original source paragraphs changed`);
  }
  if (baseline.kind === 'cbeta') {
    assert.ok(book.sourceHeader && source.toString('utf8').includes(book.sourceHeader), `${book.slug}: established header changed`);
    assert.match(book.sourceHeader, /non-commercial/);
  }
}

const laozi = books.get('dao-de-jing-selected.json');
const provenance = await read('data/catalog/sources/dao-expansion/laozi-provenance.json');
const previous = await read('data/catalog/sources/dao-de-jing-ch01-ch32-upstream.json');
assert.equal(provenance.slug, laozi.slug); assert.equal(provenance.repo, sourceIdentity(laozi.sourceUrl).id);
distinct(provenance.files.map((file) => file.file), 'Laozi chapter source files');
assert.equal(laozi.passages.length, provenance.files.length, 'Laozi chapter sources must cover every published chapter');
assert.equal(laozi.isExcerpt, false, 'Established complete Laozi edition must not become an excerpt');
const extractTls = (text) => text.split(/\r?\n/).filter((line) => !line.startsWith('#') && !line.startsWith('**') && !line.startsWith('<pb:')).join('').replaceAll('¶', '').trim();
for (const [index, file] of provenance.files.entries()) {
  const source = await bytes(catalogue(`sources/dao-expansion/${provenance.repo}/${checkedPath(file.file)}`));
  verifyHash(source, file.sha256, file.file);
  assert.equal(sourceIdentity(file.sourceUrl).id, provenance.repo);
  const original = extractTls(source.toString('utf8'));
  assert.equal(laozi.passages[index].slug, `chapter-${String(index + 1).padStart(2, '0')}`, 'Laozi published chapter key changed');
  assert.equal(laozi.passages[index].originalText, original, 'Laozi chapter differs from source');
  assert.equal(Array.from(original).length, file.characters, 'Laozi provenance character count mismatch');
}
for (const [index, file] of previous.entries()) assert.equal(laozi.passages[index].originalText, extractTls(file.content), 'Original Laozi chapter baseline changed');
assert.equal(sha256(JSON.stringify(laozi.passages.slice(0, previous.length))), provenance.preservedFirst32Sha256, 'Established Laozi paragraph records changed');
console.log(`PASS established editions retain exact source evidence; all ${provenance.files.length} Laozi chapter sources and original ${previous.length} published chapters remain verified`);

const activeDaoRepositories = new Set([...books.values()].map((book) => sourceIdentity(book.sourceUrl)).filter((source) => source.kind === 'dao').map((source) => source.id));
for (const entry of daoInventory.items) if (!['collected-reviewed', 'existing-reviewed-body-only'].includes(entry.status)) assert.ok(!activeDaoRepositories.has(entry.repo), `${entry.repo}: unreviewed source is public`);
console.log(`PASS inventories are internally consistent (${buddhistInventory.count} Buddhist / ${daoInventory.count} Dao source entries); metadata totals are not publication totals`);
runCorpusNegativeChecks();
console.log(`Corpus inventory: ${books.size} published editions / ${[...books.values()].reduce((sum, book) => sum + book.passages.length, 0)} passages verified.`);
