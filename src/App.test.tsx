import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { COLORS } from './game/colors';

function nav() {
  return screen.getByRole('navigation', { name: 'ניווט ראשי' });
}

describe('App shell', () => {
  it('renders the home screen by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'סיימון' })).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'שלב 1 מתוך 10'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    for (const label of ['ירוק', 'אדום', 'צהוב', 'כחול']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('places each color in its board position', () => {
    render(<App />);
    const expected = { ירוק: 'tl', אדום: 'tr', צהוב: 'bl', כחול: 'br' } as const;
    for (const { label, area } of COLORS) {
      expect(area).toBe(expected[label as keyof typeof expected]);
      expect(screen.getByRole('button', { name: label })).toHaveClass(`simon-board__pad--${area}`);
    }
  });

  it('has exactly two screens in the navigation', () => {
    render(<App />);
    const tabs = within(nav()).getAllByRole('button');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['בית', 'אודות']);
  });

  it('navigates to About and back to Home', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(nav()).getByRole('button', { name: 'אודות' }));
    expect(screen.getByRole('heading', { level: 1, name: 'אודות' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'על המשחק' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '10 המשחקים האחרונים' })).toBeInTheDocument();
    expect(screen.getByText('עדיין אין משחקים שמורים.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ירוק' })).not.toBeInTheDocument();
    expect(within(nav()).getByRole('button', { name: 'אודות' })).toHaveAttribute('aria-current', 'page');

    await user.click(within(nav()).getByRole('button', { name: 'בית' }));
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ירוק' })).toBeInTheDocument();
    expect(within(nav()).getByRole('button', { name: 'בית' })).toHaveAttribute('aria-current', 'page');
  });
});
