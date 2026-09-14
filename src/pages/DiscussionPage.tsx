import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import {
  createDiscussion,
  createDiscussionReply,
  getDiscussion,
  getDiscussions,
  getScriptures,
  getTopics,
  type DiscussionDetail,
  type DiscussionItem,
  type ScriptureSummary,
  type TopicSummary,
} from '../lib/api';

function DiscussionPage() {
  const [searchParams] = useSearchParams();
  const { session, token } = useAppState();
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [scriptures, setScriptures] = useState<ScriptureSummary[]>([]);
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDiscussion, setSelectedDiscussion] = useState<DiscussionDetail | null>(null);
  const [scriptureFilter, setScriptureFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [newScriptureSlug, setNewScriptureSlug] = useState('');
  const [newTopicSlug, setNewTopicSlug] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicBody, setTopicBody] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [message, setMessage] = useState('');

  const loadDetail = async (id: number) => {
    const detail = await getDiscussion(id);
    setSelectedId(id);
    setSelectedDiscussion(detail);
    setReplyBody('');
  };

  const loadDiscussions = async (
    nextScripture = scriptureFilter,
    nextTopic = topicFilter,
    preferredId: number | null = selectedId,
  ) => {
    setLoading(true);
    const data = await getDiscussions({
      scriptureSlug: nextScripture,
      topicSlug: nextTopic,
    });
    setDiscussions(data);
    setLoading(false);

    if (data.length === 0) {
      setSelectedId(null);
      setSelectedDiscussion(null);
      return;
    }

    const targetId = data.some((thread) => thread.id === preferredId) ? preferredId : data[0]?.id ?? null;
    if (targetId) {
      await loadDetail(targetId);
    }
  };

  useEffect(() => {
    void (async () => {
      const initialScripture = searchParams.get('scripture') ?? '';
      const initialTopic = searchParams.get('topic') ?? '';
      const initialDiscussionId = Number(searchParams.get('discussion') ?? '');
      const [scriptureItems, topicItems] = await Promise.all([getScriptures(), getTopics()]);
      setScriptures(scriptureItems);
      setTopics(topicItems);
      setScriptureFilter(initialScripture);
      setTopicFilter(initialTopic);
      setNewScriptureSlug(initialScripture);
      setNewTopicSlug(initialTopic);
      await loadDiscussions(
        initialScripture,
        initialTopic,
        Number.isFinite(initialDiscussionId) && initialDiscussionId > 0 ? initialDiscussionId : null,
      );
    })();
  }, [searchParams]);

  return (
    <main className="content-page classic-page">
      <section className="classic-shell discussion-shell">
        <aside className="classic-sidebar">
          <div className="classic-side-panel">
            <div className="classic-side-title">共修讨论</div>
            <div className="classic-side-heading">筛选讨论</div>
            <div className="classic-form-field">
              <label htmlFor="discussion-scripture-filter">关联经典</label>
              <select
                id="discussion-scripture-filter"
                value={scriptureFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setScriptureFilter(value);
                  void loadDiscussions(value, topicFilter, null);
                }}
              >
                <option value="">全部经典</option>
                {scriptures.map((scripture) => (
                  <option key={scripture.slug} value={scripture.slug}>
                    {scripture.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="classic-form-field">
              <label htmlFor="discussion-topic-filter">关联专题</label>
              <select
                id="discussion-topic-filter"
                value={topicFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setTopicFilter(value);
                  void loadDiscussions(scriptureFilter, value, null);
                }}
              >
                <option value="">全部专题</option>
                {topics.map((topic) => (
                  <option key={topic.slug} value={topic.slug}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="classic-side-panel">
            <div className="classic-side-heading">主题目录</div>
            <div className="classic-thread-list">
              {loading ? (
                <div className="classic-reader-meta">
                  <span>正在载入讨论内容…</span>
                </div>
              ) : discussions.length === 0 ? (
                <div className="classic-reader-meta">
                  <span>当前筛选下还没有主题。</span>
                </div>
              ) : (
                discussions.map((thread) => (
                  <button
                    key={thread.id}
                    className={thread.id === selectedId ? 'classic-thread-button is-current' : 'classic-thread-button'}
                    onClick={() => void loadDetail(thread.id)}
                    type="button"
                  >
                    <strong>{thread.title}</strong>
                    <small>{thread.scriptureTitle ?? thread.topicTitle ?? '讨论'}</small>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="classic-main">
          <article className="classic-article classic-article-replies">
            <h1>{selectedDiscussion ? selectedDiscussion.title : '共修讨论'}</h1>
            {selectedDiscussion ? (
              <>
                <div className="classic-meta-line">发起人：{selectedDiscussion.authorName}</div>
                <div className="classic-meta-line">
                  所属对象：{selectedDiscussion.scriptureTitle ?? selectedDiscussion.topicTitle ?? '自由讨论'}
                </div>
                <div className="classic-meta-line">
                  回复数：{selectedDiscussion.replies.length} 条 · 赞同：{selectedDiscussion.likesCount} 次
                </div>
                <div className="classic-reading-block">
                  <p className="classic-reading-paragraph classic-reading-paragraph-helper classic-discussion-body">
                    {selectedDiscussion.body}
                  </p>
                </div>
                <div className="classic-reading-actions classic-reading-actions-bar">
                  {selectedDiscussion.scriptureSlug ? (
                    <Link className="classic-inline-button" to={`/reader/${selectedDiscussion.scriptureSlug}`}>
                      进入关联经典
                    </Link>
                  ) : null}
                  {selectedDiscussion.topicSlug ? (
                    <Link className="classic-inline-button" to={`/topics`}>
                      查看专题页
                    </Link>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="classic-reading-block">
                <p className="classic-reading-paragraph classic-reading-paragraph-helper">
                  请先从左侧选择一个讨论主题，再继续阅读与回复。
                </p>
              </div>
            )}
          </article>

          <article className="classic-article">
            <h2>回复记录</h2>
            {selectedDiscussion?.replies.length ? (
              selectedDiscussion.replies.map((reply) => (
                <article key={reply.id} className="classic-reply-card">
                  <div className="classic-reply-meta">
                    <strong>{reply.authorName}</strong>
                    <span>{new Date(reply.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                  <p className="classic-reply-body">{reply.body}</p>
                </article>
              ))
            ) : (
              <div className="classic-line-item">
                <p>当前主题还没有回复，你可以在下方接续讨论。</p>
              </div>
            )}
          </article>

          <article className="classic-article classic-article-composer">
            <h2>{selectedDiscussion ? '续写讨论' : '发起新主题'}</h2>
            {selectedDiscussion ? (
              <>
                <div className="classic-form-field classic-form-field-note">
                  <label htmlFor="reply-body">回复内容</label>
                  <textarea
                    id="reply-body"
                    rows={5}
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    placeholder={session ? '继续你的共修交流…' : '登录后可回帖'}
                  />
                </div>
                <div className="classic-reading-actions">
                  <button
                    className="classic-inline-button"
                    onClick={() => {
                      void (async () => {
                        if (!token || !selectedId) {
                          setMessage('请先登录后再回帖。');
                          return;
                        }
                        try {
                          await createDiscussionReply(selectedId, replyBody, token);
                          setMessage('回复已发布。');
                          await loadDiscussions(scriptureFilter, topicFilter, selectedId);
                        } catch (error) {
                          setMessage(error instanceof Error ? error.message : '回复失败');
                        }
                      })();
                    }}
                    type="button"
                  >
                    发布回复
                  </button>
                </div>
              </>
            ) : null}

            <div className="classic-form-grid classic-form-grid-composer">
              <div className="classic-form-field">
                <label htmlFor="new-scripture-slug">关联经典</label>
                <select id="new-scripture-slug" value={newScriptureSlug} onChange={(event) => setNewScriptureSlug(event.target.value)}>
                  <option value="">不绑定经典</option>
                  {scriptures.map((scripture) => (
                    <option key={scripture.slug} value={scripture.slug}>
                      {scripture.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="classic-form-field">
                <label htmlFor="new-topic-slug">关联专题</label>
                <select id="new-topic-slug" value={newTopicSlug} onChange={(event) => setNewTopicSlug(event.target.value)}>
                  <option value="">不绑定专题</option>
                  {topics.map((topic) => (
                    <option key={topic.slug} value={topic.slug}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="classic-form-field classic-form-field-full">
                <label htmlFor="topic-title">主题标题</label>
                <input
                  id="topic-title"
                  value={topicTitle}
                  onChange={(event) => setTopicTitle(event.target.value)}
                  placeholder="例如：如何理解无住生心与日常功课的关系？"
                />
              </div>
              <div className="classic-form-field classic-form-field-full">
                <label htmlFor="topic-body">主题内容</label>
                <textarea
                  id="topic-body"
                  rows={6}
                  value={topicBody}
                  onChange={(event) => setTopicBody(event.target.value)}
                  placeholder="结合你的阅读体会发起讨论。"
                />
              </div>
            </div>

            <div className="classic-reading-actions">
              <button
                className="classic-inline-button"
                onClick={() => {
                  void (async () => {
                    if (!token) {
                      setMessage('请先登录后再发帖。');
                      return;
                    }
                    try {
                      const result = await createDiscussion(
                        {
                          title: topicTitle,
                          body: topicBody,
                          scriptureSlug: newScriptureSlug || undefined,
                          topicSlug: newTopicSlug || undefined,
                        },
                        token,
                      );
                      setTopicTitle('');
                      setTopicBody('');
                      setNewScriptureSlug(scriptureFilter);
                      setNewTopicSlug(topicFilter);
                      setMessage('新主题已发布。');
                      await loadDiscussions(scriptureFilter, topicFilter, result.id);
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : '发帖失败');
                    }
                  })();
                }}
                type="button"
              >
                发布主题
              </button>
            </div>
            {message ? <p className="feedback-text">{message}</p> : null}
          </article>
        </section>
      </section>
    </main>
  );
}

export default DiscussionPage;
