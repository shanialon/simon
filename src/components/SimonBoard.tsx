import { COLORS } from '../game/colors';
import './SimonBoard.css';

export default function SimonBoard() {
  return (
    <div className="simon-board">
      {COLORS.map(({ id, label, area }) => (
        <button
          key={id}
          type="button"
          className={`simon-board__pad simon-board__pad--${id} simon-board__pad--${area}`}
          aria-label={label}
        />
      ))}
      <div className="simon-board__center" aria-hidden="true" />
    </div>
  );
}
