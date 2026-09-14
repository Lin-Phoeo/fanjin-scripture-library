import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getScriptures, type ScriptureSummary } from '../lib/api';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialKeyword = searchParams.get('q') ?? '金刚';
  const [keyword, setKeyword] = useState(initialKeyword);
  const [results, setResults] = useState<ScriptureSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setKeyword(initialKeyword);
    void (async () => {
      setLoading(true);
      const data = await getScriptures(initialKeyword);
      setResults(data);
      setLoading(false);
    })();
  }, [initialKeyword]);

  const handleSubmit = () => {
    const value = keyword.trim();
    if (!value) {
      setSearchParams({});
      return;
    }

    setSearchParams({ q: value });
  };

  return (
    <main className="content-page classic-page">
      <section className="classic-shell">
        <aside className="classic-sidebar">
          <div className="classic-side-panel">
            <div className="classic-side-title">站内搜索</div>
            <div className="classic-side-heading">搜索提示</div>
            <div className="classic-reader-meta">
              <span>可搜索经名、关键句、祖师注义</span>
              <span>搜索结果会优先展示已发布经典</span>
              <span>建议使用经名或经句中的显著词</span>
            </div>
          </div>
        </aside>

        <section className="classic-main">
          <article className="classic-article">
            <h1>搜经名、搜句子、搜祖师解义</h1>
            <p>把全站经典、白话和注义统一收在一个搜索入口，减少反复翻目录的成本。</p>
            <div className="classic-search">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="输入经名、关键句或注义关键词"
              />
              <button type="button" onClick={handleSubmit}>
                搜索
              </button>
            </div>
          </article>

          <article className="classic-article">
            <h2>搜索结果</h2>
            <div className="classic-reader-meta">
              <span>当前共找到 {results.length} 条结果</span>
              <span>关键词：{initialKeyword || '未输入'}</span>
            </div>
            {loading ? (
              <div className="classic-line-item">
                <p>正在搜索数据库内容…</p>
              </div>
            ) : results.length ? (
              results.map((result) => (
                <div key={result.slug} className="classic-row">
                  <div>
                    <strong>{result.title}</strong>
                    <p>
                      {result.categoryName} · {result.dynasty} · {result.translator}
                    </p>
                    <p>{result.overlay}</p>
                  </div>
                  <Link className="classic-inline-link" to={`/reader/${result.slug}`}>
                    进入阅读
                  </Link>
                </div>
              ))
            ) : (
              <div className="classic-line-item">
                <p>当前关键词下没有结果，可以换更短的词，或直接去经藏目录浏览。</p>
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}

export default SearchPage;
