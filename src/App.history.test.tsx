import { StrictMode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import type { ColorId } from './game/colors';
import { randomColor } from './game/random';
import { HISTORY_KEY, addResult } from './history/historyStorage';
import { advance, clickResume, clickStart, goTo, other, playRounds, press, readSequence, setPageVisibility } from './test/gameTestUtils';

vi.mock('./audio/audio', () => ({
  unlockAudio: vi.fn(async () => true),
  startTone: vi.fn(() => vi.fn()),
  playWin: vi.fn(),
  playLose: vi.fn(),
  stopAll: vi.fn(),
}));
vi.mock('./effects/confetti', () => ({ fireConfetti: vi.fn(), resetConfetti: vi.fn() }));
vi.mock('./game/random', () => ({ randomColor: vi.fn() }));

const storedResults = (): { completedRounds: number; outcome: string }[] =>
  JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{"results":[]}').results;
const cards = () => screen.queryAllByRole('listitem');
const deleteButton = () => screen.queryByRole('button', { name: 'מחק היסטוריה' });
const EMPTY = 'עדיין אין משחקים שמורים.';
const fail = () => {
  throw new Error('storage blocked');
};

// Starts a game and loses on the first color of round 1
async function loseAtRoundOne() {
  await clickStart();
  const [first] = readSequence(1, 1000);
  press(other(first));
}

function dismissEnd() {
  advance(1000);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'אישור' }));
}

describe('History', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 30, 14, 32, 0));
    vi.clearAllMocks();
    const cycle: ColorId[] = ['red', 'red', 'blue', 'green', 'yellow', 'green', 'blue'];
    let i = 0;
    vi.mocked(randomColor).mockImplementation(() => cycle[i++ % cycle.length]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });

  it('a loss at round 1 adds one card with 0 completed rounds, the result and the finish time', async () => {
    render(<App />);
    await loseAtRoundOne();
    expect(storedResults()).toMatchObject([{ completedRounds: 0, outcome: 'loss' }]);
    dismissEnd();
    goTo('אודות');
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
    expect(cards()).toHaveLength(1);
    expect(cards()[0]).toHaveTextContent('שלבים שהושלמו: 0');
    expect(cards()[0]).toHaveTextContent('תוצאה: הפסד');
    expect(cards()[0]).toHaveTextContent('30.10.2026 14:32');
    expect(deleteButton()).toBeInTheDocument();
  });

  it('records a loss at an advanced round and a win with their completed rounds', async () => {
    render(<App />);
    await clickStart();
    playRounds(3);
    const seq = readSequence(4, 2000);
    press(other(seq[0]));
    dismissEnd();

    await clickStart();
    playRounds(10);
    dismissEnd();

    expect(storedResults()).toMatchObject([
      { completedRounds: 10, outcome: 'win' },
      { completedRounds: 3, outcome: 'loss' },
    ]);
    goTo('אודות');
    expect(cards()[0]).toHaveTextContent('שלבים שהושלמו: 10');
    expect(cards()[0]).toHaveTextContent('תוצאה: ניצחון');
    expect(cards()[1]).toHaveTextContent('שלבים שהושלמו: 3');
    expect(cards()[1]).toHaveTextContent('תוצאה: הפסד');
  });

  it('records a finished game exactly once', async () => {
    render(<App />);
    await loseAtRoundOne();
    advance(3000);
    goTo('אודות');
    goTo('בית');
    setPageVisibility('hidden');
    setPageVisibility('visible');
    dismissEnd();
    goTo('אודות');
    goTo('בית');
    expect(storedResults()).toHaveLength(1);
  });

  it('records once under React Strict Mode', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await loseAtRoundOne();
    advance(1000);
    expect(storedResults()).toHaveLength(1);
  });

  it('pausing, hiding the page or refreshing mid-game adds nothing', async () => {
    const { unmount } = render(<App />);
    await clickStart();
    advance(500);
    goTo('אודות');
    expect(screen.getByText(EMPTY)).toBeInTheDocument();
    goTo('בית');
    await clickResume();
    readSequence(1, 1000);
    goTo('אודות');
    goTo('בית');
    setPageVisibility('hidden');
    setPageVisibility('visible');
    fireEvent(window, new Event('pagehide'));
    advance(10000);
    unmount();
    render(<App />);
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    goTo('אודות');
    expect(screen.getByText(EMPTY)).toBeInTheDocument();
    expect(deleteButton()).not.toBeInTheDocument();
  });

  it('leaving right after the deciding press already shows the result in About', async () => {
    render(<App />);
    await loseAtRoundOne();
    advance(300);
    goTo('אודות');
    expect(cards()).toHaveLength(1);
    goTo('בית');
    expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!');
    expect(storedResults()).toHaveLength(1);
  });

  it('keeps the 10 newest, newest first, and they survive a refresh', async () => {
    for (let rounds = 1; rounds <= 10; rounds++) addResult({ completedRounds: rounds, outcome: rounds === 10 ? 'win' : 'loss' });
    const { unmount } = render(<App />);
    await loseAtRoundOne();
    dismissEnd();
    goTo('אודות');
    const expected = [0, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((n) => `שלבים שהושלמו: ${n}`);
    const texts = () => cards().map((card) => card.querySelector('.history-card__rounds')!.textContent);
    expect(texts()).toEqual(expected);
    unmount();
    render(<App />);
    goTo('אודות');
    expect(texts()).toEqual(expected);
  });

  it('"ביטול" keeps the history', async () => {
    addResult({ completedRounds: 4, outcome: 'loss' });
    const before = localStorage.getItem(HISTORY_KEY);
    render(<App />);
    goTo('אודות');
    fireEvent.click(deleteButton()!);
    const dialog = screen.getByRole('alertdialog', { name: 'למחוק את ההיסטוריה?' });
    expect(dialog).toHaveTextContent('כל תוצאות המשחקים יימחקו.');
    expect(within(dialog).getByRole('button', { name: 'ביטול' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'ביטול' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(cards()).toHaveLength(1);
    expect(localStorage.getItem(HISTORY_KEY)).toBe(before);
  });

  it('"מחק" empties the history and shows the empty state, also after a refresh', async () => {
    addResult({ completedRounds: 4, outcome: 'loss' });
    addResult({ completedRounds: 10, outcome: 'win' });
    const { unmount } = render(<App />);
    goTo('אודות');
    expect(cards()).toHaveLength(2);
    fireEvent.click(deleteButton()!);
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'מחק' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(cards()).toHaveLength(0);
    expect(screen.getByText(EMPTY)).toBeInTheDocument();
    expect(deleteButton()).not.toBeInTheDocument();
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    unmount();
    render(<App />);
    goTo('אודות');
    expect(screen.getByText(EMPTY)).toBeInTheDocument();
  });

  it('a failed save still ends the game normally and says so in the end message', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(fail);
    render(<App />);
    await loseAtRoundOne();
    advance(1000);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('נפסלת!');
    expect(dialog).toHaveTextContent('לא ניתן היה לשמור את התוצאה בהיסטוריה.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'אישור' }));
    goTo('אודות');
    expect(screen.getByText(EMPTY)).toBeInTheDocument();
    goTo('בית');

    setItem.mockRestore();
    await loseAtRoundOne();
    advance(1000);
    expect(screen.getByRole('dialog')).not.toHaveTextContent('לא ניתן היה לשמור');
    expect(storedResults()).toHaveLength(1);
  });

  it('a failed delete says so and keeps the list', async () => {
    addResult({ completedRounds: 4, outcome: 'loss' });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(fail);
    render(<App />);
    goTo('אודות');
    fireEvent.click(deleteButton()!);
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'מחק' }));
    expect(screen.getByRole('alert')).toHaveTextContent('מחיקת ההיסטוריה נכשלה. נסה שוב.');
    expect(cards()).toHaveLength(1);
    expect(deleteButton()).toBeInTheDocument();
    // A new attempt clears the old message
    fireEvent.click(deleteButton()!);
    expect(screen.queryByText('מחיקת ההיסטוריה נכשלה. נסה שוב.')).not.toBeInTheDocument();
  });

  it('blocked storage shows a load message and the game still plays', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(fail);
    render(<App />);
    goTo('אודות');
    expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן לטעון את היסטוריית המשחקים במכשיר זה.');
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
    goTo('בית');
    await clickStart();
    playRounds(2);
    const seq = readSequence(3, 2000);
    press(other(seq[0]));
    advance(1000);
    expect(screen.getByRole('dialog')).toHaveTextContent('שלבים שהושלמו: 2');
  });

  it('corrupt data shows a load message until the next game saves a fresh list', async () => {
    localStorage.setItem(HISTORY_KEY, '{broken');
    render(<App />);
    goTo('אודות');
    expect(screen.getByText('לא ניתן לטעון את היסטוריית המשחקים במכשיר זה.')).toBeInTheDocument();
    goTo('בית');
    await loseAtRoundOne();
    dismissEnd();
    goTo('אודות');
    expect(screen.queryByText('לא ניתן לטעון את היסטוריית המשחקים במכשיר זה.')).not.toBeInTheDocument();
    expect(cards()).toHaveLength(1);
  });
});
