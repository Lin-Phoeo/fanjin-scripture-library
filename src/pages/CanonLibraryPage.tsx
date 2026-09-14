import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { type CategoryItem, type ScriptureSummary, getCategories, getScriptures } from '../lib/api';

function CanonLibraryPage() {
  const { isFavorite, toggleFavorite } = useAppState();
  const [scriptures, setScriptures] = useState<ScriptureSummary[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');

  async function loadData(nextKeyword = keyword, nextCategory = category) {
    setLoading(true);
    const [nextScriptures, nextCategories] = await Promise.all([
      getScriptures(nextKeyword, nextCategory),
      getCategories(),
    ]);
    setScriptures(nextScriptures);
    setCategories(nextCategories);
    setLoading(false);
  }

  useEffect(() => {
    void (async () => {
      await loadData('', '');
    })();
  }, []);

  return (
    <main className="content-page classic-page">
      <section className="classic-shell">
        <aside className="classic-sidebar">
          <div className="classic-side-panel">
            <div className="classic-side-title">经藏分类</div>
            <div className="classic-link-list">
              <button type="button" className={category === '' ? 'classic-filter-link is-current' : 'classic-filter-link'} onClick={() => { setCategory(''); void loadData(keyword, ''); }}>
                全部分类
              </button>
              {categories.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  className={category === item.slug ? 'classic-filter-link is-current' : 'classic-filter-link'}
                  onClick={() => {
                    setCategory(item.slug);
                    void loadData(keyword, item.slug);
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="classic-main">
          <div className="classic-article">
            <h1>经藏分类浏览</h1>
            <p>从经藏体系进入，而不是在信息洪流里盲找经典。</p>
            <div className="classic-search">
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入经名或关键句" />
              <button type="button" onClick={() => void loadData()}>
                搜索
              </button>
            </div>
          </div>

          <div className="classic-article">
            <h2>经典列表</h2>
            {loading ? (
              <div className="classic-line-item">
                <p>正在从数据库载入经藏内容…</p>
              </div>
            ) : (
              scriptures.map((scripture) => (
                <div key={scripture.slug} className="classic-row">
                  <div>
                    <strong>{scripture.title}</strong>
                    <p>
                      {scripture.categoryName} · {scripture.dynasty} · {scripture.translator}
                    </p>
                    <p>{scripture.overlay}</p>
                  </div>
                  <div className="classic-row-actions">
                    <Link className="classic-inline-link" to={`/reader/${scripture.slug}`}>
                      阅读
                    </Link>
                    <button
                      className="classic-inline-button"
                      onClick={async () => {
                        try {
                          await toggleFavorite(scripture.slug);
                        } catch (error) {
                          window.alert(error instanceof Error ? error.message : '收藏失败');
                        }
                      }}
                      type="button"
                    >
                      {isFavorite(scripture.slug) ? '取消收藏' : '收藏'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

export default CanonLibraryPage;
