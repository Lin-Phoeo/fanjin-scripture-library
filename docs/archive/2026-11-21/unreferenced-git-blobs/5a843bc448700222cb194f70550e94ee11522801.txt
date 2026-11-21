export class InputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function textField(value: unknown, name: string, max = 200, optional = false): string {
  if (optional && (value === undefined || value === null)) return '';
  if (typeof value !== 'string') throw new InputError(`${name}格式不正确。`);
  const result = value.trim();
  if ((!optional && !result) || result.length > max) throw new InputError(`${name}须为${optional ? '0' : '1'}–${max}个字符。`);
  return result;
}

export function slugField(value: unknown) {
  const slug = textField(value, '标识', 100);
  if (!/^[a-z0-9]+(?:-{1,2}[a-z0-9]+)*$/.test(slug)) throw new InputError('标识仅支持小写字母、数字和连字符。');
  return slug;
}

export function audioField(value: unknown) {
  const audio = textField(value, '音频地址', 2048, true);
  if (!audio) return audio;
  try {
    const url = new URL(audio);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new InputError('音频须为不含账号密码的 HTTPS 地址。'); }
}

export function sourceUrlField(value: unknown) {
  const text = textField(value, '来源链接', 2048, true);
  if (!text) return '';
  try { const url = new URL(text); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); return url.href; }
  catch { throw new InputError('来源链接须为有效的 HTTP(S) 地址。'); }
}

export function positiveId(value: unknown) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new InputError('记录编号不正确。');
  return number;
}

export type ScriptureInput = ReturnType<typeof validateScripture>;

export function validateScripture(body: Record<string, unknown>) {
  if (!body || typeof body !== 'object') throw new InputError('经典数据须为 JSON 对象。');
  if(!Array.isArray(body.passages) && Array.isArray(body.chapters)) {
    const schools:Record<string,string>={buddhism:'佛家',taoism:'道家',confucianism:'儒家',others:'诸子'};
    const categories:Record<string,string>={buddhism:'banruo',taoism:'dao',confucianism:'ru',others:'zhuzi'};
    const tradition=String(body.tradition??'others');
    body={...body,school:body.school??schools[tradition],categorySlug:body.categorySlug??categories[tradition],dynasty:body.dynasty??body.author_era??'待考',translator:body.translator??body.author??'佚名',summary:body.summary??body.description,
      sourceName:body.sourceName??body.source_name,sourceUrl:body.sourceUrl??body.source_url,license:body.license??body.license_info,licenseUrl:body.licenseUrl??body.license_url,isExcerpt:body.isExcerpt??body.is_excerpt,sourceVerified:body.sourceVerified??body.source_verified,
      passages:body.chapters.flatMap((chapter:unknown)=>{
        if(!chapter||typeof chapter!=='object') throw new InputError('章节格式不正确。');
        const ch=chapter as Record<string,unknown>; const key=slugField(ch.chapter_key);
        if(!Array.isArray(ch.paragraphs)) throw new InputError('章节须包含段落。');
        return ch.paragraphs.map((paragraph:unknown)=>{
          if(!paragraph||typeof paragraph!=='object') throw new InputError('段落格式不正确。');
          const p=paragraph as Record<string,unknown>;
          return {...p,slug:key+'--'+slugField(p.para_key),title:String(ch.title??key)+' · '+String(p.para_key),contentTc:p.content_tc,contentSc:p.content_sc,classicalCommentary:p.classical_commentary,commentarySource:p.commentary_source,modernGuide:p.modern_guide};
        });
      })};
  }
  if (!Array.isArray(body.passages) || !body.passages.length || body.passages.length > 2000) throw new InputError('经典须包含1–2000个段落。');
  const seen = new Set<string>();
  const passages = body.passages.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new InputError('段落格式不正确。');
    const p = value as Record<string, unknown>;
    const slug = slugField(p.slug);
    if (seen.has(slug)) throw new InputError(`段落标识重复：${slug}`);
    seen.add(slug);
    const classicalCommentary = textField(p.classicalCommentary,'古注',100000,true);
    const commentarySource = textField(p.commentarySource,'古注出处',2000,true);
    if (classicalCommentary && !commentarySource) throw new InputError('古注必须填写作者、作品与卷章出处。');
    return {slug,title:textField(p.title,'段落标题'),originalText:textField(p.originalText ?? p.contentTc ?? p.contentSc,'原文',100000),plainText:textField(p.plainText,'白话',100000,true),commentaryText:textField(p.commentaryText,'注义',100000,true),audioUrl:audioField(p.audioUrl),
      contentTc:textField(p.contentTc,'繁体底本',100000,true)||null,contentSc:textField(p.contentSc,'校对简体',100000,true)||null,
      classicalCommentary:classicalCommentary||null,commentarySource:commentarySource||null,modernGuide:textField(p.modernGuide,'现代导读',100000,true)||null};
  });
  return {
    slug:slugField(body.slug),title:textField(body.title,'经典标题'),categorySlug:slugField(body.categorySlug),
    dynasty:textField(body.dynasty,'时代',100),translator:textField(body.translator,'译者',200),
    role:textField(body.role,'修学定位',500,true),overlay:textField(body.overlay,'对照说明',2000,true),
    summary:textField(body.summary,'简介',10000,true),passages,
    school:textField(body.school,'学派',60,true),tags:Array.isArray(body.tags)?[...new Set(body.tags.map(tag=>textField(tag,'标签',40)))].slice(0,20):[],
    edition:textField(body.edition,'底本版本',500,true),sourceName:textField(body.sourceName,'来源名称',200,true),sourceUrl:sourceUrlField(body.sourceUrl),
    license:textField(body.license,'许可说明',2000,true),licenseUrl:sourceUrlField(body.licenseUrl),sourceHeader:textField(body.sourceHeader,'原始出版头',100000,true),isExcerpt:body.isExcerpt!==false,sourceVerified:body.sourceVerified===true,
  };
}
