import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { playLose, playWin, startTone, stopAll, unlockAudio } from '../audio/audio';
import { fireConfetti, resetConfetti } from '../effects/confetti';
import type { ColorId } from './colors';
import { gameReducer, initialGameState, type GameAction } from './gameReducer';
import { randomColor } from './random';
import {
  END_DELAY_MS,
  FLASH_MS,
  GAP_MS,
  LEAD_IN_MS,
  NEXT_ROUND_LEAD_MS,
  PRESS_MIN_MS,
  ROUND_DONE_HOLD_MS,
} from './timing';

type ActivePress = {
  color: ColorId;
  stop: () => void;
  released: boolean;
  minElapsed: boolean;
  timer: number;
};

// Lives in App so switching screens does not unmount the game (ADR-2)
export function useGame(homeVisible: boolean) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  // Synchronous mirror of the reducer state so rapid events see the latest status
  const stateRef = useRef(state);
  const [litColor, setLitColor] = useState<ColorId | null>(null);
  // presentationId whose "completed round" hold has ended (ADR-11)
  const [introDoneFor, setIntroDoneFor] = useState<number | null>(null);
  const [audioError, setAudioError] = useState(false);
  // gameId whose end delay has passed (or was interrupted by leaving Home)
  const [endDueFor, setEndDueFor] = useState<number | null>(null);
  const pressRef = useRef<ActivePress | null>(null);
  const startingRef = useRef(false);
  const endFeedbackForRef = useRef<number | null>(null);

  const apply = useCallback((action: GameAction) => {
    const next = gameReducer(stateRef.current, action);
    if (next === stateRef.current) return false;
    stateRef.current = next;
    dispatch(action);
    return true;
  }, []);

  const finishPress = useCallback((press: ActivePress) => {
    window.clearTimeout(press.timer);
    press.stop();
    setLitColor((current) => (current === press.color ? null : current));
    if (pressRef.current === press) pressRef.current = null;
  }, []);

  const pressEnd = useCallback(() => {
    const press = pressRef.current;
    if (!press) return;
    press.released = true;
    if (press.minElapsed) finishPress(press);
  }, [finishPress]);

  const pressStart = useCallback(
    (color: ColorId) => {
      if (stateRef.current.status !== 'awaitingInput') return;
      if (pressRef.current) finishPress(pressRef.current);
      const press: ActivePress = { color, stop: startTone(color), released: false, minElapsed: false, timer: 0 };
      press.timer = window.setTimeout(() => {
        press.minElapsed = true;
        if (press.released) finishPress(press);
      }, PRESS_MIN_MS);
      pressRef.current = press;
      setLitColor(color);
      apply({ type: 'press', color, nextColor: randomColor() });
    },
    [apply, finishPress],
  );

  // The pad may become disabled before the finger lifts, so listen on window
  useEffect(() => {
    window.addEventListener('pointerup', pressEnd);
    window.addEventListener('pointercancel', pressEnd);
    return () => {
      window.removeEventListener('pointerup', pressEnd);
      window.removeEventListener('pointercancel', pressEnd);
    };
  }, [pressEnd]);

  // Called directly from the "התחל משחק" click so audio unlocks inside the gesture
  const startGame = useCallback(async () => {
    if (stateRef.current.status !== 'idle' || startingRef.current) return;
    startingRef.current = true;
    const ok = await unlockAudio();
    startingRef.current = false;
    if (!ok) {
      // Never run a silent game as if sound had played
      setAudioError(true);
      return;
    }
    setAudioError(false);
    apply({ type: 'start', firstColor: randomColor() });
  }, [apply]);

  const dismiss = useCallback(() => {
    apply({ type: 'dismiss' });
  }, [apply]);

  // Temporary (Milestone 2): leaving Home cancels an active game; Milestone 3 pauses instead
  const abandon = useCallback(() => {
    const { status } = stateRef.current;
    if (status !== 'presenting' && status !== 'awaitingInput') return;
    if (pressRef.current) finishPress(pressRef.current);
    stopAll();
    setLitColor(null);
    apply({ type: 'abandon' });
  }, [apply, finishPress]);

  // Sequence controller: one schedule per presentationId; cleanup cancels every timer and tone
  const { status, presentationId } = state;
  useEffect(() => {
    if (status !== 'presenting') return;
    const { sequence, roundIntro } = stateRef.current;
    const timers: number[] = [];
    let stopTone: (() => void) | null = null;
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    let t: number;
    if (roundIntro) {
      at(ROUND_DONE_HOLD_MS, () => setIntroDoneFor(presentationId));
      t = ROUND_DONE_HOLD_MS + NEXT_ROUND_LEAD_MS;
    } else {
      t = LEAD_IN_MS;
    }
    sequence.forEach((color, i) => {
      at(t, () => {
        setLitColor(color);
        stopTone = startTone(color);
      });
      t += FLASH_MS;
      at(t, () => {
        setLitColor(null);
        stopTone?.();
        stopTone = null;
      });
      if (i < sequence.length - 1) t += GAP_MS;
    });
    at(t, () => apply({ type: 'presentationDone', presentationId }));

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      stopTone?.();
      setLitColor(null);
    };
  }, [status, presentationId, apply]);

  // End of game: the result is final at once; the message waits END_DELAY_MS (ADR-10)
  const { gameId } = state;
  const ended = status === 'won' || status === 'lost';
  const endDue = ended && endDueFor === gameId;
  useEffect(() => {
    if (!ended || endDue) return;
    if (!homeVisible) {
      // Left during the delay: show the message as soon as Home is back
      setEndDueFor(gameId);
      return;
    }
    const id = window.setTimeout(() => setEndDueFor(gameId), END_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [ended, endDue, homeVisible, gameId]);

  const endMessageShown = endDue && homeVisible;
  useEffect(() => {
    if (!endMessageShown) return;
    // Sound and confetti play once per game, even if Home is left and revisited
    if (endFeedbackForRef.current === gameId) return;
    endFeedbackForRef.current = gameId;
    if (status === 'won') {
      playWin();
      fireConfetti();
    } else {
      playLose();
    }
  }, [endMessageShown, status, gameId]);

  // Confetti is cleared when leaving the win state
  useEffect(() => {
    if (status !== 'won') return;
    return () => resetConfetti();
  }, [status]);

  // Cancel everything on unmount
  useEffect(
    () => () => {
      if (pressRef.current) finishPress(pressRef.current);
      stopAll();
    },
    [finishPress],
  );

  return {
    state,
    litColor,
    // Computed during render so the next round number never flashes early
    displayRound:
      status === 'presenting' && state.roundIntro && introDoneFor !== presentationId ? state.round - 1 : state.round,
    endMessageShown,
    audioError,
    startGame,
    pressStart,
    pressEnd,
    dismiss,
    abandon,
  };
}

export type Game = ReturnType<typeof useGame>;
