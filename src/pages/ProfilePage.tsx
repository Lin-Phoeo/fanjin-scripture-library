import { useI18n } from '../lib/i18n';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { apiRequest } from '../lib/api';
import { ErrorNotice, errorMessage } from '../components/AsyncFeedback';
import { usePersonalPreferences } from '../lib/personal-preferences';
import PreferenceChoices from '../components/PreferenceChoices';
import { applyTheme, readPreferences } from '../lib/reading-preferences';
import { useResource } from '../lib/useResource';
import '../settings.css';

type Backup = { format: string; version: number; exportedAt: string; data: { profile?: { name?: string }; favorites?: unknown[]; notes?: unknown[]; progress?: unknown[]; bookmarks?: unknown[]; plans?: unknown[]; logs?: unknown[] } };
type SettingsTab = 'preferences' | 'backup' | 'about';
const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: 'preferences', label: '偏好' },
  { id: 'backup', label: '数据备份' },
  { id: 'about', label: '关于数据' },
];

function download(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function clearAuxiliaryStorage() {
  try {
    Object.keys(localStorage).filter((key) => key.startsWith('fanjin-progress-') || key.startsWith('fanjin-guest-') || key === 'fanjin-reading-preferences-v1').forEach((key) => localStorage.removeItem(key));
    Object.keys(sessionStorage).filter((key) => key.startsWith('fanjin-note-draft:')).forEach((key) => sessionStorage.removeItem(key));
  } catch { /* Primary store errors are handled by the local API. */ }
  applyTheme(readPreferences().theme);
}

export default function ProfilePage() {
  const { t } = useI18n();

  const { session, favorites, notes, refreshUserData, storageError } = useAppState();
  const preferences = usePersonalPreferences();
  const overview = useResource(() => apiRequest<Backup>('/api/local/export'));
  const [tab, setTab] = useState<SettingsTab>('preferences');
  const [name, setName] = useState(session.name);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [readingBackup, setReadingBackup] = useState(false);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [fileName, setFileName] = useState('');
  const [clearConfirmation, setClearConfirmation] = useState('');
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const readRevision = useRef(0);
  useEffect(() => setName(session.name), [session.name]);
  useEffect(() => () => { readRevision.current++; }, []);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setMessage(''); setError('');
    try { await action(); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const updated = async () => {
    await refreshUserData(); overview.reload(); preferences.reload();
    window.dispatchEvent(new Event('fanjin-local-data-updated'));
  };
  const readBackup = async (file?: File) => {
    const revision = ++readRevision.current;
    setBackup(null); setFileName(''); setMessage(''); setError('');
    if (!file) return;
    setReadingBackup(true);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('备份超过20MB，请选择梵烬导出的JSON备份。');
      const value: unknown = JSON.parse(await file.text());
      if (!value || typeof value !== 'object' || (value as Backup).format !== 'fanjin-local-backup' || (value as Backup).version !== 1 || !(value as Backup).data) {
        throw new Error('这不是支持的梵烬完整备份。请选择导出的完整JSON备份。');
      }
      const { validateLocalBackup } = await import('../lib/local-store');
      const state = validateLocalBackup(value);
      if (revision !== readRevision.current) return;
      setBackup({ format: 'fanjin-local-backup', version: 1, exportedAt: (value as Backup).exportedAt, data: state });
      setFileName(file.name); setMessage('备份已校验，尚未替换本机数据。');
    } catch (reason) { if (revision === readRevision.current) setError(errorMessage(reason)); }
    finally { if (revision === readRevision.current) setReadingBackup(false); }
  };
  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setTab(tabs[next].id); tabButtons.current[next]?.focus();
  }

  return <main className="page-container settings-page">
    <header className="page-title-row"><div><h1>{t("我的")}</h1><p>{t("此浏览器的阅读数据")}</p></div><Link className="button-quiet" to="/">{t("返回书架")}</Link></header>
    <div className="settings-counts" aria-label={t("本机数据概览")}>
      <span><strong>{favorites.length}</strong>{t("部收藏")}</span><span><strong>{notes.length}</strong>{t("条摘录")}</span>
      <span><strong>{overview.data?.data.bookmarks?.length ?? '—'}</strong>{t("处书签")}</span>
      <span><strong>{overview.data?.data.logs?.length ?? '—'}</strong>{t("条功课")}</span>
    </div>
    <ErrorNotice message={overview.error} retry={overview.reload} />
    <div className="segment-tabs settings-tabs" role="tablist" aria-label={t("我的设置")}>
      {tabs.map((item, index) => <button key={item.id} ref={(element) => { tabButtons.current[index] = element; }}
        id={`settings-tab-${item.id}`} type="button" role="tab" aria-selected={tab === item.id} aria-controls={`settings-panel-${item.id}`}
        tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={(event) => navigateTabs(event, index)}>{t(item.label)}</button>)}
    </div>
    <ErrorNotice message={storageError || error} />
    {message ? <p className="settings-status supporting-note" role="status">{t(message)}</p> : null}

    {tab === 'preferences' ? <div id="settings-panel-preferences" role="tabpanel" aria-labelledby="settings-tab-preferences" tabIndex={0}>
      <section className="settings-panel settings-section"><h2>{t("书斋称呼")}</h2>
        <form className="settings-name-form" onSubmit={(event) => { event.preventDefault(); void run(async () => {
          await apiRequest('/api/local/profile', { method: 'PUT', body: JSON.stringify({ name: name.trim() }) });
          await updated(); setMessage('称呼已保存。');
        }); }}>
          <label className="form-field"><span className="settings-visually-hidden">{t("书斋称呼")}</span><input required minLength={1} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <button className="button-secondary" disabled={busy || name.trim() === session.name} type="submit">{t("保存称呼")}</button>
        </form>
      </section>
      <section className="settings-panel settings-section settings-preferences"><h2>{t("阅读偏好")}</h2>
        <p className="supporting-note">{t("用于“适合这次阅读”的排序，可随时调整。")}</p>
        <PreferenceChoices value={preferences.value} update={preferences.update} disabled={busy || preferences.loading || preferences.saving} compact />
        <div className="settings-preference-status"><span role="status">{preferences.saving ? t('正在保存…') : preferences.status || t('选择后自动保存')}</span>
          <button className="button-quiet" type="button" disabled={busy || preferences.loading || preferences.saving} onClick={() => void preferences.reset()}>{t("清除偏好")}</button>
        </div>
        <ErrorNotice message={preferences.error} retry={preferences.retry} />
      </section>
    </div> : null}

    {tab === 'backup' ? <div id="settings-panel-backup" role="tabpanel" aria-labelledby="settings-tab-backup" tabIndex={0}>
      <p className="settings-tab-intro supporting-note">{t("数据不会自动云同步；换设备或清理浏览器前，请先下载备份。")}</p>
      <section className="settings-panel settings-section"><h2>{t("导出备份")}</h2>
        <p>{t("保存完整书斋记录，供以后恢复或换设备。")}</p>
        <button className="button" type="button" disabled={busy} onClick={() => void run(async () => {
          download(await apiRequest('/api/local/export'), `梵烬-本机书斋备份-${new Date().toISOString().slice(0, 10)}.json`);
          setMessage('备份已下载，请保存到浏览器之外的位置。');
        })}>{t("下载完整备份")}</button>
        <p className="supporting-note settings-export-note">{t("JSON 文件未加密，不含纸色、字号等外观设置。")}</p>
      </section>
      <section className="settings-panel settings-section"><h2>{t("导入备份")}</h2>
        <p>{t("将替换当前全部记录，不会合并。建议先导出当前数据。")}</p>
        <label className="form-field settings-file-field"><span>{t("选择梵烬 JSON 备份")}</span>
          <input type="file" accept="application/json,.json" disabled={busy || readingBackup} onChange={(event) => { void readBackup(event.target.files?.[0]); event.target.value = ''; }} />
        </label>
        {readingBackup ? <p className="supporting-note" role="status">{t("正在校验备份…")}</p> : null}
        {backup ? <section className="settings-backup-preview" aria-label={t("待导入备份预览")}><h3>{fileName}</h3>
          <p>{backup.data.profile?.name || t('未指定称呼')} · {new Date(backup.exportedAt).toLocaleString('zh-CN')}</p>
          <p>{backup.data.notes?.length || 0}{t("条摘录 ·")}{backup.data.bookmarks?.length || 0}{t("处书签 ·")}{backup.data.plans?.length || 0}{t("个计划 ·")}{backup.data.logs?.length || 0}{t("条功课")}</p>
          <div className="settings-actions"><button className="button" type="button" disabled={busy} onClick={() => {
            if (!window.confirm(t('确认用此备份替换当前浏览器里的全部书斋记录？建议先导出当前数据。'))) return;
            void run(async () => {
              window.dispatchEvent(new Event('fanjin-local-data-changing'));
              await apiRequest('/api/local/import', { method: 'POST', body: JSON.stringify({ backup }) });
              clearAuxiliaryStorage(); await updated(); setBackup(null); setMessage('备份已导入，本机书斋已替换。');
            });
          }}>{t("确认替换并导入")}</button><button className="button-quiet" type="button" disabled={busy} onClick={() => { setBackup(null); setMessage(''); }}>{t("取消")}</button></div>
        </section> : null}
      </section>
      <details className="settings-danger"><summary>{t("清除本机记录")}</summary>
        <div><p>{t("删除此浏览器的全部书斋数据，无法撤销。已下载的备份文件不会被删除。")}</p>
          <label className="form-field"><span>{t("输入“清除”确认")}</span><input value={clearConfirmation} onChange={(event) => setClearConfirmation(event.target.value)} autoComplete="off" /></label>
          <button className="button-secondary settings-danger-button" type="button" disabled={busy || clearConfirmation !== '清除'} onClick={() => {
            if (!window.confirm(t('确定清除本机全部记录？请确认已经保存备份。'))) return;
            void run(async () => {
              window.dispatchEvent(new Event('fanjin-local-data-changing'));
              await apiRequest('/api/local/data', { method: 'DELETE' });
              clearAuxiliaryStorage(); await updated(); setClearConfirmation(''); setBackup(null); setMessage('本机记录已清除。');
            });
          }}>{t("清除全部本机记录")}</button>
        </div>
      </details>
    </div> : null}

    {tab === 'about' ? <section id="settings-panel-about" className="settings-panel settings-section" role="tabpanel" aria-labelledby="settings-tab-about" tabIndex={0}>
      <h2>{t("数据在哪里")}</h2>
      <dl className="settings-data-notes">
        <div><dt>{t("只在当前浏览器")}</dt><dd>{t("收藏、书签、摘录、进度、功课和偏好不会上传服务器。其他设备、浏览器或网站地址不会自动共享。")}</dd></div>
        <div><dt>{t("备份由你保管")}</dt><dd>{t("清除网站数据、结束无痕会话或设备损坏可能丢失记录。请定期下载备份；备份含私人心得，分享文件也会分享内容。")}</dd></div>
        <div><dt>{t("外观单独保存")}</dt><dd>{t("纸色、字号与行距保存在此浏览器，不在完整 JSON 备份中。清除本机记录时会一起重置。")}</dd></div>
      </dl>
      <Link className="button-quiet" to="/privacy">{t("查看完整存储说明")}</Link>
    </section> : null}
  </main>;
}
