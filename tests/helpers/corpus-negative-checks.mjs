import assert from 'node:assert/strict';
import { checkedPath, sha256, verifyBuddhistEdition, verifyDaoEdition, verifyInventory, verifyPublication } from './corpus-checks.mjs';

export function runCorpusNegativeChecks() {
  const header = '<teiHeader>Available for non-commercial use when distributed with this header intact.</teiHeader>';
  const source = Buffer.from(`<TEI>${header}<body><p xml:id="p1">甲</p><p xml:id="p2">乙</p></body></TEI>`);
  const book = { slug: 'fixture-sutra', sourceVerified: true, edition: 'Fixture source edition', sourceName: 'CBETA', sourceUrl: 'https://github.com/cbeta-git/xml-p5/blob/master/T/T01/T01n0001.xml', license: 'Non-commercial with original header', licenseUrl: 'https://cbeta.org/copyright', sourceFile: 'sources/T01n0001.xml', sourceSha256: sha256(source), sourceHeader: header, passages: [{ slug: 'chapter--p1', sourceAnchor: 'p1', originalText: '甲' }, { slug: 'chapter--p2', sourceAnchor: 'p2', originalText: '乙' }] };
  const row = { id: 'T01n0001', slug: book.slug, filename: `${book.slug}.json`, source: book.sourceUrl, sourceFile: 'data/catalog/sources/T01n0001.xml', sha256: sha256(source), passages: 2, characters: 2 };
  const inventories = {
    cbeta: verifyInventory({ count: 2, items: [{ id: 'T01n0001', status: 'collected-reviewed' }, { id: 'T01n0002', status: 'not-collected' }] }, 'id', 'fixture Buddhist inventory'),
    dao: verifyInventory({ count: 2, items: [{ repo: 'KR5c0126', status: 'rights-pending' }, { repo: 'KR5a0001', status: 'collected-reviewed' }] }, 'repo', 'fixture Dao inventory'),
  };
  const evidence = { kind: 'cbeta', id: row.id };
  verifyPublication(book, evidence, inventories);
  verifyBuddhistEdition(row, book, source);
  let rejected = 0;
  const rejects = (label, fn, pattern) => { assert.throws(fn, pattern, label); rejected++; };

  rejects('missing source hash is rejected', () => verifyBuddhistEdition({ ...row, sha256: undefined }, book, source), /missing or invalid SHA-256/);
  rejects('modified raw source is rejected', () => verifyBuddhistEdition(row, book, Buffer.concat([source, Buffer.from('changed')])), /SHA-256 mismatch/);
  rejects('duplicate source anchors cannot hide behind different paragraph slugs', () => verifyBuddhistEdition(row, { ...book, passages: [book.passages[0], { ...book.passages[1], sourceAnchor: 'p1' }] }, source), /source anchors: duplicate/);
  rejects('nonexistent source anchor is rejected', () => verifyBuddhistEdition(row, { ...book, passages: [book.passages[0], { ...book.passages[1], sourceAnchor: 'missing' }] }, source), /anchor absent from XML/);
  rejects('changing the publication header is rejected', () => verifyBuddhistEdition(row, { ...book, sourceHeader: header.replace('non-commercial', 'unrestricted') }, source), /publication header changed/);
  rejects('new manifest edition without evidence is rejected', () => verifyPublication(book, undefined, inventories), /no coverage\/provenance evidence/);
  rejects('sourceVerified does not override not-collected inventory', () => verifyPublication({ ...book, sourceUrl: book.sourceUrl.replace('T01n0001', 'T01n0002') }, { kind: 'cbeta', id: 'T01n0002' }, inventories), /not-collected, not reviewed/);
  rejects('renaming a rights-pending book does not make it publishable', () => verifyPublication({ ...book, slug: 'renamed-safe-looking-book', sourceUrl: 'https://github.com/kanripo/KR5c0126' }, { kind: 'dao', id: 'KR5c0126' }, inventories), /rights-pending, not reviewed/);
  rejects('invented source identity cannot inherit another evidence record', () => verifyPublication(book, { kind: 'cbeta', id: 'T01n0002' }, inventories), /source identity mismatch/);
  rejects('stale inventory totals are rejected', () => verifyInventory({ count: 10, items: [{ id: 'one', status: 'not-collected' }] }, 'id', 'fixture'), /declared count/);
  rejects('duplicate inventory identities are rejected', () => verifyInventory({ count: 2, items: [{ id: 'one', status: 'not-collected' }, { id: 'one', status: 'collected-reviewed' }] }, 'id', 'fixture'), /duplicate identity/);
  rejects('unknown review state is rejected', () => verifyInventory({ count: 1, items: [{ id: 'one', status: 'maybe-approved' }] }, 'id', 'fixture'), /unknown review status/);
  rejects('source evidence cannot escape its tracked directory', () => checkedPath('sources/../../outside.xml'), /unsafe relative path/);

  const daoBook = { slug: 'fixture-dao', tags: ['原文含注'], passages: [{ slug: 'p-01', originalText: '原文與注' }] };
  const daoRow = { repo: 'KR5a0001', slug: daoBook.slug, sourceUnits: 1, chapters: 1, passages: 1, characters: 4, containsNotes: true };
  const daoBytes = Buffer.from('原文與注');
  const provenance = { repo: daoRow.repo, slug: daoBook.slug, scope: 'one source', transform: 'preserved text', chapters: ['正文'], files: [{ file: 'KR5a0001_001.txt', url: 'https://github.com/kanripo/KR5a0001/blob/master/KR5a0001_001.txt', sha256: sha256(daoBytes), bytes: daoBytes.length }] };
  const daoSources = new Map([[provenance.files[0].file, daoBytes]]);
  verifyDaoEdition(daoRow, daoBook, provenance, daoSources);
  rejects('empty provenance cannot pass through an empty hash loop', () => verifyDaoEdition(daoRow, daoBook, { ...provenance, files: [] }, daoSources), /missing provenance files/);
  rejects('annotated source cannot lose its public label', () => verifyDaoEdition(daoRow, { ...daoBook, tags: [] }, provenance, daoSources), /annotated edition is not labeled/);
  rejects('missing retained source fails verification', () => verifyDaoEdition(daoRow, daoBook, provenance, new Map()), /missing source/);
  // A legitimate new directory item changes metadata counts without changing test constants.
  verifyInventory({ count: 3, items: [...inventories.cbeta.values(), { id: 'T01n0003', status: 'not-collected' }] }, 'id', 'expanded inventory');
  console.log(`PASS ${rejected} negative source/publication fixtures fail for their intended reason; metadata expansion needs no count edits`);
}
