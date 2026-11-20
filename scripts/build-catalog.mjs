import { readFile, writeFile, mkdir, copyFile, readdir, unlink } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Converter } from 'opencc-js';
import { validateScripture } from '../server/validation.ts';

const categories = [
  { id: 1, slug: 'banruo', name: '般若部', description: '般若经典与原典阅读', sortOrder: 1 },
  { id: 2, slug: 'zushi', name: '祖师语录', description: '祖师著述与语录', sortOrder: 2 },
  { id: 3, slug: 'fahua', name: '法华部', description: '法华系经典', sortOrder: 3 },
  { id: 4, slug: 'dao', name: '道家经典', description: '道家原典与个人研习', sortOrder: 4 },
  { id: 5, slug: 'ru', name: '儒家经典', description: '儒家原典与个人研习', sortOrder: 5 },
  { id: 6, slug: 'zhuzi', name: '诸子百家', description: '诸子著述与个人研习', sortOrder: 6 },
  { id: 7, slug: 'jingtu', name: '净土经典', description: '净土原典', sortOrder: 2 },
  { id: 8, slug: 'fojing', name: '佛教经典', description: '佛教经典原文', sortOrder: 3 },
  { id: 9, slug: 'ahan', name: '阿含经典', description: '阿含经藏', sortOrder: 4 },
];
const settings = { site_name: '梵烬', site_subtitle: '东方经典个人自修驿站', site_description: '公益开放阅读，以佛道经典为主，兼读诸子百家。个人记录仅保存在当前设备的浏览器中。', footer_notice: '为阅读留一方清净，为自己留一点时间。' };

function stableId(key) {
  return createHash('sha256').update(key).digest().readUInt32BE(0) || 1;
}
function catalogPath(directory, name) {
  if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9-]*\.json$/.test(name)) throw new Error('Catalog manifest filenames must be plain lowercase JSON basenames.');
  const path = resolve(directory, name);
  if (relative(directory, path).startsWith('..')) throw new Error('Catalog file escaped its source directory.');
  return path;
}
async function writeJson(path, value) {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, JSON.stringify(value) + '\n', 'utf8');
}
function makeCharacterMap(convert) {
  const result = {};
  for (const [start, end] of [[0x3400, 0x9fff], [0xf900, 0xfaff], [0x20000, 0x2fa1f]]) {
    for (let codepoint = start; codepoint <= end; codepoint++) {
      const original = String.fromCodePoint(codepoint), simplified = convert(original);
      if (original !== simplified) result[original] = simplified;
    }
  }
  return result;
}
function bloom(text) {
  const bits = new Uint8Array(4096);
  const values = Array.from(text);
  for (let i=0;i<values.length;i++) {
    for(const token of [values[i], values[i]+(values[i+1]||'')]) {
      let hash=2166136261;
      for(let j=0;j<token.length;j++) hash=Math.imul(hash^token.charCodeAt(j),16777619)>>>0;
      const bit=hash%(bits.length*8); bits[bit>>>3]|=1<<(bit&7);
    }
  }
  return Buffer.from(bits).toString('base64');
}

export async function buildCatalog({ sourceDirectory = resolve('data/catalog'), outputDirectory = resolve('public') } = {}) {
  const source = resolve(sourceDirectory), output = resolve(outputDirectory);
  const manifest = JSON.parse(await readFile(join(source, 'catalog-manifest.json'), 'utf8'));
  const toSimplified = Converter({ from: 't', to: 'cn' });
  const toTraditional = Converter({ from: 'cn', to: 'tw' });
  if (!Array.isArray(manifest.files) || !manifest.files.length || new Set(manifest.files).size !== manifest.files.length) throw new Error('Catalog manifest must contain distinct book filenames.');
  const books = [], seenSlugs = new Set(), seenIds = new Set();
  for (const filename of manifest.files) {
    const raw = JSON.parse(await readFile(catalogPath(source, filename), 'utf8'));
    const book = validateScripture(raw);
    if (!book.sourceVerified || !book.edition || !book.sourceName || !book.sourceUrl || !book.license || !book.licenseUrl) throw new Error(`${book.slug}: source and license verification is required before static publication.`);
    if (seenSlugs.has(book.slug)) throw new Error(`Duplicate catalog slug: ${book.slug}`);
    seenSlugs.add(book.slug);
    const category = categories.find((entry) => entry.slug === book.categorySlug);
    if (!category) throw new Error(`${book.slug}: category is not registered.`);
    const id = stableId(`book:${book.slug}`);
    if (seenIds.has(id)) throw new Error(`Stable ID collision: ${book.slug}`);
    seenIds.add(id);
    const passages = book.passages.map((passage, index) => {
      const passageId = stableId(`passage:${book.slug}:${passage.slug}`);
      if (seenIds.has(passageId)) throw new Error(`Stable passage ID collision: ${book.slug}/${passage.slug}`);
      seenIds.add(passageId);
      return { ...passage, id: passageId, orderIndex: index + 1,
        titleSc: toSimplified(passage.title), titleTc: toTraditional(passage.title),
        contentSc: passage.contentSc || toSimplified(passage.originalText),
        contentTc: passage.contentTc || toTraditional(passage.originalText),
        scriptVariants: { sc: passage.contentSc ? 'source' : 'converted', tc: passage.contentTc ? 'source' : 'converted' },
      };
    });
    // Keep the intact upstream publication header, including whitespace, where provided.
    const sourceHeader = typeof raw.sourceHeader === 'string' ? raw.sourceHeader : book.sourceHeader;
    let sourceFileUrl;
    if(book.slug==='heart-sutra') sourceFileUrl='content-sources/heart-sutra-T08n0251.xml';
    if (typeof raw.sourceFile === 'string' && /^sources\/[A-Za-z0-9._/-]+$/.test(raw.sourceFile) && !raw.sourceFile.split('/').includes('..')) {
      const originalPath=resolve(source,raw.sourceFile);
      const publicName=`${book.slug}-source${originalPath.endsWith('.xml')?'.xml':'.txt'}`;
      await mkdir(join(output,'content-sources'),{recursive:true});
      await copyFile(originalPath,join(output,'content-sources',publicName));
      sourceFileUrl=`content-sources/${publicName}`;
    }
    books.push({ ...book, sourceHeader, sourceHeaderUrl:sourceHeader?`content-sources/${book.slug}-publication.txt`:undefined, sourceFileUrl, id, titleSc: toSimplified(book.title), titleTc: toTraditional(book.title), categoryName: category.name, publishStatus: 'published', passageCount: passages.length, wordCount: passages.reduce((total, passage) => total + Array.from(passage.originalText).length, 0), passages });
  }
  const charMap = makeCharacterMap(toSimplified);
  const traditionalMap = makeCharacterMap(toTraditional);
  const normalize = (text) => Array.from(text.normalize('NFKC')).map((character) => charMap[character] || character).join('').toLowerCase();
  const items = books.flatMap((book) => book.passages.map((passage) => {
    const original = passage.originalText, plain = passage.modernGuide || '', commentary = passage.classicalCommentary || '';
    return {
      scriptureSlug: book.slug, scriptureTitle: book.title, categorySlug: book.categorySlug, categoryName: book.categoryName, school: book.school,
      passageSlug: passage.slug, passageTitle: passage.title, original, plain, commentary,
      normalized: { title: normalize(passage.title), original: [...new Set([original, passage.contentTc, passage.contentSc].filter(Boolean).map(normalize))].join(' '), plain: normalize(plain), commentary: normalize(commentary) },
    };
  }));
  const directory = join(output, 'content'), bookDirectory = join(directory, 'books'), searchDirectory = join(directory, 'search');
  await mkdir(bookDirectory, { recursive: true });
  await mkdir(searchDirectory, { recursive: true });
  // Remove only generated book JSON files excluded from the manifest; never recurse outside this directory.
  for (const name of await readdir(bookDirectory)) if (/^[a-z0-9][a-z0-9-]*\.json$/.test(name) && !seenSlugs.has(name.slice(0, -5))) await unlink(join(bookDirectory, name));
  const index = { version: 1, generatedAt: new Date().toISOString(), retrievedAt: manifest.retrievedAt, settings, announcements: [], categories, books: books.map(({ passages: _passages, sourceHeader: _sourceHeader, ...book }) => book) };
  await Promise.all(books.map((book) => writeJson(join(bookDirectory, `${book.slug}.json`), book)));
  await writeJson(join(directory, 'index.json'), index);
  // Split full-text data by book. The opening page downloads only metadata.
  const shards = [];
  for (const book of books) {
    const entries = items.filter(item => item.scriptureSlug === book.slug);
    const shardPath = `search/${book.slug}.json`;
    const metadata={scriptureSlug:book.slug,scriptureTitle:book.title,categorySlug:book.categorySlug,categoryName:book.categoryName,school:book.school};
    await writeJson(join(directory, shardPath), { version: 2, book:metadata, items: entries.map(entry=>({passageSlug:entry.passageSlug,passageTitle:entry.passageTitle,original:entry.original,plain:entry.plain,commentary:entry.commentary,normalized:entry.normalized})) });
    shards.push({ slug: book.slug, categorySlug: book.categorySlug, path: shardPath, passages: entries.length, bloom:bloom(normalize(book.title)+' '+entries.map(entry=>Object.values(entry.normalized).join(' ')).join(' ')), hasPlain:entries.some(entry=>entry.plain),hasCommentary:entries.some(entry=>entry.commentary) });
  }
  await writeJson(join(directory, 'search.json'), { version: 2, charMap, shards });
  await writeJson(join(directory, 'display-maps.json'), { sc: charMap, tc: traditionalMap });
  await mkdir(join(output, 'content-sources'), { recursive: true });
  await copyFile(join(source, 'COPYRIGHT.md'), join(output, 'content-notices.txt'));
  const cbetaCopyright=join(source,'licenses/cbeta-copyright-2026-11-20.txt');
  try { await copyFile(cbetaCopyright,join(output,'content-sources/cbeta-copyright.txt')); } catch(error) { if(error.code!=='ENOENT')throw error; }
  await copyFile(join(source, 'sources', 'heart-sutra-T08n0251.xml'), join(output, 'content-sources', 'heart-sutra-T08n0251.xml'));
  // Each original publication header remains available, without bloating the library index.
  for(const book of books) if(book.sourceHeader) await writeFile(join(output,'content-sources',`${book.slug}-publication.txt`),book.sourceHeader,'utf8');
  const openccRoot = resolve('node_modules/opencc-js');
  const openccNotice = await Promise.all(['LICENSE', 'THIRD_PARTY_LICENSES.md', 'LICENSES/Apache-2.0.txt'].map(async (name) => `## opencc-js ${name}\n\n${await readFile(join(openccRoot, name), 'utf8')}`));
  await writeFile(join(output, 'content-sources', 'opencc-notices.txt'), openccNotice.join('\n\n'), 'utf8');
  await writeFile(join(output, '.nojekyll'), '', 'utf8');
  return { books: books.length, passages: items.length, characterMappings: Object.keys(charMap).length, outputDirectory: output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = process.argv.find((argument) => argument.startsWith('--output='))?.slice(9);
  const source = process.argv.find((argument) => argument.startsWith('--source='))?.slice(9);
  console.log(JSON.stringify(await buildCatalog({ ...(output ? { outputDirectory: output } : {}), ...(source ? { sourceDirectory: source } : {}) })));
}
