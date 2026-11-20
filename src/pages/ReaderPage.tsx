import { useI18n } from '../lib/i18n';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { apiRequest } from '../lib/api';
import { getBook } from '../lib/books';
import { ErrorNotice, errorMessage } from '../components/AsyncFeedback';
import { useResource } from '../lib/useResource';
import { useReadingPreferences } from '../lib/reading-preferences';
import { readingUrl, saveProgress } from '../lib/reading-progress';
import { addBookmark, deleteBookmark, getBookmarks } from '../lib/workbench-api';
import Icon from '../components/Icon';

export default function ReaderPage() {
  const { t, displayText } = useI18n();

  const params = useParams();
  const scriptureSlug = params.slug ?? params.scriptureId ?? '';
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, token, notes, saveNote, isFavorite, toggleFavorite, refreshUserData } = useAppState();
  const draft = false;
  const { data: book, loading, error, reload } = useResource(() => getBook(scriptureSlug, draft, token), [scriptureSlug, draft, token, session?.id]);
  const passageSlug = params.chapterKey ?? searchParams.get('passage') ?? book?.passages[0]?.slug ?? '';
  const passage = book?.passages.find((item) => item.slug === passageSlug);
  const [preferences, updatePreferences] = useReadingPreferences();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => { const media = window.matchMedia('(max-width: 760px)'); const update = () => setCompact(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  const [indexHidden, setIndexHidden] = useState(false);
  const [selectedTools, setSelectedTools] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [panel, setPanel] = useState<'note' | 'correction' | null>(null);
  const [note, setNote] = useState('');
  const [correction, setCorrection] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [manualCopy, setManualCopy] = useState('');
  const [correctionText, setCorrectionText] = useState('');
  const [highlight, setHighlight] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [indexTab, setIndexTab] = useState<'contents' | 'bookmarks'>('contents');
  const [indexQuery, setIndexQuery] = useState('');
  const [noteScope, setNoteScope] = useState<'passage' | 'book'>('passage');
  const [editingId, setEditingId] = useState<number | null>(null);
  const notesTrigger = useRef<HTMLElement | null>(null);
  const settingsTrigger = useRef<HTMLButtonElement | null>(null);
  const indexTrigger = useRef<HTMLButtonElement | null>(null);
  const skipScroll = useRef(false);
  const replacedPosition = useRef<string | null>(null);
  const replacementPaused = useRef(false);
  useEffect(() => {
    const clearEditing = () => {
      replacementPaused.current = true;
      setEditingId(null); setNote(''); setPanel(null); setNotesOpen(false); setSelectedTools(false); setMessage('本机记录已替换，已关闭旧笔记草稿。');
      try { Object.keys(sessionStorage).filter((key) => key.startsWith('fanjin-note-draft:')).forEach((key) => sessionStorage.removeItem(key)); } catch { /* Draft remains cleared in memory. */ }
    };
    window.addEventListener('fanjin-local-data-changing', clearEditing);
    return () => window.removeEventListener('fanjin-local-data-changing', clearEditing);
  }, []);
  const chapters = useMemo(() => {
    const groups: Array<{ key: string; title: string; indexes: number[] }> = [];
    for (const [index, item] of (book?.passages || []).entries()) {
      const key = item.slug.includes('--') ? item.slug.split('--')[0] : (book?.passages.length || 0) <= 20 ? 'whole-book' : item.slug;
      const group = groups.find((value) => value.key === key);
      if (group) group.indexes.push(index);
      else groups.push({ key, title: key === 'whole-book' ? book!.title : item.title.split(' · ')[0], indexes: [index] });
    }
    return groups;
  }, [book]);
  const bookmarks = useResource(() => token ? getBookmarks(scriptureSlug, token) : Promise.resolve([]), [token, session?.id, scriptureSlug]);
  const currentBookmark = bookmarks.data?.find((item) => item.passageSlug === passageSlug);
  const visibleNotes = notes.filter((item) => item.scriptureSlug === scriptureSlug && (noteScope === 'book' || item.passageSlug === passageSlug));
  const indexedPassages = indexQuery.trim() ? book?.passages.map((item, index) => ({ item, index })).filter(({ item, index }) => displayText(item.title).includes(indexQuery.trim()) || item.title.includes(indexQuery.trim()) || String(index + 1) === indexQuery.trim()) || [] : chapters.map((chapter) => ({ item: { ...book!.passages[chapter.indexes[0]], title: `${chapter.title}（${chapter.indexes.length}段）` }, index: chapter.indexes[0] }));
  const openNotes = () => {
    notesTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSettingsOpen(false); setContentsOpen(false); setNotesOpen(true); setPanel('note'); setEditingId(null);
  };
  const closeNotes = () => { setNotesOpen(false); notesTrigger.current?.focus(); };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (notesOpen) { setNotesOpen(false); notesTrigger.current?.focus(); }
      else if (settingsOpen) { setSettingsOpen(false); settingsTrigger.current?.focus(); }
      else if (contentsOpen) { setContentsOpen(false); indexTrigger.current?.focus(); }
      else { setSelectedTools(false); setPanel(null); }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [notesOpen, settingsOpen, contentsOpen]);
  const saveBookmark = async () => {
    if (busy || draft) return;
    setBusy(true); setMessage('');
    try {
      if (currentBookmark) await deleteBookmark(currentBookmark.id, token);
      else await addBookmark(scriptureSlug, passageSlug, token);
      bookmarks.reload();
    } catch (reason) { setMessage(errorMessage(reason)); } finally { setBusy(false); }
  };
  const requestedQuery = searchParams.get('highlight') ?? searchParams.get('q') ?? '';
  const text = passage ? preferences.script === 'original' ? passage.originalText : (preferences.script === 'tc' ? passage.contentTc : passage.contentSc) || passage.originalText : '';
  const hasPreferredScript = preferences.script === 'original' || !!(preferences.script === 'tc' ? passage?.contentTc : passage?.contentSc);
  const scriptLabel = preferences.script === 'original' ? t('底本原文') : passage?.scriptVariants?.[preferences.script] === 'converted' ? t(preferences.script === 'tc' ? '繁体转换 · 底本原文保留' : '简体转换 · 底本原文保留') : !hasPreferredScript ? t('按底本原文字形显示') : '';
  const currentIndex = book?.passages.findIndex((item) => item.slug === passageSlug) ?? -1;
  const chapterIndex = chapters.findIndex((chapter) => chapter.indexes.includes(currentIndex));
  const currentChapter = chapters[chapterIndex];
  const draftKey = `fanjin-note-draft:${session?.id ?? 'guest'}:${scriptureSlug}:${passageSlug}`;
  const startReflection = (prompt: string) => {
    const next = note.trim() ? `${note.trim()}\n\n${prompt}` : prompt;
    setNote(next); setPanel('note'); setNotesOpen(true); setSettingsOpen(false); setContentsOpen(false); setEditingId(null); setMessage('');
    try { sessionStorage.setItem(draftKey, next); } catch { /* Keep the current in-memory draft. */ }
    window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('.reader-note-editor textarea')?.focus(), 0);
  };

  useEffect(() => {
    setPanel(null); setEditingId(null); setMessage(''); setActionsOpen(false); setManualCopy(''); setContentsOpen(false);
    try {
      let pending = sessionStorage.getItem(draftKey);
      const guestKey = `fanjin-note-draft:guest:${scriptureSlug}:${passageSlug}`;
      if (session && searchParams.get('resumeNote') === '1' && !pending) {
        pending = sessionStorage.getItem(guestKey);
        if (pending) { sessionStorage.setItem(draftKey, pending); sessionStorage.removeItem(guestKey); }
      }
      setNote(pending || ''); if (pending || searchParams.get('resumeNote') === '1') { setPanel('note'); setNotesOpen(true); }
    } catch { setNote(''); }
  }, [draftKey, scriptureSlug, passageSlug, session?.id]);
  useEffect(() => {
    if (!book || !passage || draft || replacementPaused.current) return;
    const position = `${book.slug}/${passage.slug}`;
    if (replacedPosition.current === position) return;
    replacedPosition.current = null;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const value = { scriptureSlug: book.slug, scriptureTitle: book.title, passageSlug: passage.slug, passageTitle: passage.title, updatedAt: new Date().toISOString() };

      void saveProgress(value, token, controller.signal).catch((reason) => { if (!controller.signal.aborted) setMessage('阅读位置未保存：' + errorMessage(reason)); });
    }, 2000);
    const cancel = () => { replacedPosition.current = position; window.clearTimeout(timer); controller.abort(); };
    window.addEventListener('fanjin-local-data-changing', cancel);
    return () => { window.clearTimeout(timer); controller.abort(); window.removeEventListener('fanjin-local-data-changing', cancel); };
  }, [book, passage, draft, token, session?.id]);
  useEffect(() => {
    if (!passage) return;
    if (skipScroll.current) { skipScroll.current = false; return; }
    const id = `p-${passage.slug}`;
    const timer = window.setTimeout(() => {
      if (currentChapter?.indexes[0] === currentIndex && !requestedQuery) window.scrollTo({ top: 0, behavior: 'instant' });
      else document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'auto' });
      if (location.hash || requestedQuery) setHighlight(true);
    }, 50);
    const clear = window.setTimeout(() => setHighlight(false), 2050);
    return () => { window.clearTimeout(timer); window.clearTimeout(clear); setHighlight(false); };
  }, [passage?.slug, location.hash, requestedQuery]);
  const move = (index: number) => {
    const target = book?.passages[index];
    if (!book || !target) return;
    replacementPaused.current = false;
    replacedPosition.current = null;
    navigate(draft ? `/reader/${encodeURIComponent(book.slug)}?draft=1&passage=${encodeURIComponent(target.slug)}` : readingUrl(book.slug, target.slug));
  };
  const selectPassage = (index: number, manual = true) => {
    if (manual) { replacementPaused.current = false; replacedPosition.current = null; setSelectedTools(true); }
    const target = book?.passages[index];
    if (!target || target.slug === passageSlug) return;
    skipScroll.current = true;
    navigate(draft ? `/reader/${encodeURIComponent(book!.slug)}?draft=1&passage=${encodeURIComponent(target.slug)}` : readingUrl(book!.slug, target.slug), { replace: true });
  };
  useEffect(() => {
    if (!book || !currentChapter || notesOpen || contentsOpen || replacementPaused.current) return;
    let timer: number | undefined;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const visible = currentChapter.indexes.map((index) => ({ index, rect: document.getElementById(`p-${book.passages[index].slug}`)?.getBoundingClientRect() }))
          .filter((item) => item.rect && item.rect.bottom > 100 && item.rect.top < window.innerHeight - 100);
        const candidate = visible.sort((a, b) => Math.abs(a.rect!.top - 140) - Math.abs(b.rect!.top - 140))[0];
        if (!replacementPaused.current && candidate && candidate.index !== currentIndex) selectPassage(candidate.index, false);
      }, 450);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(timer); };
  }, [book, currentChapter?.key, currentIndex, notesOpen, contentsOpen, editingId, note, draft]);
  const recordNote = async () => {
    if (!book || !passage || busy) return;
    setBusy(true);
    if (editingId) {
      try {
        await apiRequest(`/api/notes/${editingId}`, { method: 'PUT', body: JSON.stringify({ note: note.trim() }) }, token);
        await refreshUserData(); setEditingId(null); setNote(''); setMessage('心得已更新，原文快照保持不变。');
      } catch (reason) { setMessage(errorMessage(reason)); } finally { setBusy(false); }
      return;
    }
    const result = await saveNote({ scriptureSlug: book.slug, passageSlug: passage.slug, note: note.trim() });
    setBusy(false); setMessage(result.ok ? '摘录已保存到你的私人书斋。' : result.message || '保存失败。');
    if (result.ok) { setNote(''); try { sessionStorage.removeItem(draftKey); } catch { /* Storage may be unavailable. */ } }
  };
  const copyCitation = async () => {
    if (!book || !passage) return;
    const citation = `${text}\n\n——《${book.title}》· ${passage.title}${book.edition ? `\n底本：${book.edition}` : ''}${book.sourceName ? `\n来源：${book.sourceName}` : ''}${book.sourceUrl ? `\n${book.sourceUrl}` : ''}\n${window.location.origin}${import.meta.env.BASE_URL}#${readingUrl(book.slug, passage.slug)}`;
    try { await navigator.clipboard.writeText(citation); setMessage('已复制原文与出处。'); }
    catch { setManualCopy(citation); setMessage('浏览器未允许自动复制，请在下方选择文本复制。'); }
  };
  const submitCorrection = async () => {
    if (!book || !passage || !correction.trim()) return;
    const report = `书名：${book.title}\n段落：${passage.title}\n稳定标识：${book.slug} / ${passage.slug}\n来源：${book.sourceName || '见版本页'}\n来源链接：${book.sourceUrl || '未登记'}\n\n原文：\n${passage.originalText}\n\n问题与建议：\n${correction.trim()}\n\n阅读链接：${window.location.origin}${import.meta.env.BASE_URL}#${readingUrl(book.slug, passage.slug)}`;
    setCorrectionText(report); setMessage('勘误文本已生成，尚未发送。你可以复制或在 GitHub 预览后自行提交。');
    try { await navigator.clipboard.writeText(report); setMessage('勘误文本已复制，尚未发送。打开 GitHub 后仍需你确认提交。'); } catch { /* The generated text remains selectable. */ }
  };
  const highlightedText = (value: string) => {
    if (!requestedQuery) return value;
    const needle = preferences.script === 'original' ? requestedQuery : displayText(requestedQuery, preferences.script);
    const index = value.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
    return index < 0 ? value : <>{value.slice(0, index)}<mark>{value.slice(index, index + needle.length)}</mark>{value.slice(index + needle.length)}</>;
  };
  if (loading) return <main className="reader-workspace"><p role="status">{t("正在载入经典…")}</p></main>;
  if (error || !book || !passage) return <main className="content-page"><h1>{t("暂时无法打开这一页")}</h1><ErrorNotice message={error || '本章节不存在或已调整，请从目录重新选择。'} retry={reload} /><Link className="quiet-link" to={book ? `/book/${encodeURIComponent(book.slug)}` : '/library'}>{t("回到目录")}</Link></main>;
  return <main className={`reader-workspace${notesOpen ? ' with-notes' : ''}${indexHidden ? ' index-hidden' : ''}`} style={{ '--reader-size': `${preferences.fontSize}px`, '--reader-leading': preferences.lineHeight } as CSSProperties}>
    <div className="reader-workspace-toolbar"><div className="reader-workspace-title"><button className="reader-index-toggle" ref={indexTrigger} type="button" aria-controls="reader-outline" aria-label={t(indexHidden ? '展开目录' : '收起目录')} aria-expanded={compact ? contentsOpen : !indexHidden} onClick={() => { setSettingsOpen(false); setNotesOpen(false); if (window.matchMedia('(max-width: 760px)').matches) setContentsOpen((value) => !value); else setIndexHidden((value) => !value); }}><Icon name="menu" size={18} /><span>{t("目录")}</span></button><Link to={`/book/${encodeURIComponent(book.slug)}`}>{displayText(book.title)}</Link></div><div className="reader-workspace-tools"><button type="button" aria-controls="reader-notes" aria-expanded={notesOpen} onClick={() => { if (notesOpen) closeNotes(); else openNotes(); }}>{t("笔记")}<span className="tool-count">{notes.filter((item) => item.scriptureSlug === scriptureSlug).length || ''}</span></button><button type="button" ref={settingsTrigger} aria-controls="reader-settings" aria-expanded={settingsOpen} onClick={() => { setNotesOpen(false); setContentsOpen(false); setSettingsOpen((value) => !value); }}>{t("阅读设置")}</button></div></div>
    {selectedTools ? <div className="reader-selected-tools" aria-label={t("所选段落操作")}><span>{t("第")}{currentIndex + 1}{t("段")}</span><button type="button" onClick={openNotes}>{t("记笔记")}</button><button type="button" onClick={() => void copyCitation()}>{t("复制")}</button><button type="button" disabled={busy} onClick={() => void saveBookmark()}>{currentBookmark ? t('取消书签') : t('加书签')}</button><button type="button" onClick={() => { setPanel('correction'); setActionsOpen(true); }}>{t("勘误")}</button><button type="button" aria-label={t("收起段落操作")} onClick={() => setSelectedTools(false)}>{t("收起")}</button></div> : null}
    {draft ? <p className="draft-notice">{t("草稿预览 · 未公开发布")}</p> : null}
    {settingsOpen ? <section id="reader-settings" className="reader-preferences" aria-label={t("阅读偏好")}><fieldset><legend>{t("纸色")}</legend>{(['paper', 'sepia', 'dark'] as const).map((theme) => <button type="button" aria-pressed={preferences.theme === theme} key={theme} onClick={() => updatePreferences({ theme })}>{t({ paper: '素宣', sepia: '古纸', dark: '松烟' }[theme])}</button>)}</fieldset><fieldset><legend>{t("字号")}</legend>{([16, 17, 18, 20, 23] as const).map((fontSize) => <button type="button" aria-pressed={preferences.fontSize === fontSize} key={fontSize} onClick={() => updatePreferences({ fontSize })}>{fontSize}</button>)}</fieldset><fieldset><legend>{t("行距")}</legend>{([1.85, 1.9, 1.95] as const).map((lineHeight) => <button type="button" aria-pressed={preferences.lineHeight === lineHeight} key={lineHeight} onClick={() => updatePreferences({ lineHeight })}>{lineHeight}</button>)}</fieldset><fieldset><legend>{t("字形")}</legend><button type="button" aria-pressed={preferences.script === 'original'} onClick={() => updatePreferences({ script: 'original' })}>{t("原文")}</button><button type="button" aria-pressed={preferences.script === 'sc'} onClick={() => updatePreferences({ script: 'sc' })}>{t("简体")}</button><button type="button" aria-pressed={preferences.script === 'tc'} onClick={() => updatePreferences({ script: 'tc' })}>{t("繁體")}</button></fieldset>{book.passages.some((item) => (item.classicalCommentary && item.commentarySource) || item.modernGuide) ? <fieldset><legend>{t("辅助阅读")}</legend>{book.passages.some((item) => item.classicalCommentary && item.commentarySource) ? <label><input type="checkbox" checked={preferences.commentary} onChange={(event) => updatePreferences({ commentary: event.target.checked })} />{t("古代注疏")}</label> : null}{book.passages.some((item) => item.modernGuide) ? <label><input type="checkbox" checked={preferences.guide} onChange={(event) => updatePreferences({ guide: event.target.checked })} />{t("现代导读")}</label> : null}</fieldset> : null}</section> : null}
    <ErrorNotice message={message} />
    <div className="reader-workspace-grid"><aside id="reader-outline" className={`reader-index-panel${contentsOpen ? ' is-open' : ''}`}><div className="reader-index-tabs" role="group" aria-label={t("阅读索引")}><button type="button" aria-pressed={indexTab === 'contents'} onClick={() => setIndexTab('contents')}>{t("目录")}</button><button type="button" aria-pressed={indexTab === 'bookmarks'} onClick={() => setIndexTab('bookmarks')}>{t("书签（")}{bookmarks.data?.length || 0}）</button></div>{indexTab === 'contents' ? <div><input className="reader-index-search" aria-label={t("查找章节")} placeholder={t("查章节名或序号")} value={indexQuery} onChange={(event) => setIndexQuery(event.target.value)} /><nav aria-label={t("篇章目录")}>{indexedPassages.map(({item, index}) => <button type="button" key={item.slug} aria-current={(indexQuery.trim() ? item.slug === passageSlug : currentChapter?.indexes.includes(index)) ? 'page' : undefined} onClick={() => move(index)}><span>{index + 1}</span>{displayText(item.title)}</button>)}</nav>{!indexedPassages.length ? <p className="reader-index-empty">{t("没有匹配章节")}</p> : null}</div> : <div className="reader-bookmarks"><ErrorNotice message={bookmarks.error} retry={bookmarks.reload} />{bookmarks.loading ? <p role="status">{t("正在载入书签…")}</p> : bookmarks.data?.length ? bookmarks.data.map((item) => <button key={item.id} type="button" onClick={() => { navigate(readingUrl(item.scriptureSlug, item.passageSlug)); setContentsOpen(false); }}>{displayText(item.passageTitle)}</button>) : <p>{t("选择一段原文，再点“加书签”。")}</p>}</div>}<div className="reader-index-footer"><p>{t("第")}{chapterIndex + 1} / {chapters.length}{t("章")}</p><Link to={`/book/${encodeURIComponent(book.slug)}`}>{t("版本与来源")}</Link><button type="button" disabled={busy} onClick={() => { setBusy(true); void toggleFavorite(book.slug).catch((reason) => setMessage(errorMessage(reason))).finally(() => setBusy(false)); }}>{isFavorite(book.slug) ? t('取消收藏这部书') : t('收藏这部书')}</button></div></aside>
    <article className="reader-document"><header className="reader-chapter-heading"><h1>{displayText(currentChapter?.title) || displayText(passage.title)}</h1><p>{displayText(book.dynasty)} · {displayText(book.translator)}{book.isExcerpt ? t(' · 节选') : ''}{scriptLabel ? ' · ' + scriptLabel : ''}</p></header>
      <div className="reader-continuous">{(currentChapter?.indexes || [currentIndex]).map((index) => {
        const item = book.passages[index];
        const original = preferences.script === 'original' ? item.originalText : (preferences.script === 'tc' ? item.contentTc : item.contentSc) || item.originalText;
        const saved = notes.some((entry) => entry.scriptureSlug === scriptureSlug && entry.passageSlug === item.slug);
        return <section className={`reader-continuous-passage${item.slug === passageSlug ? ' is-selected' : ''}`} key={item.slug}>
          <div id={`p-${item.slug}`} tabIndex={0} role="group" aria-label={t(`${item.title}，按回车选中此段`)} className={`reader-passage${item.slug === passageSlug && highlight ? ' is-located' : ''}`} onClick={() => selectPassage(index)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); selectPassage(index); } }}><span className="reader-paragraph-number">{index + 1}</span>{original.split('\n').filter(Boolean).map((paragraph, paragraphIndex) => <p className="reader-original" key={paragraphIndex}>{highlightedText(paragraph)}</p>)}</div>
          <button className={`reader-paragraph-note${saved ? ' has-note' : ''}`} type="button" aria-label={t(`${item.title}：${saved ? '查看或编辑笔记' : '记笔记'}`)} onClick={() => { selectPassage(index); openNotes(); }}><Icon name="note" size={16} /></button>
          {preferences.commentary && item.classicalCommentary && item.commentarySource ? <aside className="reader-annotation"><h2>{t("古代注疏")}</h2><p className="annotation-source">{item.commentarySource}</p>{item.classicalCommentary.split('\n').filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</aside> : null}
          {preferences.guide && item.modernGuide ? <aside className="reader-annotation modern-guide"><h2>{t("现代编校导读")}</h2>{item.modernGuide.split('\n').filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</aside> : null}
        </section>;
      })}</div>
      {manualCopy ? <label className="manual-copy-label">{t("原文与出处")}<textarea readOnly value={manualCopy} rows={6} onFocus={(event) => event.target.select()} /></label> : null}
      {panel === 'correction' && actionsOpen ? <form className="reader-correction-form" onSubmit={(event) => { event.preventDefault(); void submitCorrection(); }}><label>{t("勘误说明")}<textarea required minLength={5} maxLength={4000} rows={3} value={correction} onChange={(event) => setCorrection(event.target.value)} placeholder={t("请指出错字、建议修改与可核对的出处。")} /></label><button className="ink-button" type="submit" disabled={busy}>{t("生成勘误文本")}</button>{correctionText ? <div className="correction-export"><label>{t("可复制的勘误文本")}<textarea readOnly rows={8} value={correctionText} onFocus={(event) => event.target.select()} /></label><a className="workbench-action" href={`https://github.com/Lin-Phoeo/fanjin-scripture-library/issues/new?title=${encodeURIComponent(`勘误：${book.title} · ${passage.title}`)}&body=${encodeURIComponent(correctionText)}`} target="_blank" rel="noreferrer">{t("到 GitHub 预览勘误（需自行提交）")}</a><p>{t("不要在公开 Issue 中包含私人心得或个人信息。")}</p></div> : null}</form> : null}
      {passage.audioUrl ? <section className="reader-audio-block"><h2>{t("音频诵读")}</h2><audio key={passage.audioUrl} controls preload="none" src={passage.audioUrl} onError={() => setMessage('这段音频暂时无法播放，请稍后重试。')} /></section> : null}
      <nav className="reader-pagination" aria-label={t("篇章切换")}><button disabled={chapterIndex <= 0} type="button" onClick={() => move(chapters[chapterIndex - 1].indexes[0])}>{t("上一章")}</button><span>{t("第")}{chapterIndex + 1} / {chapters.length}{t("章 · 当前段")}{currentIndex + 1}</span><button disabled={chapterIndex >= chapters.length - 1} type="button" onClick={() => move(chapters[chapterIndex + 1].indexes[0])}>{t("下一章")}</button></nav><div className="reader-end-actions"><Link className="workbench-action" to={`/study?scripture=${encodeURIComponent(book.slug)}&passage=${encodeURIComponent(passage.slug)}`}>{t("记录今日功课")}</Link><button className="workbench-action" type="button" onClick={openNotes}>{t("留下心得")}</button></div>
    </article>
    {notesOpen ? <aside id="reader-notes" className="reader-notes-panel"><header><h2>{t("私人笔记")}</h2><button type="button" onClick={closeNotes}>{t("收起")}</button></header><div className="reader-notes-filter"><button type="button" aria-pressed={noteScope === 'passage'} onClick={() => setNoteScope('passage')}>{t("当前一节")}</button><button type="button" aria-pressed={noteScope === 'book'} onClick={() => setNoteScope('book')}>{t("本书全部")}</button></div><form className="reader-note-editor" onSubmit={(event) => { event.preventDefault(); void recordNote(); }}><p>{editingId ? t('编辑已保存的心得') : t(`摘录：${passage.title}`)}</p>{!editingId ? <blockquote>{passage.originalText}</blockquote> : null}<label>{t("我的心得")}<textarea rows={5} maxLength={10000} value={note} onChange={(event) => { setNote(event.target.value); if (!editingId) { try { sessionStorage.setItem(draftKey, event.target.value); } catch { /* Keep in memory. */ } } }} placeholder={t("可只摘录原文，也可写一点体会。")} /></label><details className="reader-prompt-options"><summary>{t("不知道写什么？")}</summary><div><button type="button" onClick={() => startReflection(t('这句话让我想到…'))}>{t("联想到的事")}</button><button type="button" onClick={() => startReflection(t('还有哪里不理解…'))}>{t("不理解的地方")}</button><button type="button" onClick={() => startReflection(t('今天想试着…'))}>{t("想尝试的事")}</button></div></details><button className="ink-button" type="submit" disabled={busy}>{busy ? t('保存中…') : editingId ? t('保存修改') : t('保存摘录')}</button>{editingId ? <button className="workbench-action" type="button" onClick={() => { setEditingId(null); setNote(''); }}>{t("取消编辑")}</button> : null}</form><ErrorNotice message={message} /><div className="reader-saved-notes">{visibleNotes.length ? visibleNotes.map((item) => <article key={item.id}><Link to={readingUrl(item.scriptureSlug, item.passageSlug)}>{displayText(item.passageTitle)}</Link><p>{item.note || t('仅摘录原文')}</p><small>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</small><button type="button" onClick={() => { setEditingId(item.id); setNote(item.note); }}>{t("编辑心得")}</button></article>) : <p>{t("这一范围还没有摘录。")}</p>}</div><Link className="workbench-action" to="/notes">{t("管理 / 导出全部摘录")}</Link></aside> : null}</div>
  </main>;
}
