import { act, fireEvent, screen, within } from '@testing-library/react';
import { COLORS, type ColorId } from '../game/colors';
import { FLASH_MS, GAP_MS } from '../game/timing';

// Shared helpers for integration tests that drive a full game with fake timers

export const IDS = COLORS.map((c) => c.id);
export const labelOf = (id: ColorId) => COLORS.find((c) => c.id === id)!.label;
export const pad = (id: ColorId) => screen.getByRole('button', { name: labelOf(id) });
export const litPads = () => IDS.filter((id) => pad(id).classList.contains('is-lit'));
export const stage = () => screen.getByText((_, el) => el?.classList.contains('home-screen__stage') ?? false).textContent;
export const nav = () => screen.getByRole('navigation', { name: 'ניווט ראשי' });
export const other = (id: ColorId) => IDS.find((c) => c !== id)!;

export function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

export async function clickStart() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
  });
}

export async function clickResume() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'המשך משחק' }));
  });
}

export function goTo(name: 'בית' | 'אודות') {
  fireEvent.click(within(nav()).getByRole('button', { name }));
}

export function setPageVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

// Paused Home view: dimmed board, no input, only "המשך משחק"
export function expectPaused(round: number) {
  expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'המשך משחק' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();
  expect(stage()).toBe(`שלב ${round} מתוך 10`);
  expect(litPads()).toEqual([]);
  for (const id of IDS) {
    expect(pad(id)).toBeDisabled();
    expect(pad(id)).toHaveClass('is-dim');
  }
}

export function press(id: ColorId) {
  fireEvent.pointerDown(pad(id));
  fireEvent.pointerUp(window);
}

// Watches a presentation, checking the fixed pace, and returns the colors shown
export function readSequence(length: number, leadMs: number): ColorId[] {
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
export function playRounds(count: number) {
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
