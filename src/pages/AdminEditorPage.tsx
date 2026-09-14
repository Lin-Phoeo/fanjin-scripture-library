import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import {
  createAdminScripture,
  getAdminScripture,
  getAdminScriptures,
  getCategories,
  type AdminScriptureInput,
  type ScriptureSummary,
  updateAdminScripture,
} from '../lib/api';

const blankPassage = {
  slug: '',
  title: '',
  originalText: '',
  plainText: '',
  commentaryText: '',
  audioUrl: '',
};

function AdminEditorPage() {
  const { token } = useAppState();
  const [searchParams] = useSearchParams();
  const [scriptures, setScriptures] = useState<ScriptureSummary[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; slug: string; name: string }>>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<AdminScriptureInput>({
    title: '',
    slug: '',
    categorySlug: '',
    dynasty: '',
    translator: '',
    role: '',
    overlay: '',
    summary: '',
    passages: [{ ...blankPassage }],
  });

  const editing = useMemo(() => Boolean(selectedSlug), [selectedSlug]);
  const previewSlug = useMemo(() => selectedSlug, [selectedSlug]);

  const updatePassage = (index: number, patch: Partial<(typeof form.passages)[number]>) => {
    setForm((current) => ({
      ...current,
      passages: current.passages.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const movePassage = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.passages.length) {
        return current;
      }
      const passages = [...current.passages];
      const [currentItem] = passages.splice(index, 1);
      passages.splice(nextIndex, 0, currentItem);
      return {
        ...current,
        passages,
      };
    });
  };

  const removePassage = (index: number) => {
    setForm((current) => ({
      ...current,
      passages:
        current.passages.length === 1
          ? [{ ...blankPassage }]
          : current.passages.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  async function loadOptions() {
    if (!token) {
      return;
    }
    const [nextScriptures, nextCategories] = await Promise.all([
      getAdminScriptures(token),
      getCategories(),
    ]);
    setScriptures(nextScriptures);
    setCategories(nextCategories);
    setForm((current) => ({
      ...current,
      categorySlug: current.categorySlug || nextCategories[0]?.slug || '',
    }));
  }

  useEffect(() => {
    void loadOptions();
  }, [token]);

  useEffect(() => {
    const slug = searchParams.get('slug') ?? '';
    if (!token || !slug || selectedSlug === slug || scriptures.length === 0) {
      return;
    }

    void loadScripture(slug);
  }, [searchParams, scriptures, selectedSlug, token]);

  const loadScripture = async (slug: string) => {
    if (!token || !slug) {
      return;
    }

    const detail = await getAdminScripture(slug, token);
    setSelectedSlug(slug);
    setForm({
      title: detail.title,
      slug: detail.slug,
      categorySlug: detail.categorySlug,
      dynasty: detail.dynasty,
      translator: detail.translator,
      role: detail.role,
      overlay: detail.overlay,
      summary: detail.summary,
      passages: detail.passages.map((passage) => ({
        slug: passage.slug,
        title: passage.title,
        originalText: passage.originalText,
        plainText: passage.plainText,
        commentaryText: passage.commentaryText,
        audioUrl: passage.audioUrl,
      })),
    });
    setMessage('');
  };

  const resetForm = () => {
    setSelectedSlug('');
    setForm({
      title: '',
      slug: '',
      categorySlug: categories[0]?.slug || '',
      dynasty: '',
      translator: '',
      role: '',
      overlay: '',
      summary: '',
      passages: [{ ...blankPassage }],
    });
    setMessage('');
  };

  const save = async () => {
    if (!token) {
      setMessage('请先使用有后台权限的账号登录。');
      return;
    }

    const normalizedSlug = form.slug.trim();
    const normalizedTitle = form.title.trim();
    const normalizedPassages = form.passages.map((passage) => ({
      ...passage,
      slug: passage.slug.trim(),
      title: passage.title.trim(),
      originalText: passage.originalText.trim(),
      plainText: passage.plainText.trim(),
      commentaryText: passage.commentaryText.trim(),
      audioUrl: passage.audioUrl.trim(),
    }));

    if (!normalizedTitle || !normalizedSlug || !form.categorySlug) {
      setMessage('请先完整填写经名、slug 和分类。');
      return;
    }

    if (normalizedPassages.some((passage) => !passage.slug || !passage.title || !passage.originalText)) {
      setMessage('每个段落至少要填写 slug、标题和原文。');
      return;
    }

    const duplicateSlug = normalizedPassages.find(
      (passage, index) => normalizedPassages.findIndex((item) => item.slug === passage.slug) !== index,
    );
    if (duplicateSlug) {
      setMessage(`段落 slug 重复：${duplicateSlug.slug}`);
      return;
    }

    const payload: AdminScriptureInput = {
      ...form,
      title: normalizedTitle,
      slug: normalizedSlug,
      passages: normalizedPassages,
    };

    try {
      const result = editing
        ? await updateAdminScripture(selectedSlug, payload, token)
        : await createAdminScripture(payload, token);

      await loadOptions();
      await loadScripture(result.slug);

      if (editing) {
        setMessage('经典内容已更新，并已进入审核队列。');
      } else {
        setMessage('新经典已创建，并已进入审核队列。');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    }
  };

  return (
    <section className="admin-section">
      <div className="admin-panel">
        <div className="results-header">
          <h2>经文录入 / 编辑</h2>
          <div className="row-actions">
            <button type="button" onClick={resetForm}>
              新建经典
            </button>
            <button type="button" onClick={() => void save()}>
              {editing ? '更新并送审' : '创建并送审'}
            </button>
            {previewSlug ? (
              <Link className="header-button" to={`/reader/${previewSlug}?draft=1`}>
                前台预览
              </Link>
            ) : null}
            <Link className="header-button" to="/canon">
              经藏列表
            </Link>
          </div>
        </div>

        <div className="editor-toolbar">
          <select
            value={selectedSlug}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                resetForm();
                return;
              }
              void loadScripture(value);
            }}
          >
            <option value="">选择已有经典进行编辑</option>
            {scriptures.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title}
              </option>
            ))}
          </select>
        </div>

        <div className="form-grid">
          <label>
            经名
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            slug
            <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
          </label>
          <label>
            分类
            <select value={form.categorySlug} onChange={(event) => setForm({ ...form, categorySlug: event.target.value })}>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            朝代
            <input value={form.dynasty} onChange={(event) => setForm({ ...form, dynasty: event.target.value })} />
          </label>
          <label>
            译者 / 集录
            <input value={form.translator} onChange={(event) => setForm({ ...form, translator: event.target.value })} />
          </label>
          <label>
            修学定位
            <input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
          </label>
          <label>
            当前发布状态
            <input value={editing ? scriptures.find((item) => item.slug === selectedSlug)?.publishStatus ?? 'pending_review' : '未创建'} readOnly />
          </label>
          <label className="full-span">
            对照说明
            <input value={form.overlay} onChange={(event) => setForm({ ...form, overlay: event.target.value })} />
          </label>
          <label className="full-span">
            简介
            <textarea rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
          </label>
        </div>

        <div className="admin-subsection">
          <div className="results-header">
            <h3>段落内容</h3>
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  passages: [...current.passages, { ...blankPassage }],
                }))
              }
            >
              添加段落
            </button>
          </div>
          {form.passages.map((passage, index) => (
            <div key={`${passage.slug}-${index}`} className="editor-passage-card">
              <div className="results-header">
                <h3>段落 {index + 1}</h3>
                <div className="row-actions">
                  <button type="button" onClick={() => movePassage(index, -1)} disabled={index === 0}>
                    上移
                  </button>
                  <button type="button" onClick={() => movePassage(index, 1)} disabled={index === form.passages.length - 1}>
                    下移
                  </button>
                  <button type="button" onClick={() => removePassage(index)}>
                    删除段落
                  </button>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  段落标题
                  <input
                    value={passage.title}
                    onChange={(event) => updatePassage(index, { title: event.target.value })}
                  />
                </label>
                <label>
                  passage slug
                  <input
                    value={passage.slug}
                    onChange={(event) => updatePassage(index, { slug: event.target.value })}
                  />
                </label>
                <label className="full-span">
                  原文
                  <textarea
                    rows={3}
                    value={passage.originalText}
                    onChange={(event) => updatePassage(index, { originalText: event.target.value })}
                  />
                </label>
                <label className="full-span">
                  白话导读
                  <textarea
                    rows={3}
                    value={passage.plainText}
                    onChange={(event) => updatePassage(index, { plainText: event.target.value })}
                  />
                </label>
                <label className="full-span">
                  祖师注义
                  <textarea
                    rows={3}
                    value={passage.commentaryText}
                    onChange={(event) => updatePassage(index, { commentaryText: event.target.value })}
                  />
                </label>
                <label className="full-span">
                  音频地址
                  <input
                    value={passage.audioUrl}
                    onChange={(event) => updatePassage(index, { audioUrl: event.target.value })}
                    placeholder="例如：https://example.com/audio/jingangjing-01.mp3"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        {message ? <p className="feedback-text">{message}</p> : null}
      </div>
    </section>
  );
}

export default AdminEditorPage;
