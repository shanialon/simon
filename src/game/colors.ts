export type ColorId = 'green' | 'red' | 'yellow' | 'blue';
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
  { id: 'green', label: 'ירוק', area: 'tl', tone: 415 },
  { id: 'red', label: 'אדום', area: 'tr', tone: 310 },
  { id: 'yellow', label: 'צהוב', area: 'bl', tone: 252 },
  { id: 'blue', label: 'כחול', area: 'br', tone: 209 },
];
