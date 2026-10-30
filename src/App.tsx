import { useState } from 'react';
import BottomNav, { type Screen } from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import AboutScreen from './screens/AboutScreen';
import { useGame } from './game/useGame';

export default function App() {
  // Screen switching is in-memory only: no router, no page reload
  const [screen, setScreen] = useState<Screen>('home');
  // Game state lives here so it survives screen switches (ADR-2)
  const game = useGame(screen === 'home');

  function navigate(next: Screen) {
    // Leaving Home pauses an active game; coming back never resumes it on its own
    if (next === 'about') game.pause();
    setScreen(next);
  }

  return (
    <div className="app">
      <main className="app-content">
        {screen === 'home' ? <HomeScreen game={game} /> : <AboutScreen />}
      </main>
      <BottomNav current={screen} onNavigate={navigate} />
    </div>
  );
}
