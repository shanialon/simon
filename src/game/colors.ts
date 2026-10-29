export type ColorId = 'green' | 'red' | 'yellow' | 'blue';
export type BoardArea = 'tl' | 'tr' | 'bl' | 'br';

export type BoardColor = {
  id: ColorId;
  label: string;
  area: BoardArea;
};

// Spatial order on the board (does not flip in RTL): top-left, top-right, bottom-left, bottom-right
export const COLORS: readonly BoardColor[] = [
  { id: 'green', label: 'ירוק', area: 'tl' },
  { id: 'red', label: 'אדום', area: 'tr' },
  { id: 'yellow', label: 'צהוב', area: 'bl' },
  { id: 'blue', label: 'כחול', area: 'br' },
];
