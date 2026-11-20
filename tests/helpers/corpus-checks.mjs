import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const characters = (book) => book.passages.reduce((sum, passage) => sum + Array.from(passage.originalText).length, 0);
export const normalizePath = (path) => path.replaceAll('\\', '/');

export function distinct(values, label) {
  assert.ok(Array.isArray(values), `${label}: expected an array`);
  assert.ok(values.every((value) => typeof value === 'string' && value.length > 0), `${label}: missing identity`);
  assert.equal(new Set(values).size, values.length, `${label}: duplicate identity`);
}
export function checkedPath(path, label = 'source path') {
  assert.equal(typeof path, 'string', `${label}: missing path`);
  const normalized = normalizePath(path);
  assert.ok(normalized && !normalized.startsWith('/') && !normalized.includes(':') && normalized.split('/').every((part) => part && part !== '.' && part !== '..'), `${label}: unsafe relative path`);
  return normalized;
}
export function verifyHash(bytes, expected, label) {
  assert.match(expected || '', /^[0-9a-f]{64}$/, `${label}: missing or invalid SHA-256`);
  assert.equal(sha256(bytes), expected, `${label}: source SHA-256 mismatch`);
}
export function verifyInventory(inventory, key, label) {
  assert.ok(Array.isArray(inventory.items), `${label}: missing items`);
  distinct(inventory.items.map((item) => item[key]), label);
  assert.equal(inventory.count, inventory.items.length, `${label}: declared count differs from items`);
  if ('publicCatalogMetadataCount' in inventory) assert.equal(inventory.publicCatalogMetadataCount, inventory.items.length, `${label}: metadata count differs from items`);
  const statuses = new Set(['collected-reviewed', 'existing-reviewed-body-only', 'not-collected', 'rights-pending', 'awaiting-source']);
  for (const item of inventory.items) assert.ok(statuses.has(item.status), `${label}/${item[key]}: unknown review status`);
  return new Map(inventory.items.map((item) => [item[key], item]));
}
export function sourceIdentity(url) {
  const value = new URL(url);
  assert.equal(value.hostname, 'github.com', 'Published source must have an explicit recognized evidence route');
  assert.ok(!value.username && !value.password && value.protocol === 'https:', 'Published source URL must be public HTTPS');
  const segments = decodeURIComponent(value.pathname).split('/').filter(Boolean);
  if (['cbeta-git', 'cbeta-org'].includes(segments[0]) && segments[1] === 'xml-p5') {
    const match = segments.at(-1)?.match(/^(T\d{2}n\d+[a-z]?)\.xml$/i);
    assert.ok(match, 'CBETA source must identify its XML file');
    return { kind: 'cbeta', id: match[1] };
  }
  if (segments[0] === 'kanripo' && /^KR\d[a-z]\d{4}$/.test(segments[1] || '')) return { kind: 'dao', id: segments[1] };
  if (segments[0] === 'chinese-poetry' && segments[1] === 'chinese-poetry') return { kind: 'literary', id: decodeURIComponent(value.pathname) };
  throw new Error('Published source has no registered provenance route: ' + url);
}
export function verifyPublication(book, evidence, inventories) {
  assert.equal(book.sourceVerified, true, `${book.slug}: source is not verified`);
  for (const field of ['edition', 'sourceName', 'sourceUrl', 'license', 'licenseUrl']) assert.ok(typeof book[field] === 'string' && book[field].trim(), `${book.slug}: missing ${field}`);
  const identity = sourceIdentity(book.sourceUrl);
  if (identity.kind !== 'literary') {
    const entry = inventories[identity.kind].get(identity.id);
    assert.ok(entry, `${book.slug}: source is absent from inventory`);
    assert.ok(['collected-reviewed', 'existing-reviewed-body-only'].includes(entry.status), `${book.slug}: source ${identity.id} is ${entry.status}, not reviewed for publication`);
    if (entry.slug) assert.equal(book.slug, entry.slug, `${book.slug}: source inventory slug mismatch`);
  }
  assert.ok(evidence, `${book.slug}: manifest entry has no coverage/provenance evidence`);
  assert.equal(identity.kind, evidence.kind, `${book.slug}: evidence source family mismatch`);
  assert.equal(identity.id, evidence.id, `${book.slug}: evidence source identity mismatch`);
  return identity;
}
export function verifyPassages(book, requireAnchors = false) {
  assert.ok(Array.isArray(book.passages) && book.passages.length, `${book.slug}: missing passages`);
  distinct(book.passages.map((p) => p.slug), `${book.slug}/paragraph slugs`);
  if (requireAnchors) distinct(book.passages.map((p) => p.sourceAnchor), `${book.slug}/source anchors`);
  for (const p of book.passages) {
    assert.match(p.slug, /^[a-z0-9]+(?:-{1,2}[a-z0-9]+)*$/, `${book.slug}: invalid paragraph slug`);
    assert.ok(typeof p.originalText === 'string' && p.originalText.trim(), `${book.slug}/${p.slug}: missing original text`);
    assert.ok(!p.originalText.includes('未解析缺字') && !p.originalText.includes('<pb:') && !p.originalText.includes('#+PROPERTY'), `${book.slug}/${p.slug}: unresolved source markup`);
  }
}
export function verifyBuddhistEdition(row, book, source) {
  assert.equal(book.slug, row.slug, 'CBETA coverage slug mismatch');
  assert.equal(row.filename, `${book.slug}.json`, `${book.slug}: coverage filename mismatch`);
  assert.equal(book.sourceUrl, row.source, `${book.slug}: coverage source URL mismatch`);
  assert.equal(checkedPath(book.sourceFile), `sources/${row.id}.xml`, `${book.slug}: source file does not match edition`);
  assert.equal(checkedPath(row.sourceFile), `data/catalog/${book.sourceFile}`, `${book.slug}: coverage source file mismatch`);
  verifyHash(source, row.sha256, row.id);
  assert.equal(book.sourceSha256, row.sha256, `${book.slug}: book source hash missing or differs from coverage`);
  assert.ok(typeof book.sourceHeader === 'string' && book.sourceHeader.length > 0, `${book.slug}: missing source header`);
  const xml = source.toString('utf8');
  assert.ok(xml.includes(book.sourceHeader), `${book.slug}: original publication header changed`);
  assert.match(book.sourceHeader, /non-commercial/, `${book.slug}: expected original publication license`);
  verifyPassages(book, true);
  const anchors = new Set([...xml.matchAll(/xml:id="([^"]+)"/g)].map((match) => match[1]));
  for (const passage of book.passages) assert.ok(anchors.has(passage.sourceAnchor), `${book.slug}: source anchor absent from XML`);
  assert.equal(book.passages.length, row.passages, `${book.slug}: coverage passage count mismatch`);
  assert.equal(characters(book), row.characters, `${book.slug}: coverage character count mismatch`);
  if ('sourceBytes' in row) assert.equal(source.length, row.sourceBytes, `${book.slug}: source size mismatch`);
}
export function verifyDaoEdition(row, book, provenance, sources) {
  assert.equal(provenance.repo, row.repo, `${book.slug}: provenance repo mismatch`);
  assert.equal(provenance.slug, book.slug, `${book.slug}: provenance slug mismatch`);
  assert.equal(book.slug, row.slug, 'Dao coverage slug mismatch');
  assert.ok(Array.isArray(provenance.files) && provenance.files.length, `${book.slug}: missing provenance files`);
  distinct(provenance.files.map((file) => file.file), `${book.slug}/source files`);
  assert.equal(provenance.files.length, row.sourceUnits, `${book.slug}: source inventory incomplete`);
  assert.equal(provenance.chapters.length, row.chapters, `${book.slug}: source chapter count mismatch`);
  assert.ok(provenance.scope && provenance.transform, `${book.slug}: missing source scope/transform`);
  for (const file of provenance.files) {
    const filename = checkedPath(file.file);
    assert.ok(!filename.includes('/'), `${book.slug}: expected source basename`);
    const source = sources.get(filename);
    assert.ok(source, `${book.slug}: missing source ${filename}`);
    assert.equal(sourceIdentity(file.url).id, row.repo, `${book.slug}: source URL repo mismatch`);
    verifyHash(source, file.sha256, `${row.repo}/${filename}`);
    assert.equal(source.length, file.bytes, `${row.repo}/${filename}: source size mismatch`);
  }
  verifyPassages(book);
  assert.equal(book.passages.length, row.passages, `${book.slug}: passage count mismatch`);
  assert.equal(characters(book), row.characters, `${book.slug}: character count mismatch`);
  if (row.containsNotes) assert.ok(book.tags.includes('原文含注'), `${book.slug}: annotated edition is not labeled`);
}
