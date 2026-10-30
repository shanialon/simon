import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import type { ColorId } from './game/colors';
import { FLASH_MS, GAP_MS } from './game/timing';
import {
  IDS,
  advance,
  clickResume,
  clickStart,
  expectPaused,
  goTo,
  litPads,
  nav,
  other,
  pad,
  playRounds,
  press,
  readSequence,
  setPageVisibility,
  stage,
} from './test/gameTestUtils';
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
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
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

  it('leaving to About while presenting pauses at once; Home does not resume on its own', async () => {
    render(<App />);
    await clickStart();
    advance(1100);
    expect(litPads()).toHaveLength(1);
    goTo('אודות');
    expect(audio.stopAll).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    goTo('בית');
    expectPaused(1);
    advance(10000);
    expect(litPads()).toEqual([]);
    expect(audio.startTone).toHaveBeenCalledTimes(1);
    expectPaused(1);
  });

  it('"המשך משחק" replays the full sequence of the same round and input restarts from the first color', async () => {
    // Two different colors in round 2, so the second one is a wrong first press
    const colors: ColorId[] = ['red', 'blue', 'green', 'yellow'];
    let i = 0;
    vi.mocked(randomColor).mockImplementation(() => colors[i++ % colors.length]);
    render(<App />);
    await clickStart();
    const seq = playRounds(1);
    const round2 = readSequence(2, 2000);
    expect(round2[0]).toBe(seq[0]);
    // One correct press, still held when leaving
    const stopHeld = vi.fn();
    vi.mocked(audio.startTone).mockReturnValueOnce(stopHeld);
    fireEvent.pointerDown(pad(round2[0]));
    expect(litPads()).toEqual([round2[0]]);
    goTo('אודות');
    expect(stopHeld).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.pointerUp(window);
    goTo('בית');
    expectPaused(2);

    const unlocks = vi.mocked(audio.unlockAudio).mock.calls.length;
    const randoms = vi.mocked(randomColor).mock.calls.length;
    await clickResume();
    expect(audio.unlockAudio).toHaveBeenCalledTimes(unlocks + 1);
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
    expect(readSequence(2, 1000)).toEqual(round2);
    expect(stage()).toBe('שלב 2 מתוך 10');
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    // No new color was drawn for the resumed round
    expect(vi.mocked(randomColor).mock.calls.length).toBe(randoms);

    // The earlier correct press was dropped: the second color is wrong as a first press
    press(round2[1]);
    advance(1000);
    expect(screen.getByRole('dialog')).toHaveTextContent('שלבים שהושלמו: 1');
  });

  it('pausing between rounds keeps the new round', async () => {
    render(<App />);
    await clickStart();
    const seq = playRounds(1);
    advance(500);
    expect(stage()).toBe('שלב 1 מתוך 10');
    goTo('אודות');
    expect(vi.getTimerCount()).toBe(0);
    goTo('בית');
    expectPaused(2);
    await clickResume();
    const round2 = readSequence(2, 1000);
    expect(round2[0]).toBe(seq[0]);
    expect(stage()).toBe('שלב 2 מתוך 10');
  });

  it('hiding the page pauses during presentation and during the player turn; showing it does not resume', async () => {
    render(<App />);
    await clickStart();
    advance(1100);
    setPageVisibility('hidden');
    expect(vi.getTimerCount()).toBe(0);
    expect(litPads()).toEqual([]);
    setPageVisibility('visible');
    advance(5000);
    expectPaused(1);

    await clickResume();
    const [first] = readSequence(1, 1000);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    setPageVisibility('hidden');
    setPageVisibility('visible');
    expectPaused(1);
    await clickResume();
    expect(readSequence(1, 1000)).toEqual([first]);
  });

  it('pagehide pauses an active game', async () => {
    render(<App />);
    await clickStart();
    advance(500);
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(vi.getTimerCount()).toBe(0);
    expectPaused(1);
  });

  it('a cancelled presentation never fires after resume', async () => {
    render(<App />);
    await clickStart();
    playRounds(2);
    // Round 3 presentation: pause halfway, resume right away
    advance(2000 + 900);
    goTo('אודות');
    goTo('בית');
    await clickResume();
    // The old schedule would have ended around now; the new one must not hand over early
    advance(1000 + 3 * FLASH_MS + 2 * GAP_MS - 1);
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    advance(1);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('a double tap on "המשך משחק" starts a single presentation', async () => {
    render(<App />);
    await clickStart();
    advance(500);
    goTo('אודות');
    goTo('בית');
    const unlocks = vi.mocked(audio.unlockAudio).mock.calls.length;
    const button = screen.getByRole('button', { name: 'המשך משחק' });
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(audio.unlockAudio).toHaveBeenCalledTimes(unlocks + 1);
    expect(readSequence(1, 1000)).toHaveLength(1);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('stays paused with a message when audio cannot be unlocked on resume', async () => {
    render(<App />);
    await clickStart();
    advance(500);
    goTo('אודות');
    goTo('בית');
    vi.mocked(audio.unlockAudio).mockResolvedValueOnce(false);
    await clickResume();
    expect(screen.getByText(/לא ניתן להפעיל את הצלילים. לחץ שוב על "המשך משחק"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'המשך משחק' })).toBeInTheDocument();
    advance(5000);
    expect(litPads()).toEqual([]);
    await clickResume();
    expect(screen.queryByText(/לא ניתן להפעיל את הצלילים/)).not.toBeInTheDocument();
    expect(readSequence(1, 1000)).toHaveLength(1);
  });

  it('does not resume if the page was hidden while audio was unlocking', async () => {
    render(<App />);
    await clickStart();
    advance(500);
    goTo('אודות');
    goTo('בית');
    let finish: (ok: boolean) => void = () => {};
    vi.mocked(audio.unlockAudio).mockImplementationOnce(() => new Promise((r) => (finish = r)));
    fireEvent.click(screen.getByRole('button', { name: 'המשך משחק' }));
    setPageVisibility('hidden');
    await act(async () => finish(true));
    setPageVisibility('visible');
    expectPaused(1);
  });

  it('a paused game is not a loss', async () => {
    render(<App />);
    await clickStart();
    readSequence(1, 1000);
    goTo('אודות');
    advance(5000);
    goTo('בית');
    advance(5000);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(audio.playLose).not.toHaveBeenCalled();
    expectPaused(1);
  });

  it('there is no "המשך משחק" before a game starts', () => {
    render(<App />);
    goTo('אודות');
    goTo('בית');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
    setPageVisibility('hidden');
    setPageVisibility('visible');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });

  it('a refresh still resets a paused game', async () => {
    const { unmount } = render(<App />);
    await clickStart();
    advance(500);
    goTo('אודות');
    unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(stage()).toBe('שלב 1 מתוך 10');
  });

  it('hiding the page during the delay before the end message shows it on return, once', async () => {
    render(<App />);
    await clickStart();
    const [first] = readSequence(1, 1000);
    press(other(first));
    advance(400);
    setPageVisibility('hidden');
    advance(2000);
    expect(audio.playLose).not.toHaveBeenCalled();
    setPageVisibility('visible');
    expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!');
    expect(audio.playLose).toHaveBeenCalledTimes(1);
    setPageVisibility('hidden');
    setPageVisibility('visible');
    goTo('אודות');
    goTo('בית');
    expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!');
    expect(audio.playLose).toHaveBeenCalledTimes(1);
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
