import { useEffect, useRef, useState } from 'react';
import BottomNav, { type Screen } from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import AboutScreen from './screens/AboutScreen';
import { useGame } from './game/useGame';
import { useHistory } from './history/useHistory';

export default function App() {
  // Screen switching is in-memory only: no router, no page reload
  const [screen, setScreen] = useState<Screen>('home');
  // Game state lives here so it survives screen switches (ADR-2)
  const game = useGame(screen === 'home');
  const history = useHistory();
  // gameId of the last recorded game; survives Strict Mode's double effect run (ADR-4)
  const recordedGameRef = useRef(0);
  const [saveFailedFor, setSaveFailedFor] = useState<number | null>(null);

  // Record once, right on the deciding press (ADR-10), not on "אישור" (ADR-5)
  const { status, gameId, completedRounds } = game.state;
  const { record } = history;
  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    if (recordedGameRef.current === gameId) return;
    recordedGameRef.current = gameId;
    const ok = record({ completedRounds, outcome: status === 'won' ? 'win' : 'loss' });
    setSaveFailedFor(ok ? null : gameId);
  }, [status, gameId, completedRounds, record]);

  function navigate(next: Screen) {
    // Leaving Home pauses an active game; coming back never resumes it on its own
    if (next === 'about') game.pause();
    setScreen(next);
  }

  return (
    <div className="app">
      <main className="app-content">
        {screen === 'home' ? (
          <HomeScreen game={game} saveFailed={saveFailedFor === gameId} />
        ) : (
          <AboutScreen history={history} />
        )}
      </main>
      <BottomNav current={screen} onNavigate={navigate} />
    </div>
  );
}
