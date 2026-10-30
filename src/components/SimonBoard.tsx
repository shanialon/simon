import type { KeyboardEvent, PointerEvent } from 'react';
import { COLORS, type ColorId } from '../game/colors';
import './SimonBoard.css';

type Props = {
  litColor?: ColorId | null;
  // Unlit pads are dimmed while the sequence is presented
  dimmed?: boolean;
  inputEnabled?: boolean;
  onPressStart?: (color: ColorId) => void;
  onPressEnd?: () => void;
};

export default function SimonBoard({
  litColor = null,
  dimmed = false,
  inputEnabled = false,
  onPressStart,
  onPressEnd,
}: Props) {
  // Input starts on pointerdown, not click, so touch feedback has no delay (ADR-2)
  function handlePointerDown(e: PointerEvent<HTMLButtonElement>, color: ColorId) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    onPressStart?.(color);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, color: ColorId) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!e.repeat) onPressStart?.(color);
  }

  function handleKeyUp(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onPressEnd?.();
  }

  return (
    <div className="simon-board">
      {COLORS.map(({ id, label, area }) => {
        const lit = litColor === id;
        const classes = [
          'simon-board__pad',
          `simon-board__pad--${id}`,
          `simon-board__pad--${area}`,
          lit && 'is-lit',
          dimmed && !lit && 'is-dim',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={id}
            type="button"
            className={classes}
            aria-label={label}
            disabled={!inputEnabled}
            onPointerDown={(e) => handlePointerDown(e, id)}
            onKeyDown={(e) => handleKeyDown(e, id)}
            onKeyUp={handleKeyUp}
            onContextMenu={(e) => e.preventDefault()}
          />
        );
      })}
      <div className="simon-board__center" aria-hidden="true" />
    </div>
  );
}
