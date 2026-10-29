import './AboutScreen.css';

export default function AboutScreen() {
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
      <p className="card about-screen__empty">עדיין אין משחקים שמורים.</p>
    </section>
  );
}
