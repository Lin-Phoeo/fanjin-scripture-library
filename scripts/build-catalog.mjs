import { readFile, writeFile, mkdir, copyFile, readdir, unlink } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Converter } from 'opencc-js/t2cn';
import { validateScripture } from '../server/validation.ts';

const categories = [
  { id: 1, slug: 'banruo', name: '般若部', description: '般若经典与原典阅读', sortOrder: 1 },
  { id: 2, slug: 'zushi', name: '祖师语录', description: '祖师著述与语录', sortOrder: 2 },
  { id: 3, slug: 'fahua', name: '法华部', description: '法华系经典', sortOrder: 3 },
  { id: 4, slug: 'dao', name: '道家经典', description: '道家原典与个人研习', sortOrder: 4 },
  { id: 5, slug: 'ru', name: '儒家经典', description: '儒家原典与个人研习', sortOrder: 5 },
  { id: 6, slug: 'zhuzi', name: '诸子百家', description: '诸子著述与个人研习', sortOrder: 6 },
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
function makeCharacterMap() {
  const convert = Converter({ from: 't', to: 'cn' });
  const result = {};
  for (const [start, end] of [[0x3400, 0x9fff], [0xf900, 0xfaff], [0x20000, 0x2fa1f]]) {
    for (let codepoint = start; codepoint <= end; codepoint++) {
      const original = String.fromCodePoint(codepoint), simplified = convert(original);
      if (original !== simplified) result[original] = simplified;
    }
  }
  return result;
}

export async function buildCatalog({ sourceDirectory = resolve('data/catalog'), outputDirectory = resolve('public') } = {}) {
  const source = resolve(sourceDirectory), output = resolve(outputDirectory);
  const manifest = JSON.parse(await readFile(join(source, 'catalog-manifest.json'), 'utf8'));
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
      return { ...passage, id: passageId, orderIndex: index + 1 };
    });
    // Keep the intact upstream publication header, including whitespace, where provided.
    const sourceHeader = typeof raw.sourceHeader === 'string' ? raw.sourceHeader : book.sourceHeader;
    books.push({ ...book, sourceHeader, id, categoryName: category.name, publishStatus: 'published', passageCount: passages.length, wordCount: passages.reduce((total, passage) => total + Array.from(passage.originalText).length, 0), passages });
  }
  const charMap = makeCharacterMap();
  const normalize = (text) => Array.from(text.normalize('NFKC')).map((character) => charMap[character] || character).join('').toLowerCase();
  const items = books.flatMap((book) => book.passages.map((passage) => {
    const original = passage.originalText, plain = passage.modernGuide || '', commentary = passage.classicalCommentary || '';
    return {
      scriptureSlug: book.slug, scriptureTitle: book.title, categorySlug: book.categorySlug, categoryName: book.categoryName, school: book.school,
      passageSlug: passage.slug, passageTitle: passage.title, original, plain, commentary,
      normalized: { title: normalize(book.title + ' ' + passage.title), original: normalize([original, passage.contentTc, passage.contentSc].filter(Boolean).join(' ')), plain: normalize(plain), commentary: normalize(commentary), summary: normalize(book.summary) },
    };
  }));
  const directory = join(output, 'content'), bookDirectory = join(directory, 'books');
  await mkdir(bookDirectory, { recursive: true });
  // Remove only generated book JSON files excluded from the manifest; never recurse outside this directory.
  for (const name of await readdir(bookDirectory)) if (/^[a-z0-9][a-z0-9-]*\.json$/.test(name) && !seenSlugs.has(name.slice(0, -5))) await unlink(join(bookDirectory, name));
  const index = { version: 1, generatedAt: new Date().toISOString(), retrievedAt: manifest.retrievedAt, settings, announcements: [], categories, books: books.map(({ passages: _passages, ...book }) => book) };
  await Promise.all(books.map((book) => writeJson(join(bookDirectory, `${book.slug}.json`), book)));
  await writeJson(join(directory, 'index.json'), index);
  await writeJson(join(directory, 'search.json'), { version: 1, charMap, items });
  await mkdir(join(output, 'content-sources'), { recursive: true });
  await copyFile(join(source, 'COPYRIGHT.md'), join(output, 'content-notices.txt'));
  await copyFile(join(source, 'sources', 'heart-sutra-T08n0251.xml'), join(output, 'content-sources', 'heart-sutra-T08n0251.xml'));
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
