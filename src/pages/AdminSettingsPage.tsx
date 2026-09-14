import { useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  getAdminAnnouncements,
  getAdminSettings,
  type AnnouncementItem,
  updateAdminSettings,
} from '../lib/api';

function AdminSettingsPage() {
  const { token } = useAppState();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementDetail, setAnnouncementDetail] = useState('');
  const [message, setMessage] = useState('');

  const loadAnnouncements = async () => {
    if (!token) {
      return;
    }
    const data = await getAdminAnnouncements(token);
    setAnnouncements(data);
  };

  useEffect(() => {
    void (async () => {
      if (!token) {
        return;
      }
      const [settingsData, announcementData] = await Promise.all([
        getAdminSettings(token),
        getAdminAnnouncements(token),
      ]);
      setSettings(settingsData);
      setAnnouncements(announcementData);
    })();
  }, [token]);

  const save = async () => {
    if (!token) {
      return;
    }
    await updateAdminSettings(settings, token);
    setMessage('站点配置已保存。');
  };

  const saveAnnouncement = async () => {
    if (!token) {
      return;
    }
    await createAdminAnnouncement({ title: announcementTitle, detail: announcementDetail }, token);
    setAnnouncementTitle('');
    setAnnouncementDetail('');
    await loadAnnouncements();
    setMessage('公告已发布。');
  };

  const removeAnnouncement = async (id: number) => {
    if (!token) {
      return;
    }
    await deleteAdminAnnouncement(id, token);
    await loadAnnouncements();
    setMessage('公告已删除。');
  };

  return (
    <section className="admin-section">
      <div className="admin-panel">
        <h2>系统配置</h2>
        <div className="form-grid">
          <label>
            网站名称
            <input
              value={settings.site_name ?? ''}
              onChange={(event) => setSettings((current) => ({ ...current, site_name: event.target.value }))}
            />
          </label>
          <label>
            副标题
            <input
              value={settings.site_subtitle ?? ''}
              onChange={(event) => setSettings((current) => ({ ...current, site_subtitle: event.target.value }))}
            />
          </label>
          <label className="full-span">
            站点说明
            <textarea
              rows={4}
              value={settings.site_description ?? ''}
              onChange={(event) => setSettings((current) => ({ ...current, site_description: event.target.value }))}
            />
          </label>
          <label className="full-span">
            页脚提示
            <textarea
              rows={3}
              value={settings.footer_notice ?? ''}
              onChange={(event) => setSettings((current) => ({ ...current, footer_notice: event.target.value }))}
            />
          </label>
        </div>
        <div className="card-actions">
          <button className="primary-link button-reset" type="button" onClick={() => void save()}>
            保存配置
          </button>
        </div>
        {message ? <p className="feedback-text">{message}</p> : null}
      </div>

      <div className="admin-panel">
        <div className="results-header">
          <h2>公告管理</h2>
          <span>{announcements.length} 条公告</span>
        </div>
        <div className="form-grid">
          <label>
            公告标题
            <input value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} />
          </label>
          <label className="full-span">
            公告内容
            <textarea rows={4} value={announcementDetail} onChange={(event) => setAnnouncementDetail(event.target.value)} />
          </label>
        </div>
        <div className="card-actions">
          <button className="primary-link button-reset" type="button" onClick={() => void saveAnnouncement()}>
            发布公告
          </button>
        </div>
        <div className="list-stack compact-stack">
          {announcements.map((item) => (
            <article key={item.id} className="admin-list-row">
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
              <div className="row-actions">
                <button type="button" onClick={() => void removeAnnouncement(item.id)}>
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AdminSettingsPage;
