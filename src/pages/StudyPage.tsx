import { useI18n } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorNotice, errorMessage } from '../components/AsyncFeedback';
import { useAppState } from '../context/AppStateContext';
import { getScripture, getScriptures } from '../lib/api';
import { archivePlan, createPlan, getStudy, localCalendarDate, recordStudy, updatePlan } from '../lib/study-api';
import { readingUrl } from '../lib/reading-progress';
import { useResource } from '../lib/useResource';

export default function StudyPage() {
  const { t, displayText } = useI18n();

  const { token, session, loading: accountLoading } = useAppState();
  const [params] = useSearchParams();
  const { data, loading, error, reload } = useResource(() => getStudy(token), [token, session.id]);
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
  const [creating, setCreating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const plan = data?.plans.find((item) => item.id === selectedId) ?? data?.plans.find((item) => item.scriptureSlug === params.get('scripture')) ?? data?.plans.find((item) => item.status === 'active') ?? data?.plans[0];
  const reading = useResource(() => plan ? getScripture(plan.scriptureSlug) : Promise.resolve(null), [plan?.scriptureSlug]);
  const alreadyRecorded = !!data?.checkins.some((item) => item.planId === plan?.id && item.date === date);
  useEffect(() => { setMinutes(plan?.dailyMinutes ?? 15); setNote(''); }, [plan?.id]);
  useEffect(() => {
    const requested = params.get('passage');
    const matching = plan?.scriptureSlug === params.get('scripture') && reading.data?.passages.some((item) => item.slug === requested);
    const unread = reading.data?.passages.find((item) => !data?.checkins.some((record) => record.planId === plan?.id && record.passageSlug === item.slug));
    setPassageSlug(matching ? requested! : unread?.slug ?? reading.data?.passages[0]?.slug ?? '');
  }, [reading.data, plan?.id]);
  useEffect(() => { const clear = () => { setNote(''); setSelectedId(null); setCreating(false); setMessage('本机记录已替换。'); }; window.addEventListener('fanjin-local-data-changing', clear); return () => window.removeEventListener('fanjin-local-data-changing', clear); }, []);
  useEffect(() => {
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll<HTMLDetailsElement>('.study-page details[open]').forEach((details) => { details.open = false; details.querySelector<HTMLElement>('summary')?.focus(); });
    };
    window.addEventListener('keydown', closeMenu);
    return () => window.removeEventListener('keydown', closeMenu);
  }, []);
  const mutate = async (action: () => Promise<unknown>, success: string) => { if (busy) return; setBusy(true); setMessage(''); try { await action(); setMessage(success); reload(); } catch (reason) { setMessage(errorMessage(reason)); } finally { setBusy(false); } };
  const createForm = <section className="study-create-panel"><h2>{data?.plans.length ? t('新建计划') : t('建立第一个计划')}</h2><p>{t("选择一本书和每天想留出的时间，随时可以暂停。")}</p><ErrorNotice message={library.error} retry={library.reload} /><form onSubmit={(event) => { event.preventDefault(); void mutate(async () => { const result = await createPlan(scriptureSlug, dailyMinutes, token); setSelectedId(result.id); setCreating(false); }, '计划已建立。'); }}><label>{t("经典")}<select required value={scriptureSlug} onChange={(event) => setScriptureSlug(event.target.value)}><option value="">{t("请选择一本书")}</option>{library.data?.map((book) => <option key={book.slug} value={book.slug}>{displayText(book.title)}</option>)}</select></label><label>{t("每日阅读时间（分钟）")}<input required type="number" min={1} max={240} value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))} /></label><div><button className="button" type="submit" disabled={busy || library.loading || !scriptureSlug}>{t("建立计划")}</button>{data?.plans.length ? <button className="button-quiet" type="button" onClick={() => setCreating(false)}>{t("取消")}</button> : null}</div></form></section>;
  if (accountLoading || loading) return <main className="tool-page study-page"><p role="status">{t("正在载入功课记录…")}</p></main>;
  return <main className="tool-page study-page"><header className="tool-page-heading"><div><h1>{t("每日功课")}</h1><p>{data?.plans.length ? t('选择计划，记录今天读过的内容。') : t('按自己的节奏读书，记录保存在本机。')}</p></div>{data?.plans.length ? <button className="button-secondary" type="button" onClick={() => setCreating((value) => !value)}>{t("新建计划")}</button> : null}</header><ErrorNotice message={error} retry={reload} /><ErrorNotice message={message} />
    {!data?.plans.length || creating ? createForm : plan ? <div className="study-workspace"><aside className="study-plan-index" aria-label={t("修读计划")}>{data.plans.map((item) => <button type="button" key={item.id} aria-pressed={item.id === plan.id} onClick={() => { setSelectedId(item.id); setMessage(''); }}><strong>{displayText(item.scriptureTitle)}</strong><span>{t("每天")}{item.dailyMinutes}{t("分钟 ·")}{item.status === 'paused' ? t('已暂停') : item.status === 'completed' ? t('已读完') : t('进行中')}</span></button>)}</aside><section className="study-record-panel"><header><div><h2>{displayText(plan.scriptureTitle)}</h2><p>{t("每天")}{plan.dailyMinutes}{t("分钟 · 已记录")}{plan.completedPassages}{t("段")}</p></div><details className="study-plan-more"><summary>{t("管理计划")}</summary><div>{plan.status !== 'completed' ? <button type="button" disabled={busy} onClick={() => void mutate(() => updatePlan(plan.id, { status: plan.status === 'paused' ? 'active' : 'paused' }, token), plan.status === 'paused' ? '计划已恢复。' : '计划已暂停。')}>{plan.status === 'paused' ? t('恢复计划') : t('暂停计划')}</button> : null}<button type="button" disabled={busy} onClick={() => { if (window.confirm(t('归档此计划？已有功课记录会继续保留。'))) void mutate(() => archivePlan(plan.id, token), '计划已归档。'); }}>{t("归档计划")}</button></div></details></header><ErrorNotice message={reading.error} retry={reading.reload} />
      {plan.status === 'paused' ? <div className="study-day-status"><p>{t("计划已暂停，恢复后可继续记录。")}</p><button className="button-secondary" type="button" disabled={busy} onClick={() => void mutate(() => updatePlan(plan.id, { status: 'active' }, token), '计划已恢复。')}>{t("恢复计划")}</button></div> : <form onSubmit={(event) => { event.preventDefault(); if (!passageSlug || alreadyRecorded) return; void mutate(async () => { await recordStudy({ planId: plan.id, passageSlug, minutes, note: note.trim(), date }, token); setNote(''); }, '本日功课已记录。'); }}><div className="study-date-row"><label>{t("日期")}<input required type="date" min={localCalendarDate(-3)} max={localCalendarDate()} value={date} onChange={(event) => setDate(event.target.value)} /></label><span>{t("可补记最近 3 天")}</span></div>{alreadyRecorded ? <div className="study-day-status"><strong>{t("这一天已记录")}</strong><p>{t("每个计划每天记一次，不会重复累计。")}</p><Link className="button-secondary" to={readingUrl(plan.scriptureSlug, passageSlug)}>{t("继续阅读")}</Link></div> : <><label>{t("读到哪一段")}<select required value={passageSlug} onChange={(event) => setPassageSlug(event.target.value)}><option value="">{t("选择段落")}</option>{reading.data?.passages.map((item) => <option key={item.slug} value={item.slug}>{displayText(item.title)}</option>)}</select></label><label>{t("阅读时长（分钟）")}<input required type="number" min={1} max={240} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label><details className="study-note-field"><summary>{t("补充一点心得（选填）")}</summary><label><span className="sr-only">{t("本次心得")}</span><textarea rows={4} maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("记下这次读书的体会")} /></label></details><div className="study-submit"><button className="button" type="submit" disabled={busy || reading.loading || !passageSlug}>{busy ? t('保存中…') : t('记录本日功课')}</button><Link className="button-quiet" to={readingUrl(plan.scriptureSlug, passageSlug)}>{t("打开原文")}</Link></div></>}</form>}
    </section></div> : null}
    {data?.checkins.length ? <section className="study-journal"><header><h2>{t("修读记录")}</h2><p>{t("累计")}{data.stats.totalDays}{t("天 ·")}{data.stats.totalMinutes}{t("分钟")}</p><button className="button-quiet" type="button" onClick={() => setShowHistory((value) => !value)}>{showHistory ? t('收起记录') : t('查看记录')}</button></header>{showHistory ? data.checkins.map((record) => <article key={record.id}><time>{record.date}</time><div><strong>{displayText(record.scriptureTitle)}</strong><p>{displayText(record.passageTitle)} · {record.minutes}{t("分钟")}</p>{record.note ? <p className="study-history-note">{record.note}</p> : null}</div></article>) : null}</section> : null}
  </main>;
}
