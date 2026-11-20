import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const read = async path => JSON.parse(await readFile(resolve(path),'utf8'));
const manifest=await read('data/catalog/catalog-manifest.json');
const buddhist=await read('data/catalog/buddhist-coverage.json');
assert.equal(buddhist.files.length,36);
for(const name of buddhist.files){
  assert.ok(manifest.files.includes(name));
  const book=await read('data/catalog/'+name);
  const source=await readFile(resolve('data/catalog',book.sourceFile));
  assert.equal(createHash('sha256').update(source).digest('hex'),book.sourceSha256);
  const xml=source.toString('utf8');
  assert.ok(xml.includes(book.sourceHeader));
  assert.match(book.sourceHeader,/non-commercial/);
  assert.ok(book.passages.every(p=>p.sourceAnchor&&p.originalText&&!p.originalText.includes('未解析缺字')));
  assert.equal(new Set(book.passages.map(p=>p.slug)).size,book.passages.length);
}
console.log('PASS 36 Buddhist editions retain exact source hashes, headers and unique source anchors');
const dao=await read('data/catalog/sources/dao-expansion/expansion-report.json');
assert.equal(dao.books.length,25);
for(const row of dao.books){
  assert.ok(manifest.files.includes(row.slug+'.json'));
  const book=await read('data/catalog/'+row.slug+'.json');
  const provenance=await read(`data/catalog/sources/dao-expansion/${row.repo}/provenance.json`);
  assert.equal(book.passages.length,row.passages);
  assert.ok(book.passages.every(p=>p.originalText&&!p.originalText.includes('<pb:')&&!p.originalText.includes('#+PROPERTY')));
  for(const file of provenance.files){
    const bytes=await readFile(resolve('data/catalog/sources/dao-expansion',row.repo,file.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
  }
  if(row.containsNotes)assert.ok(book.tags.includes('原文含注'));
}
console.log('PASS 25 Daoist editions have verified source files and clearly labeled annotated versions');
const laozi=await read('data/catalog/dao-de-jing-selected.json');
const previous=await read('data/catalog/sources/dao-de-jing-ch01-ch32-upstream.json');
assert.equal(laozi.passages.length,81);assert.equal(laozi.isExcerpt,false);
for(let i=0;i<32;i++){
  const original=previous[i].content.split(/\r?\n/).filter(line=>!line.startsWith('#')&&!line.startsWith('**')&&!line.startsWith('<pb:')).join('').replaceAll('¶','').trim();
  assert.equal(laozi.passages[i].originalText,original);
}
console.log('PASS the full 81-chapter Laozi preserves the original first 32 chapters');
const inventory=await read('data/catalog/sources/dao-expansion/inventory.json');
assert.equal(inventory.count,1660);assert.equal(new Set(inventory.items.map(row=>row.repo)).size,1660);
assert.ok(inventory.items.some(row=>row.repo==='KR5c0126'&&row.status==='rights-pending'));
assert.ok(!manifest.files.includes('zhuangzi-chant.json'));
console.log('PASS public source inventories distinguish collected, uncollected and rights-pending material');
