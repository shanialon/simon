import { COLORS, type ColorId } from './colors';

// Game randomness only; no cryptographic RNG needed
export function randomColor(): ColorId {
  return COLORS[Math.floor(Math.random() * COLORS.length)].id;
}
