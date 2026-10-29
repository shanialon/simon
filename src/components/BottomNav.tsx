import type { ComponentType } from 'react';
import './BottomNav.css';

export type Screen = 'home' | 'about';

type Props = {
  current: Screen;
  onNavigate: (screen: Screen) => void;
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.5 11.2l1.3 1.5L5 11.7V21h5.5v-6h3v6H19v-9.3l1.2 1 1.3-1.5Z" fill="currentColor" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <rect x="10.75" y="10" width="2.5" height="7.5" rx="1" fill="var(--nav-icon-cut)" />
      <circle cx="12" cy="7" r="1.5" fill="var(--nav-icon-cut)" />
    </svg>
  );
}

const TABS: { id: Screen; label: string; Icon: ComponentType }[] = [
  { id: 'home', label: 'בית', Icon: HomeIcon },
  { id: 'about', label: 'אודות', Icon: InfoIcon },
];

export default function BottomNav({ current, onNavigate }: Props) {
  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="bottom-nav__tab"
          aria-current={current === id ? 'page' : undefined}
          onClick={() => onNavigate(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
