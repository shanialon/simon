import SimonBoard from '../components/SimonBoard';
import EndDialog from '../components/EndDialog';
import type { Game } from '../game/useGame';
import { MAX_ROUNDS } from '../game/timing';
import './HomeScreen.css';

type Props = {
  game: Game;
};

export default function HomeScreen({ game }: Props) {
  const { state, litColor, displayRound, endMessageShown, audioError } = game;
  const { status } = state;
  const ended = status === 'won' || status === 'lost';

  let statusText = '';
  let hint = '';
  if (status === 'presenting') {
    statusText = 'המשחק מציג את הרצף';
    hint = 'המתן...';
  } else if (status === 'awaitingInput') {
    statusText = 'התור שלך';
    hint = 'הקש על הצבעים לפי הסדר';
  }

  return (
    <section className="screen home-screen">
      <h1 className="screen-title">סיימון</h1>
      <p className="home-screen__stage">
        שלב <bdi>{status === 'idle' ? 1 : displayRound}</bdi> מתוך <bdi>{MAX_ROUNDS}</bdi>
      </p>
      <p className={`home-screen__status${audioError ? ' home-screen__status--error' : ''}`} aria-live="polite">
        {status === 'idle' && audioError ? 'לא ניתן להפעיל את הצלילים. לחץ שוב על "התחל משחק".' : statusText}
      </p>
      <div className="home-screen__board">
        <SimonBoard
          litColor={litColor}
          dimmed={status === 'presenting'}
          inputEnabled={status === 'awaitingInput'}
          onPressStart={game.pressStart}
          onPressEnd={game.pressEnd}
        />
        {ended && endMessageShown && (
          <EndDialog
            outcome={status === 'won' ? 'win' : 'loss'}
            completedRounds={state.completedRounds}
            onConfirm={game.dismiss}
          />
        )}
      </div>
      <div className="home-screen__actions">
        {status === 'idle' ? (
          <button type="button" className="btn-primary" onClick={game.startGame}>
            התחל משחק
          </button>
        ) : (
          <p className="home-screen__hint">{hint}</p>
        )}
      </div>
    </section>
  );
}
