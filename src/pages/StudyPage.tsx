import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorNotice, errorMessage } from '../components/AsyncFeedback';
import { useAppState } from '../context/AppStateContext';
import { getScripture, getScriptures } from '../lib/api';
import { archivePlan, createPlan, getStudy, localCalendarDate, recordStudy, updatePlan } from '../lib/study-api';
import { useResource } from '../lib/useResource';

export default function StudyPage() {
  const { token, session, loading: accountLoading } = useAppState();
  const [params] = useSearchParams();
  const { data, loading, error, reload } = useResource(() => token ? getStudy(token) : Promise.resolve(null), [token, session?.id]);
  const library = useResource(getScriptures);
  const [scriptureSlug, setScriptureSlug] = useState(params.get('scripture') ?? '');
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [passageSlug, setPassageSlug] = useState('');
  const [minutes, setMinutes] = useState(15);
  const [date, setDate] = useState(localCalendarDate);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const plan = data?.plans.find((item) => item.id === selectedId) ?? data?.plans.find((item) => item.scriptureSlug === params.get('scripture')) ?? data?.plans.find((item) => item.status === 'active') ?? data?.plans[0];
  const reading = useResource(() => plan ? getScripture(plan.scriptureSlug) : Promise.resolve(null), [plan?.scriptureSlug]);
  useEffect(() => { setMinutes(plan?.dailyMinutes ?? 15); setNote(''); }, [plan?.id]);
  useEffect(() => {
    const requested = params.get('passage');
    const matchingRequested = plan?.scriptureSlug === params.get('scripture') && reading.data?.passages.some((item) => item.slug === requested);
    const unread = reading.data?.passages.find((item) => !data?.checkins.some((record) => record.planId === plan?.id && record.passageSlug === item.slug));
    setPassageSlug(matchingRequested ? requested! : unread?.slug ?? reading.data?.passages[0]?.slug ?? '');
  }, [reading.data, plan?.id]);
  const mutate = async (action: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await action(); setMessage(success); reload(); }
    catch (reason) { setMessage(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  if (accountLoading) return <main className="study-page"><p role="status">正在打开你的自修记录…</p></main>;
  return <main className="study-page"><header className="study-heading"><div><h1>今日，安住一卷。</h1><p>读到哪里，记到哪里。功课是留给自己的时间。</p></div><Link className="quiet-link" to="/canon">去经藏选书 ↗</Link></header>
    <ErrorNotice message={error} retry={reload} /><ErrorNotice message={message} />
    <section className="study-stats" aria-label="自修统计"><div><span>今天读书</span><strong>{data?.stats.todayMinutes ?? 0}<small>分钟</small></strong></div><div><span>累计修读</span><strong>{data?.stats.totalDays ?? 0}<small>天</small></strong></div><div><span>阅读时光</span><strong>{data?.stats.totalMinutes ?? 0}<small>分钟</small></strong></div><div><span>已读段落</span><strong>{data?.stats.completedPassages ?? 0}<small>段</small></strong></div></section>
    {loading ? <p role="status">正在载入自修计划…</p> : null}
    <div className={`study-layout${data?.plans.length ? ' has-plans' : ''}`}><section><div className="reading-section-heading"><h2>案头功课</h2><span className="reading-meta">{data?.plans.length ?? 0} 部在读</span></div>
      {!loading && !data?.plans.length ? <div className="empty-reading-state"><span aria-hidden="true">卷</span><h3>你的第一卷，尚待翻开。</h3><p>在右侧选择经典与每日时间，开始一段属于自己的修读。</p></div> : null}
      <div className="study-plan-list">{data?.plans.map((item) => <article className={item.id === plan?.id ? 'study-plan is-selected' : 'study-plan'} key={item.id}><div className="study-plan-title"><button type="button" onClick={() => { setSelectedId(item.id); setMessage(''); }}>{item.scriptureTitle}</button><span className="plan-state">{item.status === 'active' ? '修读中' : item.status === 'paused' ? '暂歇' : '已读完'}</span></div><p>每日 {item.dailyMinutes} 分钟 · 已读 {item.completedPassages} / {item.totalPassages} 段</p><progress aria-label={`${item.scriptureTitle} 阅读进度`} max={Math.max(1, item.totalPassages)} value={item.completedPassages} /><div className="study-plan-actions"><Link to={`/reader/${encodeURIComponent(item.scriptureSlug)}`}>打开原文 ↗</Link><button type="button" disabled={busy} onClick={() => { setSelectedId(item.id); document.getElementById('study-record-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>记录功课</button>{item.status !== 'completed' ? <button type="button" disabled={busy} onClick={() => void mutate(() => updatePlan(item.id, { status: item.status === 'active' ? 'paused' : 'active' }, token), item.status === 'active' ? '计划已暂歇，随时可以继续。' : '计划已恢复。')}>{item.status === 'active' ? '暂歇' : '继续'}</button> : null}<button type="button" disabled={busy} onClick={() => { if (window.confirm('归档此计划？已保存的功课记录会继续保留。')) void mutate(() => archivePlan(item.id, token), '计划已归档，修读记录已保留。'); }}>归档</button></div></article>)}</div>
      {plan ? <section className="study-record-panel" id="study-record-form"><h2>{plan.scriptureTitle}</h2><ErrorNotice message={reading.error} retry={reading.reload} /><form className="form-grid" onSubmit={(event) => { event.preventDefault(); if (!passageSlug) return; void mutate(async () => { await recordStudy({ planId: plan.id, passageSlug, minutes, note: note.trim(), date }, token); setNote(''); }, '每日定课已保存，愿有所受用。'); }}><label>功课日期<input required type="date" min={localCalendarDate(-3)} max={localCalendarDate()} value={date} onChange={(event) => setDate(event.target.value)} /></label><label>读过的段落<select required value={passageSlug} onChange={(event) => setPassageSlug(event.target.value)}><option value="">选择段落</option>{reading.data?.passages.map((passage) => <option key={passage.slug} value={passage.slug}>{passage.title}</option>)}</select></label><label>本次阅读时长（分钟）<input required type="number" min={1} max={240} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label><label className="full-span">一点心得 <span className="optional-label">选填，仅自己可见</span><textarea rows={4} maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="此刻读到的，与你相应的…" /></label><div className="card-actions full-span"><button className="ink-button" type="submit" disabled={busy || reading.loading || !passageSlug || data?.checkins.some((item) => item.planId === plan.id && item.date === date)}>{data?.checkins.some((item) => item.planId === plan.id && item.date === date) ? '该日已记录' : busy ? '保存中…' : '记录每日定课'}</button><Link className="quiet-link" to={`/reader/${encodeURIComponent(plan.scriptureSlug)}?passage=${encodeURIComponent(passageSlug)}`}>回到这一段 →</Link></div></form><p className="form-footnote">每个计划每天只记一次，重复提交不会累计或覆盖已有记录。可温和补记最近 3 天，日期以此设备的本地日历为准。</p></section> : null}
    </section><aside className="study-create-panel"><h2>从这里开始</h2><p>每天留一点空白，读书不必着急。</p><ErrorNotice message={library.error} retry={library.reload} /><form className="auth-form" onSubmit={(event) => { event.preventDefault(); void mutate(async () => { const result = await createPlan(scriptureSlug, dailyMinutes, token); setSelectedId(result.id); }, '计划已建立，按自己的步调开始吧。'); }}><label>选择经典<select required value={scriptureSlug} onChange={(event) => setScriptureSlug(event.target.value)}><option value="">挑选一部想读的书</option>{library.data?.map((scripture) => <option key={scripture.slug} value={scripture.slug}>{scripture.title}</option>)}</select></label><label>每日留出（分钟）<input required type="number" min={1} max={240} value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))} /></label><button className="ink-button" type="submit" disabled={busy || library.loading || !scriptureSlug}>建立计划 <span aria-hidden="true">＋</span></button></form><p className="form-footnote">计划随时可以暂歇或归档。阅读与心得记录都属于你自己。</p></aside></div>
    <section className="study-journal"><div className="reading-section-heading"><div><h2>我的修读记录</h2></div><span className="reading-meta">仅自己可见</span></div>{data?.checkins.length ? data.checkins.map((record) => <article className="journal-entry" key={record.id}><time>{record.date}</time><div><h3>{record.scriptureTitle} <span>· {record.passageTitle}</span></h3><small>{record.minutes} 分钟</small>{record.note ? <p>{record.note}</p> : <p className="muted-note">今日留心读过，便是一点积累。</p>}</div></article>) : <p>保存第一条功课后，阅读的痕迹会留在这里。</p>}</section>
  </main>;
}
