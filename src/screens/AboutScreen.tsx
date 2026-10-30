import { useState } from 'react';
import HistoryCard from '../components/HistoryCard';
import ConfirmDialog from '../components/ConfirmDialog';
import type { History } from '../history/useHistory';
import './AboutScreen.css';

type Props = {
  history: History;
};

export default function AboutScreen({ history }: Props) {
  const { results, loadFailed, deleteFailed } = history;
  const [confirmOpen, setConfirmOpen] = useState(false);

  function openConfirm() {
    history.resetDeleteError();
    setConfirmOpen(true);
  }

  function confirmDelete() {
    history.clear();
    setConfirmOpen(false);
  }

  return (
    <section className="screen about-screen">
      <h1 className="screen-title">אודות</h1>

      <article className="card about-screen__intro">
        <h2 className="about-screen__card-title">על המשחק</h2>
        <p>זכור את רצף הצבעים שמוצג.</p>
        <p>לחץ על הצבעים באותו סדר.</p>
        <p>
          נסה להגיע עד שלב <bdi>10</bdi>!
        </p>
      </article>

      <h2 className="about-screen__section-title">10 המשחקים האחרונים</h2>
      {results.length > 0 ? (
        <ol className="about-screen__list" aria-label="10 המשחקים האחרונים">
          {results.map((result) => (
            <HistoryCard key={result.id} result={result} />
          ))}
        </ol>
      ) : loadFailed ? (
        <p className="card about-screen__error" role="alert">
          לא ניתן לטעון את היסטוריית המשחקים במכשיר זה.
        </p>
      ) : (
        <p className="card about-screen__empty">עדיין אין משחקים שמורים.</p>
      )}

      {deleteFailed && (
        <p className="about-screen__error about-screen__error--inline" role="alert">
          מחיקת ההיסטוריה נכשלה. נסה שוב.
        </p>
      )}

      {results.length > 0 && (
        <button type="button" className="about-screen__delete" onClick={openConfirm}>
          מחק היסטוריה
        </button>
      )}

      {confirmOpen && <ConfirmDialog onConfirm={confirmDelete} onCancel={() => setConfirmOpen(false)} />}
    </section>
  );
}
