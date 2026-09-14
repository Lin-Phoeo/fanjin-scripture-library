import { startTransition, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { createReadingHistory, getAdminScripture, getScripture, type ScriptureDetail } from '../lib/api';

type ReadingMode = 'plain' | 'commentary';
type ReadingPage = {
  id: string;
  passageSlug: string;
  passageTitle: string;
  originalText: string;
  plainText: string;
  commentaryText: string;
};

function ReaderPage() {
  const { scriptureId } = useParams();
  const [searchParams] = useSearchParams();
  const { isFavorite, saveNote, session, toggleFavorite, token } = useAppState();
  const previewDraft = searchParams.get('draft') === '1';
  const [mode, setMode] = useState<ReadingMode>('commentary');
  const [fontScale, setFontScale] = useState(1.32);
  const [scripture, setScripture] = useState<ScriptureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePassageId, setActivePassageId] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteStatus, setNoteStatus] = useState('');
  const [helperOpen, setHelperOpen] = useState(true);

  useEffect(() => {
    if (!scriptureId) {
      return;
    }

    void (async () => {
      setLoading(true);
      const data =
        previewDraft && token ? await getAdminScripture(scriptureId, token) : await getScripture(scriptureId);
      setScripture(data);
      setActivePassageId(searchParams.get('passage') ?? data.passages[0]?.slug ?? '');
      setNoteDraft('');
      setNoteStatus('');
      setFontScale(1.32);
      setHelperOpen(true);
      setLoading(false);
    })();
  }, [previewDraft, scriptureId, searchParams, token]);

  const activePassage = useMemo(
    () => scripture?.passages.find((passage) => passage.slug === activePassageId) ?? scripture?.passages[0],
    [activePassageId, scripture],
  );

  const currentPassageIndex = useMemo(
    () => scripture?.passages.findIndex((passage) => passage.slug === activePassage?.slug) ?? -1,
    [activePassage?.slug, scripture],
  );

  const readingPages = useMemo<ReadingPage[]>(
    () =>
      scripture?.passages.map((passage, index) => ({
        id: `page-${index + 1}`,
        passageSlug: passage.slug,
        passageTitle: passage.title,
        originalText: passage.originalText,
        plainText: passage.plainText,
        commentaryText: passage.commentaryText,
      })) ?? [],
    [scripture],
  );

  const currentPageIndex = useMemo(
    () => readingPages.findIndex((page) => page.passageSlug === activePassage?.slug),
    [activePassage?.slug, readingPages],
  );

  const activePage = currentPageIndex >= 0 ? readingPages[currentPageIndex] : readingPages[0];

  const cleanPassageTitle = (title: string) =>
    title
      .replace(/^第[一二三四五六七八九十百千0-9]+品\s*/u, '')
      .replace(/^第[一二三四五六七八九十百千0-9]+章\s*/u, '')
      .trim();

  const navLabelForPage = (page: ReadingPage) => {
    const cleaned = cleanPassageTitle(page.passageTitle);
    if (cleaned) {
      return cleaned;
    }
    const firstLine = page.originalText.split('\n').find(Boolean)?.trim() ?? '';
    return firstLine.slice(0, 12) || '正文';
  };

  const previousPassage =
    currentPassageIndex > 0 ? scripture?.passages[currentPassageIndex - 1] ?? null : null;
  const nextPassage =
    currentPassageIndex >= 0 && scripture && currentPassageIndex < scripture.passages.length - 1
      ? scripture.passages[currentPassageIndex + 1]
      : null;

  useEffect(() => {
    if (!token || !scripture || !activePassage || previewDraft) {
      return;
    }

    const timer = window.setTimeout(() => {
      void createReadingHistory(
        {
          scriptureSlug: scripture.slug,
          passageSlug: activePassage.slug,
        },
        token,
      );
    }, 400);

    return () => window.clearTimeout(timer);
  }, [activePassage, previewDraft, scripture, token]);

  const handleSaveNote = () => {
    if (!scripture || !activePassage) {
      return;
    }

    void (async () => {
      if (!noteDraft.trim()) {
        setNoteStatus('请先写下这段经文给你的体会。');
        return;
      }

      const result = await saveNote({
        scriptureSlug: scripture.slug,
        passageSlug: activePassage.slug,
        note: noteDraft.trim(),
      });

      if (!result.ok) {
        setNoteStatus(result.message ?? '保存失败');
        return;
      }

      setNoteDraft('');
      setNoteStatus('这条摘录已加入你的修学记录。');
    })();
  };

  if (loading || !scripture || !activePassage) {
    return (
      <main className="content-page">
        <section className="page-hero">
          <h1>正在载入经典内容…</h1>
        </section>
      </main>
    );
  }

  const helperText = mode === 'commentary' ? activePage?.commentaryText ?? '' : activePage?.plainText ?? '';
  const originalParagraphs = (activePage?.originalText ?? '').split('\n').filter(Boolean);
  const helperParagraphs = helperText.split('\n').filter(Boolean);

  return (
    <main className="content-page classic-page">
      <section className="classic-reader-topbar">
        <Link className="classic-topbar-link" to="/canon">
          返回目录
        </Link>
        <button
          className={mode === 'plain' ? 'classic-topbar-link is-active' : 'classic-topbar-link'}
          type="button"
          onClick={() => setMode('plain')}
        >
          白话导读
        </button>
        <button
          className={mode === 'commentary' ? 'classic-topbar-link is-active' : 'classic-topbar-link'}
          type="button"
          onClick={() => setMode('commentary')}
        >
          祖师注义
        </button>
      </section>

      <section className="classic-shell classic-reader-shell">
        <aside className="classic-sidebar">
          <div className="classic-side-panel">
            <div className="classic-side-title">{scripture.title}</div>
            <div className="classic-reader-meta compact-meta">
              <span>{scripture.dynasty}</span>
              <span>{scripture.translator}</span>
              <span>{mode === 'commentary' ? '原文 + 注义' : '原文 + 白话'}</span>
            </div>
            <div className="classic-link-list classic-page-link-list">
              {readingPages.map((page, index) => (
                <button
                  key={page.id}
                  className={page.passageSlug === activePassage.slug ? 'classic-filter-link is-current' : 'classic-filter-link'}
                  onClick={() =>
                    startTransition(() => {
                      setActivePassageId(page.passageSlug);
                    })
                  }
                  type="button"
                  title={page.passageTitle}
                >
                  {navLabelForPage(page) || `段落 ${index + 1}`}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="classic-main">
          <article className="classic-reading-article">
            <div className="classic-reading-breadcrumb">
              <Link to="/canon">经藏</Link>
              <span>/</span>
              <span>{scripture.categoryName}</span>
            </div>
            <h1>{scripture.title}</h1>
            <div className="classic-reading-meta-strip">
              <span>{scripture.dynasty}</span>
              <span>{scripture.translator}</span>
              <span>{cleanPassageTitle(activePage?.passageTitle ?? activePassage.title)}</span>
              <span>{mode === 'commentary' ? '原文对照注义' : '原文对白话导读'}</span>
            </div>

            <div className="classic-reading-toolbar-inline">
              <div className="classic-chip-group classic-chip-group-primary">
                <button
                  className={mode === 'commentary' ? 'classic-chip-button is-current' : 'classic-chip-button'}
                  onClick={() => setMode('commentary')}
                  type="button"
                >
                  注义
                </button>
                <button
                  className={mode === 'plain' ? 'classic-chip-button is-current' : 'classic-chip-button'}
                  onClick={() => setMode('plain')}
                  type="button"
                >
                  白话
                </button>
                <button
                  className={helperOpen ? 'classic-chip-button is-current' : 'classic-chip-button'}
                  onClick={() => setHelperOpen((value) => !value)}
                  type="button"
                >
                  {helperOpen ? '收起注义' : '展开注义'}
                </button>
              </div>
              <div className="classic-chip-group classic-chip-group-secondary">
                <button className="classic-chip-button" onClick={() => setFontScale(1.2)} type="button">
                  小字
                </button>
                <button className="classic-chip-button" onClick={() => setFontScale(1.32)} type="button">
                  标准
                </button>
                <button className="classic-chip-button" onClick={() => setFontScale(1.46)} type="button">
                  舒朗
                </button>
              </div>
            </div>

            {activePassage.audioUrl ? (
              <div className="classic-audio-panel">
                <span className="classic-meta-label">音频诵读</span>
                <audio className="reader-audio" controls preload="none" src={activePassage.audioUrl}>
                  你的浏览器暂不支持音频播放。
                </audio>
              </div>
            ) : null}

            <div className="classic-reading-stage">
              <div className="classic-reading-stage-body helper-collapsed">
                <section className="classic-reading-pane classic-reading-scripture" style={{ fontSize: `${fontScale}rem` }}>
                  {(originalParagraphs.length ? originalParagraphs : [activePage?.originalText ?? '']).map((paragraph, index) => (
                    <p key={`${paragraph}-${index}`} className="classic-reading-paragraph">
                      {paragraph}
                    </p>
                  ))}
                </section>
              </div>
            </div>

            <section className="classic-reading-helper-section">
              <button
                className="classic-reading-helper-toggle"
                onClick={() => setHelperOpen((value) => !value)}
                type="button"
              >
                <span>{mode === 'commentary' ? '祖师注义' : '白话导读'}</span>
                <span>{helperOpen ? '收起' : '展开'}</span>
              </button>
              {helperOpen ? (
                <div className="classic-reading-helper-content is-open" style={{ fontSize: `${Math.max(1.06, fontScale - 0.08)}rem` }}>
                  {(helperParagraphs.length ? helperParagraphs : [helperText]).map((paragraph, index) => (
                    <p key={`${paragraph}-${index}`} className="classic-reading-paragraph classic-reading-paragraph-helper">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="classic-reading-actions classic-reading-actions-bar">
              <div className="classic-reading-actions-group">
                <button
                  className="classic-inline-button"
                  disabled={!previousPassage}
                  onClick={() =>
                    previousPassage &&
                    startTransition(() => {
                      setActivePassageId(previousPassage.slug);
                    })
                  }
                  type="button"
                >
                  上一则
                </button>
                <button
                  className="classic-inline-button"
                  disabled={!nextPassage}
                  onClick={() =>
                    nextPassage &&
                    startTransition(() => {
                      setActivePassageId(nextPassage.slug);
                    })
                  }
                  type="button"
                >
                  下一则
                </button>
              </div>
              <div className="classic-reading-actions-group">
                <button
                  className="classic-inline-button"
                  onClick={() => {
                    void (async () => {
                      try {
                        await toggleFavorite(scripture.slug);
                      } catch (error) {
                        setNoteStatus(error instanceof Error ? error.message : '收藏失败');
                      }
                    })();
                  }}
                  type="button"
                >
                  {isFavorite(scripture.slug) ? '取消收藏' : '收藏经典'}
                </button>
              </div>
            </div>

            <div className="classic-reading-subtitle">修学摘录</div>
            <div className="classic-reading-block classic-reading-note-block">
              <textarea
                className="note-textarea"
                placeholder="写下体会"
                rows={4}
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
              <div className="classic-reading-actions">
                <button className="classic-inline-button" onClick={handleSaveNote} type="button">
                  保存摘录
                </button>
              </div>
              {noteStatus ? <p className="feedback-text">{noteStatus}</p> : null}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

export default ReaderPage;
