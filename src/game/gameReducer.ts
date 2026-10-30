import type { ColorId } from './colors';
import { MAX_ROUNDS } from './timing';

export type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';

export type GameState = {
  status: GameStatus;
  sequence: ColorId[];
  round: number;
  inputIndex: number;
  completedRounds: number;
  // Increments on every start; identifies a single game
  gameId: number;
  // Increments on every new presentation so stale playback callbacks are ignored
  presentationId: number;
  // Display-only: this presentation follows a completed round (ADR-11)
  roundIntro: boolean;
};

export type GameAction =
  | { type: 'start'; firstColor: ColorId }
  | { type: 'presentationDone'; presentationId: number }
  | { type: 'press'; color: ColorId; nextColor: ColorId }
  | { type: 'dismiss' }
  // Temporary until Milestone 3 replaces it with 'pause'
  | { type: 'abandon' };

export const initialGameState: GameState = {
  status: 'idle',
  sequence: [],
  round: 1,
  inputIndex: 0,
  completedRounds: 0,
  gameId: 0,
  presentationId: 0,
  roundIntro: false,
};

function backToIdle(state: GameState, presentationId = state.presentationId): GameState {
  return { ...initialGameState, gameId: state.gameId, presentationId };
}

// Pure state machine: no audio, timers, storage or randomness (ARCHITECTURE §2.3)
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state;
      return {
        status: 'presenting',
        sequence: [action.firstColor],
        round: 1,
        inputIndex: 0,
        completedRounds: 0,
        gameId: state.gameId + 1,
        presentationId: state.presentationId + 1,
        roundIntro: false,
      };

    case 'presentationDone':
      if (state.status !== 'presenting' || action.presentationId !== state.presentationId) return state;
      return { ...state, status: 'awaitingInput', inputIndex: 0 };

    case 'press': {
      if (state.status !== 'awaitingInput') return state;
      if (action.color !== state.sequence[state.inputIndex]) {
        return { ...state, status: 'lost' };
      }
      const inputIndex = state.inputIndex + 1;
      if (inputIndex < state.sequence.length) return { ...state, inputIndex };
      if (state.round === MAX_ROUNDS) {
        return { ...state, status: 'won', inputIndex, completedRounds: MAX_ROUNDS };
      }
      return {
        ...state,
        status: 'presenting',
        sequence: [...state.sequence, action.nextColor],
        round: state.round + 1,
        inputIndex: 0,
        completedRounds: state.round,
        presentationId: state.presentationId + 1,
        roundIntro: true,
      };
    }

    case 'dismiss':
      if (state.status !== 'won' && state.status !== 'lost') return state;
      return backToIdle(state);

    case 'abandon':
      if (state.status !== 'presenting' && state.status !== 'awaitingInput') return state;
      return backToIdle(state, state.presentationId + 1);
  }
}
