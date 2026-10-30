import confetti from 'canvas-confetti';

const BOARD_COLORS = ['#00D26A', '#FF3B30', '#FFD600', '#00A3FF'];

// Win only (PRD §4.2)
export function fireConfetti() {
  const base = { colors: BOARD_COLORS, disableForReducedMotion: true, zIndex: 1000 };
  confetti({ ...base, particleCount: 90, spread: 70, angle: 60, origin: { x: 0, y: 0.55 } });
  confetti({ ...base, particleCount: 90, spread: 70, angle: 120, origin: { x: 1, y: 0.55 } });
}

export function resetConfetti() {
  confetti.reset();
}
