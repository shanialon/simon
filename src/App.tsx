import { useState } from 'react';
import BottomNav, { type Screen } from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import AboutScreen from './screens/AboutScreen';

export default function App() {
  // Screen switching is in-memory only: no router, no page reload
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <div className="app">
      <main className="app-content">
        {screen === 'home' ? <HomeScreen /> : <AboutScreen />}
      </main>
      <BottomNav current={screen} onNavigate={setScreen} />
    </div>
  );
}
