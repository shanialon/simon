import SimonBoard from '../components/SimonBoard';
import './HomeScreen.css';

export default function HomeScreen() {
  return (
    <section className="screen home-screen">
      <h1 className="screen-title">סיימון</h1>
      <p className="home-screen__stage">
        שלב <bdi>1</bdi> מתוך <bdi>10</bdi>
      </p>
      {/* Reserved status line so the layout does not jump once game messages are added */}
      <p className="home-screen__status" aria-live="polite" />
      <SimonBoard />
      <div className="home-screen__actions">
        <button type="button" className="btn-primary">
          התחל משחק
        </button>
      </div>
    </section>
  );
}
