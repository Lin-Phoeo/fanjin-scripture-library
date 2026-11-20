import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { apiRequest, createAdminScripture, getAdminScripture, getAdminScriptures, getCategories, updateAdminScripture, type AdminScriptureInput, type CategoryItem, type ScripturePassage, type ScriptureSummary } from '../lib/api';

type DraftPassage = ScripturePassage & { key: string; existing: boolean };
type EditorForm = Omit<AdminScriptureInput, 'passages'> & { passages: DraftPassage[] };
const slugPattern = '[a-z0-9]+(-{1,2}[a-z0-9]+)*';
const publication: Record<string, string> = { published: '已发布', pending_review: '待审核', changes_requested: '待修改 / 已下架' };
const newPassage = (): DraftPassage => ({ key: crypto.randomUUID(), existing: false, slug: '', title: '', originalText: '', plainText: '', commentaryText: '', audioUrl: '' });
const emptyForm = (categorySlug = ''): EditorForm => ({ title: '', slug: '', categorySlug, dynasty: '', translator: '', role: '', overlay: '', summary: '', passages: [newPassage()] });
function safeAudio(value: string) { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } }

export default function AdminEditorPage() {
  const { token } = useAppState();
  const [params, setParams] = useSearchParams();
  const requestedSlug = params.get('slug') || '';
  const [scriptures, setScriptures] = useState<ScriptureSummary[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [form, setForm] = useState<EditorForm>(() => emptyForm());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const request = useRef(0);
  const editing = Boolean(selectedSlug);
  const disabled = busy || loading || detailLoading;
  const status = scriptures.find((item) => item.slug === selectedSlug)?.publishStatus;

  const loadOptions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [nextScriptures, nextCategories] = await Promise.all([getAdminScriptures(token), getCategories()]);
      setScriptures(nextScriptures); setCategories(nextCategories);
      setForm((current) => ({ ...current, categorySlug: current.categorySlug || nextCategories[0]?.slug || '' }));
    } catch (error) { setError(error instanceof Error ? error.message : '经典列表加载失败。'); }
    finally { setLoading(false); }
  }, [token]);
  const loadScripture = useCallback(async (slug: string) => {
    if (!token || !slug) return;
    const version = ++request.current;
    setDetailLoading(true); setError('');
    try {
      const detail = await getAdminScripture(slug, token);
      if (version !== request.current) return;
      setSelectedSlug(slug);
      setForm({ ...detail, passages: detail.passages.map((passage) => ({ ...passage, key: crypto.randomUUID(), existing: true })) });
      setDirty(false);
    } catch (error) {
      if (version === request.current) { setSelectedSlug(''); setForm(emptyForm()); setError(error instanceof Error ? error.message : '经典加载失败。'); }
    } finally { if (version === request.current) setDetailLoading(false); }
  }, [token]);
  useEffect(() => { void loadOptions(); }, [loadOptions]);
  useEffect(() => { if (requestedSlug) void loadScripture(requestedSlug); return () => { request.current++; }; }, [requestedSlug, loadScripture]);

  function updateField<K extends keyof EditorForm>(key: K, value: EditorForm[K]) { setForm((current) => ({ ...current, [key]: value })); setDirty(true); }
  function updatePassage(index: number, patch: Partial<DraftPassage>) {
    setForm((current) => ({ ...current, passages: current.passages.map((item, i) => i === index ? { ...item, ...patch } : item) })); setDirty(true);
  }
  function reset() {
    if (dirty && !window.confirm('放弃尚未保存的修改，开始新建经典？')) return;
    request.current++; setParams({}); setSelectedSlug(''); setForm(emptyForm(categories[0]?.slug)); setDirty(false); setError(''); setMessage(''); setDetailLoading(false);
  }
  function move(index: number, direction: number) {
    setForm((current) => { const passages = [...current.passages]; const target = index + direction; if (target < 0 || target >= passages.length) return current; [passages[index], passages[target]] = [passages[target], passages[index]]; return { ...current, passages }; }); setDirty(true);
  }
  function remove(index: number) {
    if (form.passages.length === 1) { setError('至少保留一个段落。'); return; }
    if (!window.confirm('确认移除此段落？已有关联摘录或阅读记录的段落将由服务端保护。')) return;
    updateField('passages', form.passages.filter((_, i) => i !== index));
  }
  async function importJson(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('JSON 文件不得超过 2 MB。'); return; }
    if (dirty && !window.confirm('导入将替换当前未保存表单，是否继续？')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const input: unknown = JSON.parse(await file.text());
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('JSON 须为单部经典对象。');
      const data = input as Record<string, unknown>;
      const text = (record: Record<string, unknown>, key: string, required = false) => {
        const value = record[key]; if ((value === undefined || value === null) && !required) return '';
        if (typeof value !== 'string' || (required && !value.trim())) throw new Error('字段 ' + key + ' 须为有效文本。');
        return value;
      };
      if (!Array.isArray(data.passages) || !data.passages.length || data.passages.length > 2000) throw new Error('须包含 1–2000 个段落。');
      const passages = data.passages.map((value: unknown): DraftPassage => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('段落格式不正确。');
        const p = value as Record<string, unknown>;
        return { ...newPassage(), contentTc:text(p,'contentTc')||null,contentSc:text(p,'contentSc')||null,classicalCommentary:text(p,'classicalCommentary')||null,commentarySource:text(p,'commentarySource')||null,modernGuide:text(p,'modernGuide')||null, slug: text(p, 'slug', true), title: text(p, 'title', true), originalText: text(p, 'originalText', true), plainText: text(p, 'plainText'), commentaryText: text(p, 'commentaryText'), audioUrl: text(p, 'audioUrl') };
      });
      const imported: EditorForm = { sourceHeader:text(data,'sourceHeader'),school:text(data,'school'),tags:Array.isArray(data.tags)?data.tags.filter((tag):tag is string=>typeof tag==='string'):[],edition:text(data,'edition'),sourceName:text(data,'sourceName'),sourceUrl:text(data,'sourceUrl'),license:text(data,'license'),licenseUrl:text(data,'licenseUrl'),isExcerpt:data.isExcerpt!==false,sourceVerified:data.sourceVerified===true, slug: text(data, 'slug', true), title: text(data, 'title', true), categorySlug: text(data, 'categorySlug', true), dynasty: text(data, 'dynasty', true), translator: text(data, 'translator', true), role: text(data, 'role'), overlay: text(data, 'overlay'), summary: text(data, 'summary'), passages };
      if (!categories.some((item) => item.slug === imported.categorySlug)) throw new Error('导入分类不存在，请使用本站分类标识。');
      request.current++; setParams({}); setSelectedSlug(''); setForm(imported); setDirty(true);
      setMessage('已载入 ' + passages.length + ' 个段落，请核对后提交审核。导入不会自动发布。');
    } catch (error) { setError(error instanceof Error ? error.message : 'JSON 导入失败。'); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!token || disabled) return;
    setError(''); setMessage('');
    const slugs = new Set(form.passages.map((passage) => passage.slug.trim()));
    if (slugs.size !== form.passages.length) { setError('段落标识不能重复。'); return; }
    if (form.passages.some((passage) => passage.audioUrl.trim() && !safeAudio(passage.audioUrl.trim()))) { setError('音频须为不含账号密码的 HTTPS 地址。'); return; }
    const payload: AdminScriptureInput = { ...form, passages: form.passages.map(({ key: _key, existing: _existing, ...passage }) => passage) };
    setBusy(true);
    try {
      const result = editing ? await updateAdminScripture(selectedSlug, payload, token) : await createAdminScripture(payload, token);
      setDirty(false); await loadOptions();
      if (requestedSlug === result.slug) await loadScripture(result.slug); else setParams({ slug: result.slug });
      setMessage('内容已保存并进入审核队列。审核通过后才会公开。');
    } catch (error) { setError(error instanceof Error ? error.message : '保存失败。'); }
    finally { setBusy(false); }
  }
  async function unpublish() {
    if (!token || !selectedSlug || disabled || !window.confirm('确认下架此经典？下架后读者将暂时无法打开，现有摘录仍会保留。')) return;
    setBusy(true); setError(''); setMessage('');
    try { await apiRequest('/api/admin/scriptures/' + encodeURIComponent(selectedSlug) + '/unpublish', { method: 'POST' }, token); await loadOptions(); setMessage('经典已下架。修改后可重新送审。'); }
    catch (error) { setError(error instanceof Error ? error.message : '下架失败。'); }
    finally { setBusy(false); }
  }

  return <section className="admin-section"><div className="admin-panel">
    <div className="results-header"><h2>古籍录入与校订</h2><div className="row-actions">
      <button type="button" disabled={disabled} onClick={reset}>新建经典</button>
      <button type="submit" form="scripture-editor" disabled={disabled}>{busy ? '正在保存…' : editing ? '更新并送审' : '创建并送审'}</button>
      {editing && <Link className="header-button" to={'/reader/' + encodeURIComponent(selectedSlug) + '?draft=1'}>预览已保存内容</Link>}
      {status === 'published' && <button type="button" disabled={disabled} onClick={() => void unpublish()}>下架经典</button>}
    </div></div>
    {error && <p className="feedback-text" role="alert">{error} <button type="button" disabled={disabled} onClick={() => { setError(''); void loadOptions(); if (requestedSlug) void loadScripture(requestedSlug); }}>重新加载</button></p>}
    {message && <p className="feedback-text" role="status">{message}</p>}
    {(loading || detailLoading) && <p role="status">正在加载经典资料…</p>}
    <div className="editor-toolbar"><label>选择经典 <select value={selectedSlug} disabled={disabled} onChange={(event) => {
      const slug = event.target.value;
      if (!slug) { reset(); return; }
      if (dirty && !window.confirm('放弃尚未保存的修改，切换经典？')) return;
      setMessage(''); setParams({ slug });
    }}><option value="">新建经典</option>{scriptures.map((item) => <option key={item.slug} value={item.slug}>{item.title} · {publication[item.publishStatus] ?? item.publishStatus}</option>)}</select></label>
      <label>导入经典 JSON <input type="file" accept=".json,application/json" disabled={disabled} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void importJson(file); }} /></label>
    </div>
    <p>佛道典籍与诸子著作均可录入。白话和注释应标明出处；无可靠来源时可留空。</p>
    <form id="scripture-editor" onSubmit={(event) => void save(event)}>
      <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="form-grid">
          <label>经典名称<input required maxLength={200} value={form.title} onChange={(event) => updateField('title', event.target.value)} /></label>
          <label>经典标识<input required pattern={slugPattern} maxLength={100} readOnly={editing} value={form.slug} onChange={(event) => updateField('slug', event.target.value)} placeholder="例如 dao-de-jing" /></label>
          <label>分类<select required value={form.categorySlug} onChange={(event) => updateField('categorySlug', event.target.value)}><option value="" disabled>请选择分类</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
          <label>时代<input required maxLength={100} value={form.dynasty} onChange={(event) => updateField('dynasty', event.target.value)} /></label>
          <label>作者 / 译者 / 集录<input required maxLength={200} value={form.translator} onChange={(event) => updateField('translator', event.target.value)} /></label>
          <label>阅读提示<input maxLength={500} value={form.role} onChange={(event) => updateField('role', event.target.value)} /></label>
          <label>发布状态<input readOnly value={editing ? publication[status || ''] ?? '待审核' : '尚未创建'} /></label>
          <label className="full-span">版本与对照说明<input maxLength={2000} value={form.overlay} onChange={(event) => updateField('overlay', event.target.value)} /></label>
          <label>学派<select value={form.school??''} onChange={e=>updateField('school',e.target.value)}><option value="">请选择</option>{['佛家','道家','儒家','诸子'].map(name=><option key={name}>{name}</option>)}</select></label>
          <label>标签（逗号分隔）<input value={(form.tags??[]).join('，')} onChange={e=>updateField('tags',e.target.value.split(/[,，]/).map(v=>v.trim()).filter(Boolean))}/></label>
          <label>底本版本<input value={form.edition??''} onChange={e=>updateField('edition',e.target.value)} placeholder="版本、卷次与整理说明"/></label>
          <label>来源名称<input value={form.sourceName??''} onChange={e=>updateField('sourceName',e.target.value)}/></label>
          <label>原文来源链接<input type="url" value={form.sourceUrl??''} onChange={e=>updateField('sourceUrl',e.target.value)}/></label>
          <label>许可条款链接<input type="url" value={form.licenseUrl??''} onChange={e=>updateField('licenseUrl',e.target.value)}/></label>
          <label className="full-span">许可与署名说明<textarea value={form.license??''} onChange={e=>updateField('license',e.target.value)}/></label>
          <label>收录范围<select value={form.isExcerpt===false?'full':'excerpt'} onChange={e=>updateField('isExcerpt',e.target.value==='excerpt')}><option value="excerpt">节选</option><option value="full">全文</option></select></label>
          <label><input type="checkbox" checked={form.sourceVerified??false} onChange={e=>updateField('sourceVerified',e.target.checked)}/> 已人工核对底本与许可</label>
          <label className="full-span">简介<textarea rows={3} maxLength={10000} value={form.summary} onChange={(event) => updateField('summary', event.target.value)} /></label>
        </div>
        <div className="admin-subsection"><div className="results-header"><h3>段落内容 · {form.passages.length} 段</h3><button type="button" disabled={form.passages.length >= 2000} onClick={() => updateField('passages', [...form.passages, newPassage()])}>添加段落</button></div>
          {form.passages.map((passage, index) => <div key={passage.key} className="editor-passage-card">
            <div className="results-header"><h3>段落 {index + 1}</h3><div className="row-actions"><button type="button" disabled={index === 0} onClick={() => move(index, -1)}>上移</button><button type="button" disabled={index === form.passages.length - 1} onClick={() => move(index, 1)}>下移</button><button type="button" disabled={form.passages.length === 1} onClick={() => remove(index)}>移除段落</button></div></div>
            <div className="form-grid">
              <label>段落标题<input required maxLength={200} value={passage.title} onChange={(event) => updatePassage(index, { title: event.target.value })} /></label>
              <label>段落标识<input required pattern={slugPattern} maxLength={100} readOnly={passage.existing} value={passage.slug} onChange={(event) => updatePassage(index, { slug: event.target.value })} placeholder="例如 section-01" /></label>
              <label className="full-span">原文<textarea required rows={4} maxLength={100000} value={passage.originalText} onChange={(event) => updatePassage(index, { originalText: event.target.value })} /></label>
              <label className="full-span">繁体底本（可选，未经核对请留空）<textarea rows={3} value={passage.contentTc??''} onChange={e=>updatePassage(index,{contentTc:e.target.value||null})}/></label>
              <label className="full-span">校对简体（可选）<textarea rows={3} value={passage.contentSc??''} onChange={e=>updatePassage(index,{contentSc:e.target.value||null})}/></label>
              <label className="full-span">现代编校导读（可选）<textarea rows={3} value={passage.modernGuide??''} onChange={e=>updatePassage(index,{modernGuide:e.target.value||null})}/></label>
              <label className="full-span">古注原文（可选）<textarea rows={3} value={passage.classicalCommentary??''} onChange={e=>updatePassage(index,{classicalCommentary:e.target.value||null})}/></label>
              <label className="full-span">古注作者、书名、卷章出处<input required={Boolean(passage.classicalCommentary)} value={passage.commentarySource??''} onChange={e=>updatePassage(index,{commentarySource:e.target.value||null})}/></label>
              <label className="full-span">诵读音频地址（HTTPS，可选）<input type="url" maxLength={2048} value={passage.audioUrl} onChange={(event) => updatePassage(index, { audioUrl: event.target.value })} placeholder="https://…" /></label>
              {safeAudio(passage.audioUrl) && <div className="full-span"><audio controls preload="none" src={passage.audioUrl} aria-label={passage.title + '音频预览'} onError={() => setError('音频无法播放，请检查资源地址、格式与访问权限。')} /></div>}
            </div>
          </div>)}
        </div>
        <div className="card-actions"><button className="primary-link button-reset" type="submit">{editing ? '更新并送审' : '创建并送审'}</button>{dirty && <span>有未保存修改</span>}</div>
      </fieldset>
    </form>
  </div></section>;
}
