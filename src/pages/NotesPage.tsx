import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';

function NotesPage() {
  const { favorites, notes, removeNote } = useAppState();

  return (
    <main className="content-page classic-page">
      <section className="classic-shell">
        <aside className="classic-sidebar">
          <div className="classic-side-panel">
            <div className="classic-side-title">收藏摘录</div>
            <div className="classic-side-heading">修学沉淀</div>
            <div className="classic-reader-meta">
              <span>收藏用于保留长期反复阅读的经典</span>
              <span>摘录用于沉淀你当下的受用与体会</span>
              <span>后续可继续扩展导出与整理能力</span>
            </div>
          </div>
        </aside>

        <section className="classic-main">
          <article className="classic-article">
            <h1>把一闪而过的受用句子，沉淀成修学资产</h1>
            <p>这里集中整理你的收藏经典与摘录记录，便于后续复习、归纳与持续闻思修。</p>
          </article>

          <article className="classic-article">
            <div className="results-header">
              <h2>收藏经典</h2>
              <span>{favorites.length} 部</span>
            </div>
            <div className="list-stack compact-stack public-list-stack">
            {favorites.length ? (
              favorites.map((scripture) => (
                <article key={scripture.slug} className="list-card">
                  <div>
                    <span className="content-kicker">{scripture.categoryName}</span>
                    <h3>{scripture.title}</h3>
                    <p>{scripture.overlay}</p>
                  </div>
                  <Link className="header-button" to={`/reader/${scripture.slug}`}>
                    打开经典
                  </Link>
                </article>
              ))
            ) : (
              <article className="list-card">
                <p>你还没有收藏经典，可以先去经藏页或阅读页试试。</p>
              </article>
            )}
          </div>
          </article>

          <article className="classic-article">
            <div className="results-header">
              <h2>摘录记录</h2>
              <span>{notes.length} 条</span>
            </div>
            <div className="list-stack compact-stack public-list-stack">
            {notes.length ? (
              notes.map((note) => (
                <article key={note.id} className="list-card">
                  <div>
                    <span className="content-kicker">{note.scriptureTitle}</span>
                    <h3>{note.passageTitle}</h3>
                    <p>{note.note}</p>
                  </div>
                  <div className="row-actions">
                    <Link className="header-button" to={`/reader/${note.scriptureSlug}?passage=${note.passageSlug}`}>
                      查看出处
                    </Link>
                    <button type="button" onClick={() => removeNote(note.id)}>
                      删除
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <article className="list-card">
                <p>阅读页中保存的摘录会出现在这里，便于后续复习、整理和导出。</p>
              </article>
            )}
          </div>
          </article>
        </section>
      </section>
    </main>
  );
}

export default NotesPage;
