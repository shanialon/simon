import { COLORS, type ColorId } from './colors';
import { gameReducer, initialGameState, type GameState } from './gameReducer';

function started(firstColor: ColorId = 'green') {
  const s = gameReducer(initialGameState, { type: 'start', firstColor });
  return gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId });
}

// Replays the whole sequence correctly; returns the state after the last press
function completeRound(state: GameState, nextColor: ColorId) {
  let s = state;
  for (const color of state.sequence) s = gameReducer(s, { type: 'press', color, nextColor });
  return s;
}

function toInput(state: GameState) {
  return gameReducer(state, { type: 'presentationDone', presentationId: state.presentationId });
}

function wrongColor(color: ColorId): ColorId {
  return COLORS.find((c) => c.id !== color)!.id;
}

describe('gameReducer', () => {
  it('starts a game with a one-color sequence at round 1', () => {
    const s = gameReducer(initialGameState, { type: 'start', firstColor: 'red' });
    expect(s).toMatchObject({ status: 'presenting', sequence: ['red'], round: 1, completedRounds: 0, inputIndex: 0 });
    expect(s.gameId).toBe(1);
  });

  it('ignores actions that are not valid in the current status', () => {
    expect(gameReducer(initialGameState, { type: 'press', color: 'red', nextColor: 'red' })).toBe(initialGameState);
    expect(gameReducer(initialGameState, { type: 'dismiss' })).toBe(initialGameState);
    const presenting = gameReducer(initialGameState, { type: 'start', firstColor: 'red' });
    expect(gameReducer(presenting, { type: 'start', firstColor: 'blue' })).toBe(presenting);
  });

  it('ignores presses while presenting', () => {
    const presenting = gameReducer(initialGameState, { type: 'start', firstColor: 'red' });
    expect(gameReducer(presenting, { type: 'press', color: 'red', nextColor: 'red' })).toBe(presenting);
    expect(gameReducer(presenting, { type: 'press', color: 'blue', nextColor: 'red' })).toBe(presenting);
  });

  it('ignores a stale presentationDone', () => {
    const presenting = gameReducer(initialGameState, { type: 'start', firstColor: 'red' });
    const stale = { type: 'presentationDone', presentationId: presenting.presentationId - 1 } as const;
    expect(gameReducer(presenting, stale)).toBe(presenting);
  });

  it('a correct press only advances the input index', () => {
    let s = started('red');
    s = toInput(completeRound(s, 'red')); // round 2: red, red (repeat allowed)
    s = gameReducer(s, { type: 'press', color: 'red', nextColor: 'blue' });
    expect(s).toMatchObject({ status: 'awaitingInput', round: 2, inputIndex: 1, sequence: ['red', 'red'] });
  });

  it('grows the sequence by one color per round, keeping the previous one as a prefix', () => {
    const next: ColorId[] = ['blue', 'blue', 'yellow', 'green', 'red', 'yellow', 'blue', 'green', 'red'];
    let s = started('green');
    let previous = s.sequence;
    for (let round = 1; round < 10; round++) {
      expect(s.round).toBe(round);
      expect(s.sequence).toHaveLength(round);
      expect(s.sequence.slice(0, previous.length)).toEqual(previous);
      previous = s.sequence;
      s = completeRound(s, next[round - 1]);
      expect(s).toMatchObject({ status: 'presenting', roundIntro: true, completedRounds: round });
      s = toInput(s);
    }
    expect(s.round).toBe(10);
    expect(s.sequence).toHaveLength(10);
  });

  it('loses at round 1 with 0 completed rounds', () => {
    const s = gameReducer(started('red'), { type: 'press', color: 'blue', nextColor: 'red' });
    expect(s).toMatchObject({ status: 'lost', completedRounds: 0, round: 1 });
  });

  it('loses at an advanced round with round - 1 completed rounds, even mid-sequence', () => {
    let s = started('red');
    for (let i = 0; i < 4; i++) s = toInput(completeRound(s, 'green'));
    expect(s.round).toBe(5);
    s = gameReducer(s, { type: 'press', color: s.sequence[0], nextColor: 'red' });
    s = gameReducer(s, { type: 'press', color: wrongColor(s.sequence[1]), nextColor: 'red' });
    expect(s).toMatchObject({ status: 'lost', completedRounds: 4, round: 5 });
    // No retry after a mistake
    expect(gameReducer(s, { type: 'press', color: s.sequence[1], nextColor: 'red' })).toBe(s);
  });

  it('wins after completing round 10 and never reaches round 11', () => {
    let s = started('yellow');
    for (let i = 0; i < 9; i++) s = toInput(completeRound(s, 'blue'));
    s = completeRound(s, 'red');
    expect(s).toMatchObject({ status: 'won', completedRounds: 10, round: 10 });
    expect(s.sequence).toHaveLength(10);
    expect(gameReducer(s, { type: 'press', color: 'red', nextColor: 'red' })).toBe(s);
    expect(gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId })).toBe(s);
  });

  it('dismiss returns to idle and the next start is a new game', () => {
    const lost = gameReducer(started('red'), { type: 'press', color: 'blue', nextColor: 'red' });
    const idle = gameReducer(lost, { type: 'dismiss' });
    expect(idle).toMatchObject({ status: 'idle', sequence: [], round: 1, completedRounds: 0 });
    const again = gameReducer(idle, { type: 'start', firstColor: 'green' });
    expect(again.gameId).toBe(lost.gameId + 1);
    expect(again.sequence).toEqual(['green']);
  });

  it('pause keeps the sequence and round, drops partial input and invalidates the presentation', () => {
    const presenting = gameReducer(initialGameState, { type: 'start', firstColor: 'red' });
    const paused = gameReducer(presenting, { type: 'pause' });
    expect(paused).toMatchObject({ status: 'paused', sequence: ['red'], round: 1, inputIndex: 0, gameId: presenting.gameId });
    expect(paused.presentationId).toBe(presenting.presentationId + 1);
    // The cancelled playback finishing later changes nothing
    expect(gameReducer(paused, { type: 'presentationDone', presentationId: presenting.presentationId })).toBe(paused);

    let s = toInput(completeRound(started('red'), 'blue')); // round 2: red, blue
    s = gameReducer(s, { type: 'press', color: 'red', nextColor: 'green' });
    expect(s.inputIndex).toBe(1);
    const pausedMid = gameReducer(s, { type: 'pause' });
    expect(pausedMid).toMatchObject({
      status: 'paused',
      sequence: ['red', 'blue'],
      round: 2,
      completedRounds: 1,
      inputIndex: 0,
    });
  });

  it('ignores presses, start and dismiss while paused', () => {
    const paused = gameReducer(started('red'), { type: 'pause' });
    expect(gameReducer(paused, { type: 'press', color: 'red', nextColor: 'red' })).toBe(paused);
    expect(gameReducer(paused, { type: 'start', firstColor: 'blue' })).toBe(paused);
    expect(gameReducer(paused, { type: 'dismiss' })).toBe(paused);
    expect(gameReducer(paused, { type: 'pause' })).toBe(paused);
  });

  it('resume replays the same round as a new presentation, only once', () => {
    let s = toInput(completeRound(started('red'), 'blue'));
    s = gameReducer(s, { type: 'press', color: 'red', nextColor: 'green' });
    const paused = gameReducer(s, { type: 'pause' });
    const resumed = gameReducer(paused, { type: 'resume' });
    expect(resumed).toMatchObject({
      status: 'presenting',
      sequence: ['red', 'blue'],
      round: 2,
      completedRounds: 1,
      inputIndex: 0,
      roundIntro: false,
    });
    expect(resumed.presentationId).toBe(paused.presentationId + 1);
    expect(gameReducer(resumed, { type: 'resume' })).toBe(resumed);
    // Input starts again from the first color
    const input = toInput(resumed);
    expect(gameReducer(input, { type: 'press', color: 'blue', nextColor: 'red' }).status).toBe('lost');
  });

  it('pausing during the round intro keeps the new round', () => {
    const intro = completeRound(started('red'), 'blue');
    expect(intro).toMatchObject({ status: 'presenting', roundIntro: true, round: 2 });
    const paused = gameReducer(intro, { type: 'pause' });
    expect(paused).toMatchObject({ status: 'paused', round: 2, sequence: ['red', 'blue'], completedRounds: 1, roundIntro: false });
    expect(gameReducer(paused, { type: 'resume' }).roundIntro).toBe(false);
  });

  it('pause does not apply before a game or after it ended; resume only from paused', () => {
    expect(gameReducer(initialGameState, { type: 'pause' })).toBe(initialGameState);
    const lost = gameReducer(started('red'), { type: 'press', color: 'blue', nextColor: 'red' });
    expect(gameReducer(lost, { type: 'pause' })).toBe(lost);
    let won = started('yellow');
    for (let i = 0; i < 9; i++) won = toInput(completeRound(won, 'blue'));
    won = completeRound(won, 'red');
    expect(gameReducer(won, { type: 'pause' })).toBe(won);
    const awaiting = started('red');
    expect(gameReducer(initialGameState, { type: 'resume' })).toBe(initialGameState);
    expect(gameReducer(awaiting, { type: 'resume' })).toBe(awaiting);
    expect(gameReducer(lost, { type: 'resume' })).toBe(lost);
  });

  it('uses a distinct tone per color', () => {
    expect(new Set(COLORS.map((c) => c.tone)).size).toBe(4);
  });
});
