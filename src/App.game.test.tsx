import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { COLORS, type ColorId } from './game/colors';
import { FLASH_MS, GAP_MS } from './game/timing';
import * as audio from './audio/audio';
import * as confetti from './effects/confetti';
import { randomColor } from './game/random';

vi.mock('./audio/audio', () => ({
  unlockAudio: vi.fn(async () => true),
  startTone: vi.fn(() => vi.fn()),
  playWin: vi.fn(),
  playLose: vi.fn(),
  stopAll: vi.fn(),
}));
vi.mock('./effects/confetti', () => ({ fireConfetti: vi.fn(), resetConfetti: vi.fn() }));
vi.mock('./game/random', () => ({ randomColor: vi.fn() }));

const IDS = COLORS.map((c) => c.id);
const labelOf = (id: ColorId) => COLORS.find((c) => c.id === id)!.label;
const pad = (id: ColorId) => screen.getByRole('button', { name: labelOf(id) });
const litPads = () => IDS.filter((id) => pad(id).classList.contains('is-lit'));
const stage = () => screen.getByText((_, el) => el?.classList.contains('home-screen__stage') ?? false).textContent;
const nav = () => screen.getByRole('navigation', { name: 'ניווט ראשי' });
const other = (id: ColorId) => IDS.find((c) => c !== id)!;

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

async function clickStart() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
  });
}

function press(id: ColorId) {
  fireEvent.pointerDown(pad(id));
  fireEvent.pointerUp(window);
}

// Watches a presentation, checking the fixed pace, and returns the colors shown
function readSequence(length: number, leadMs: number): ColorId[] {
  advance(leadMs - 1);
  expect(litPads()).toEqual([]);
  advance(1);
  const seq: ColorId[] = [];
  for (let i = 0; i < length; i++) {
    const lit = litPads();
    expect(lit).toHaveLength(1);
    seq.push(lit[0]);
    advance(FLASH_MS - 1);
    expect(litPads()).toEqual([seq[i]]);
    advance(1);
    expect(litPads()).toEqual([]);
    if (i < length - 1) {
      advance(GAP_MS - 1);
      expect(litPads()).toEqual([]);
      advance(1);
    }
  }
  return seq;
}

// Plays rounds 1..count correctly; returns the sequence of the last round played
function playRounds(count: number) {
  let seq: ColorId[] = [];
  for (let round = 1; round <= count; round++) {
    const next = readSequence(round, round === 1 ? 1000 : 2000);
    expect(next.slice(0, seq.length)).toEqual(seq);
    seq = next;
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    seq.forEach(press);
  }
  return seq;
}

describe('Game', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Cycle through colors with repeats so sequences vary
    const cycle: ColorId[] = ['red', 'red', 'blue', 'green', 'yellow', 'green', 'blue'];
    let i = 0;
    vi.mocked(randomColor).mockImplementation(() => cycle[i++ % cycle.length]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with one color, blocks input while presenting, then hands over to the player', async () => {
    render(<App />);
    await clickStart();
    expect(audio.unlockAudio).toHaveBeenCalledTimes(1);
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(stage()).toBe('שלב 1 מתוך 10');
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();
    for (const id of IDS) expect(pad(id)).toBeDisabled();

    // A wrong press during presentation has no effect
    advance(500);
    fireEvent.pointerDown(pad('blue'));
    fireEvent.pointerUp(window);

    const [first] = readSequence(1, 500);
    expect(audio.startTone).toHaveBeenCalledWith(first);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    expect(screen.getByText('הקש על הצבעים לפי הסדר')).toBeInTheDocument();
    for (const id of IDS) expect(pad(id)).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a player press lights the pad with its tone for at least 300ms', async () => {
    render(<App />);
    await clickStart();
    const [first] = readSequence(1, 1000);
    vi.mocked(audio.startTone).mockClear();
    fireEvent.pointerDown(pad(first));
    expect(audio.startTone).toHaveBeenCalledWith(first);
    expect(litPads()).toEqual([first]);
    fireEvent.pointerUp(window);
    advance(299);
    expect(litPads()).toEqual([first]);
    advance(1);
    expect(litPads()).toEqual([]);
  });

  it('keeps the completed round on screen for 1s, then shows the next round', async () => {
    render(<App />);
    await clickStart();
    const seq = readSequence(1, 1000);
    seq.forEach(press);
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(stage()).toBe('שלב 1 מתוך 10');
    advance(999);
    expect(stage()).toBe('שלב 1 מתוך 10');
    advance(1);
    expect(stage()).toBe('שלב 2 מתוך 10');
    const next = readSequence(2, 1000);
    expect(next[0]).toBe(seq[0]);
  });

  it('loses at round 1 with 0 completed rounds: pad tone now, lose sound and message 1s later', async () => {
    render(<App />);
    await clickStart();
    const [first] = readSequence(1, 1000);
    vi.mocked(audio.startTone).mockClear();
    press(other(first));
    expect(audio.startTone).toHaveBeenCalledWith(other(first));
    advance(999);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(audio.playLose).not.toHaveBeenCalled();
    advance(1);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('נפסלת!')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('שלבים שהושלמו: 0');
    expect(audio.playLose).toHaveBeenCalledTimes(1);
    expect(audio.playWin).not.toHaveBeenCalled();
    expect(confetti.fireConfetti).not.toHaveBeenCalled();
    expect(stage()).toBe('שלב 1 מתוך 10');
  });

  it('loses at an advanced round with the number of completed rounds', async () => {
    render(<App />);
    await clickStart();
    playRounds(3);
    const seq = readSequence(4, 2000);
    press(seq[0]);
    press(other(seq[1]));
    advance(1000);
    expect(screen.getByRole('dialog')).toHaveTextContent('שלבים שהושלמו: 3');
    expect(stage()).toBe('שלב 4 מתוך 10');
  });

  it('wins after round 10 with sound and confetti; "אישור" returns to start and a new game gets a new sequence', async () => {
    render(<App />);
    await clickStart();
    const seq = playRounds(10);
    expect(seq).toHaveLength(10);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    advance(999);
    expect(audio.playWin).not.toHaveBeenCalled();
    advance(1);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('כל הכבוד! ניצחת!');
    expect(dialog).toHaveTextContent('שלבים שהושלמו: 10');
    expect(audio.playWin).toHaveBeenCalledTimes(1);
    expect(confetti.fireConfetti).toHaveBeenCalledTimes(1);
    expect(audio.playLose).not.toHaveBeenCalled();
    expect(stage()).toBe('שלב 10 מתוך 10');
    // No round 11
    advance(10000);
    expect(stage()).toBe('שלב 10 מתוך 10');
    expect(litPads()).toEqual([]);

    fireEvent.click(within(dialog).getByRole('button', { name: 'אישור' }));
    expect(confetti.resetConfetti).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(stage()).toBe('שלב 1 מתוך 10');
    advance(5000);
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();

    const calls = vi.mocked(randomColor).mock.calls.length;
    await clickStart();
    expect(vi.mocked(randomColor).mock.calls.length).toBe(calls + 1);
    expect(readSequence(1, 1000)).toHaveLength(1);
  });

  it('does not start a silent game when audio cannot be unlocked', async () => {
    vi.mocked(audio.unlockAudio).mockResolvedValueOnce(false);
    render(<App />);
    await clickStart();
    expect(screen.getByText(/לא ניתן להפעיל את הצלילים/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    advance(5000);
    expect(audio.startTone).not.toHaveBeenCalled();

    await clickStart();
    expect(screen.queryByText(/לא ניתן להפעיל את הצלילים/)).not.toBeInTheDocument();
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  it('leaving to About while presenting cancels the game with no light, sound or timer left', async () => {
    render(<App />);
    await clickStart();
    advance(1100);
    expect(litPads()).toHaveLength(1);
    fireEvent.click(within(nav()).getByRole('button', { name: 'אודות' }));
    expect(audio.stopAll).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(within(nav()).getByRole('button', { name: 'בית' }));
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(stage()).toBe('שלב 1 מתוך 10');
    expect(litPads()).toEqual([]);
  });

  it('leaving to About during the player turn cancels the game', async () => {
    render(<App />);
    await clickStart();
    const seq = playRounds(1);
    readSequence(2, 2000);
    fireEvent.pointerDown(pad(seq[0]));
    fireEvent.click(within(nav()).getByRole('button', { name: 'אודות' }));
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(within(nav()).getByRole('button', { name: 'בית' }));
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(litPads()).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaving during the delay before the end message shows it right away on return', async () => {
    render(<App />);
    await clickStart();
    const [first] = readSequence(1, 1000);
    press(other(first));
    advance(400);
    fireEvent.click(within(nav()).getByRole('button', { name: 'אודות' }));
    advance(2000);
    expect(audio.playLose).not.toHaveBeenCalled();
    fireEvent.click(within(nav()).getByRole('button', { name: 'בית' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!');
    expect(audio.playLose).toHaveBeenCalledTimes(1);
  });
});
