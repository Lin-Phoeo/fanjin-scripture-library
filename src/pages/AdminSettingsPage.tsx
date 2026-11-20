import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAppState } from '../context/AppStateContext';
import { apiRequest, createAdminAnnouncement, deleteAdminAnnouncement, getAdminAnnouncements, getAdminSettings, type AnnouncementItem, updateAdminSettings } from '../lib/api';

export default function AdminSettingsPage() {
  const { token } = useAppState();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try { const [nextSettings, nextAnnouncements] = await Promise.all([getAdminSettings(token), getAdminAnnouncements(token)]); setSettings(nextSettings); setAnnouncements(nextAnnouncements); }
    catch (error) { setError(error instanceof Error ? error.message : '配置加载失败。'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  async function saveSettings(event: FormEvent) {
    event.preventDefault(); if (!token || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await updateAdminSettings(settings, token);
      window.dispatchEvent(new Event('fanjin-settings-updated'));
      setMessage('站点配置已保存。');
    } catch (error) { setError(error instanceof Error ? error.message : '配置保存失败。'); }
    finally { setBusy(false); }
  }
  async function saveAnnouncement(event: FormEvent) {
    event.preventDefault(); if (!token || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const input = { title, detail };
      if (editing) await apiRequest('/api/admin/announcements/' + editing, { method: 'PUT', body: JSON.stringify(input) }, token);
      else await createAdminAnnouncement(input, token);
      setAnnouncements(await getAdminAnnouncements(token)); setEditing(null); setTitle(''); setDetail('');
      setMessage(editing ? '公告已更新。' : '公告已发布。');
    } catch (error) { setError(error instanceof Error ? error.message : '公告保存失败。'); }
    finally { setBusy(false); }
  }
  async function remove(item: AnnouncementItem) {
    if (!token || busy || !window.confirm('确认删除公告“' + item.title + '”？')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await deleteAdminAnnouncement(item.id, token); setAnnouncements(await getAdminAnnouncements(token));
      if (editing === item.id) { setEditing(null); setTitle(''); setDetail(''); }
      setMessage('公告已删除。');
    } catch (error) { setError(error instanceof Error ? error.message : '公告删除失败。'); }
    finally { setBusy(false); }
  }
  const disabled = loading || busy;
  return <section className="admin-section">
    <div className="admin-panel">
      <div className="results-header"><h2>站点配置</h2><button type="button" disabled={disabled} onClick={() => void load()}>重新加载</button></div>
      {error && <p className="feedback-text" role="alert">{error} <button type="button" disabled={disabled} onClick={() => void load()}>重试</button></p>}
      {message && <p className="feedback-text" role="status">{message}</p>}
      {loading && <p role="status">正在加载配置…</p>}
      <form onSubmit={(event) => void saveSettings(event)}><fieldset disabled={disabled} style={{ border: 0, padding: 0 }}>
        <div className="form-grid">
          <label>网站名称<input required maxLength={100} value={settings.site_name ?? ''} onChange={(event) => setSettings((current) => ({ ...current, site_name: event.target.value }))} /></label>
          <label>副标题<input required maxLength={200} value={settings.site_subtitle ?? ''} onChange={(event) => setSettings((current) => ({ ...current, site_subtitle: event.target.value }))} /></label>
          <label className="full-span">站点说明<textarea rows={4} maxLength={4000} value={settings.site_description ?? ''} onChange={(event) => setSettings((current) => ({ ...current, site_description: event.target.value }))} /></label>
          <label className="full-span">页脚说明<textarea rows={3} maxLength={2000} value={settings.footer_notice ?? ''} onChange={(event) => setSettings((current) => ({ ...current, footer_notice: event.target.value }))} /></label>
        </div><div className="card-actions"><button className="primary-link button-reset" type="submit">保存配置</button></div>
      </fieldset></form>
    </div>
    <div className="admin-panel"><div className="results-header"><h2>{editing ? '编辑公告' : '公告管理'}</h2><span>{announcements.length} 条公告</span></div>
      <form onSubmit={(event) => void saveAnnouncement(event)}><fieldset disabled={disabled} style={{ border: 0, padding: 0 }}>
        <div className="form-grid"><label>公告标题<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="full-span">公告内容<textarea required maxLength={10000} rows={4} value={detail} onChange={(event) => setDetail(event.target.value)} /></label></div>
        <div className="card-actions"><button className="primary-link button-reset" type="submit">{editing ? '保存公告' : '发布公告'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setTitle(''); setDetail(''); }}>取消编辑</button>}</div>
      </fieldset></form>
      {!loading && !announcements.length && <p>暂无公告。可发布版本更新或阅读提示。</p>}
      {announcements.map((item) => <article key={item.id} className="admin-list-row"><div><h3>{item.title}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{item.detail}</p></div><div className="row-actions"><button type="button" disabled={disabled} onClick={() => { setEditing(item.id); setTitle(item.title); setDetail(item.detail); setMessage(''); }}>编辑</button><button type="button" disabled={disabled} onClick={() => void remove(item)}>删除</button></div></article>)}
    </div>
  </section>;
}
