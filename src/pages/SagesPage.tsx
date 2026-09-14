import { startTransition, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { sages } from '../data/sages';

function SagesPage() {
  const [activeSlug, setActiveSlug] = useState(sages[0]?.slug ?? '');

  const activeSage = useMemo(
    () => sages.find((item) => item.slug === activeSlug) ?? sages[0],
    [activeSlug],
  );

  if (!activeSage) {
    return null;
  }

  return (
    <main className="content-page classic-page">
      <section className="classic-shell classic-sage-shell">
        <aside className="classic-sidebar">
          <div className="classic-side-panel">
            <div className="classic-side-title">高僧大德录</div>
            <div className="classic-sage-nav">
              {sages.map((sage) => (
                <button
                  key={sage.slug}
                  className={sage.slug === activeSage.slug ? 'classic-filter-link is-current' : 'classic-filter-link'}
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      setActiveSlug(sage.slug);
                    })
                  }
                >
                  <span>{sage.name}</span>
                  <small>{sage.honorific}</small>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="classic-main">
          <article className="classic-article classic-sage-hero">
            <div className="classic-reading-breadcrumb">
              <span>人物</span>
              <span>/</span>
              <span>高僧大德</span>
            </div>
            <h1>{activeSage.name}</h1>
            <p className="classic-sage-honorific">
              {activeSage.honorific} · {activeSage.era} · {activeSage.lineage}
            </p>
            <p className="classic-sage-profile">{activeSage.profile}</p>
            <div className="classic-tag-list">
              {activeSage.studyFocus.map((item) => (
                <span key={item} className="classic-study-tag">
                  {item}
                </span>
              ))}
            </div>
          </article>

          <section className="classic-sage-grid">
            <article className="classic-article classic-sage-panel">
              <div className="classic-reading-subtitle">风骨神采</div>
              <p className="classic-sage-copy">{activeSage.portraitLine}</p>
            </article>

            <article className="classic-article classic-sage-panel">
              <div className="classic-reading-subtitle">研学提示</div>
              <p className="classic-sage-copy">
                适合将其语录、行谊、著述与本站经藏、祖师注义、共修专题交叉关联，形成“人物入门
                → 语录观照 → 经文对读”的研学路径。
              </p>
            </article>
          </section>

          <section className="classic-sage-grid classic-sage-grid--content">
            <article className="classic-article classic-sage-panel">
              <div className="section-header-inline">
                <h2>语录</h2>
              </div>
              <div className="classic-quote-list">
                {activeSage.sayings.map((quote) => (
                  <blockquote key={quote.text} className="classic-quote-item">
                    <p>“{quote.text}”</p>
                    <footer>{quote.source}</footer>
                  </blockquote>
                ))}
              </div>
            </article>

            <article className="classic-article classic-sage-panel">
              <div className="section-header-inline">
                <h2>生平事迹</h2>
              </div>
              <div className="classic-sage-timeline">
                {activeSage.life.map((item) => (
                  <div key={`${item.period}-${item.title}`} className="classic-sage-timeline-item">
                    <div className="classic-sage-period">{item.period}</div>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="classic-sage-grid classic-sage-grid--content">
            <article className="classic-article classic-sage-panel">
              <div className="section-header-inline">
                <h2>相关经典</h2>
              </div>
              <div className="classic-related-list">
                {activeSage.relatedScriptures.map((item) => (
                  <div key={item} className="classic-related-item">
                    <div>
                      <strong>{item}</strong>
                      <p>可作为人物法脉与义理解读的延伸阅读入口。</p>
                    </div>
                    <Link className="classic-inline-link" to="/canon">
                      前往经藏
                    </Link>
                  </div>
                ))}
              </div>
            </article>

            <article className="classic-article classic-sage-panel">
              <div className="section-header-inline">
                <h2>相关专题</h2>
              </div>
              <div className="classic-related-list">
                {activeSage.relatedTopics.map((item) => (
                  <div key={item} className="classic-related-item">
                    <div>
                      <strong>{item}</strong>
                      <p>适合将人物风骨与经义实修结合起来做长期研学。</p>
                    </div>
                    <Link className="classic-inline-link" to="/topics">
                      进入专题
                    </Link>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </section>
      </section>
    </main>
  );
}

export default SagesPage;
