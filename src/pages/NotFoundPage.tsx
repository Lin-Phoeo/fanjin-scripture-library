import { useI18n } from '../lib/i18n';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  const { t } = useI18n();

  return (
    <main className="page-container not-found-page">
      <div className="empty-state"><h1>{t("没有找到这一页")}</h1>
      <p>{t("链接可能已变更。书架和本机记录不受影响。")}</p>
      <Link className="button-secondary" to="/">{t("返回书架")}</Link></div>
    </main>
  );
}

export default NotFoundPage;
