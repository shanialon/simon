import { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

// Delete-history confirmation (DESIGN §1.3): a layer over About, not a screen
export default function ConfirmDialog({ onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the safe choice first
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="confirm-dialog__scrim">
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-text"
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          למחוק את ההיסטוריה?
        </h2>
        <p id="confirm-dialog-text" className="confirm-dialog__text">
          כל תוצאות המשחקים יימחקו.
        </p>
        <div className="confirm-dialog__actions">
          <button type="button" className="confirm-dialog__btn confirm-dialog__btn--delete" onClick={onConfirm}>
            מחק
          </button>
          <button
            ref={cancelRef}
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={onCancel}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
