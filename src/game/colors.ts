export type ColorId = 'pink' | 'rose' | 'caramel' | 'brown';
export type BoardArea = 'tl' | 'tr' | 'bl' | 'br';

export type BoardColor = {
  id: ColorId;
  label: string;
  area: BoardArea;
  // Tone frequency in Hz, distinct per color
  tone: number;
};

// Spatial order on the board (does not flip in RTL): top-left, top-right, bottom-left, bottom-right
export const COLORS: readonly BoardColor[] = [
  { id: 'pink', label: 'ורוד', area: 'tl', tone: 415 },
  { id: 'rose', label: 'פטל', area: 'tr', tone: 310 },
  { id: 'caramel', label: 'קרמל', area: 'bl', tone: 252 },
  { id: 'brown', label: 'חום', area: 'br', tone: 209 },
];
