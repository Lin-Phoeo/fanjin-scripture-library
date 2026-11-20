import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <main className="page-container not-found-page">
      <div className="empty-state"><h1>没有找到这一页</h1>
      <p>链接可能已变更。书架和本机记录不受影响。</p>
      <Link className="button-secondary" to="/">返回书架</Link></div>
    </main>
  );
}

export default NotFoundPage;
