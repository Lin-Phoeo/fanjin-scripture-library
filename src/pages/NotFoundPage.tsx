import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <main className="content-page not-found-page">
      <p className="eyebrow">404</p>
      <h1>这个页面还没有修建完成。</h1>
      <p className="page-lead">你可以先返回首页或进入经藏页继续浏览，我们会继续把全站补齐。</p>
      <Link className="primary-link" to="/">
        返回首页
      </Link>
    </main>
  );
}

export default NotFoundPage;
