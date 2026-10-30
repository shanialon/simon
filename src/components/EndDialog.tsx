import { useEffect, useRef } from 'react';
import './EndDialog.css';

type Props = {
  outcome: 'win' | 'loss';
  completedRounds: number;
  onConfirm: () => void;
};

export default function EndDialog({ outcome, completedRounds, onConfirm }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  const won = outcome === 'win';
  return (
    <div className="end-dialog" role="dialog" aria-modal="true" aria-labelledby="end-dialog-title">
      <h2 id="end-dialog-title" className={`end-dialog__title end-dialog__title--${outcome}`}>
        {won ? (
          <>
            <span className="end-dialog__accent">כל הכבוד!</span> ניצחת!
          </>
        ) : (
          'נפסלת!'
        )}
      </h2>
      <p className="end-dialog__detail">
        שלבים שהושלמו: <bdi>{completedRounds}</bdi>
      </p>
      <button ref={confirmRef} type="button" className="btn-primary end-dialog__confirm" onClick={onConfirm}>
        אישור
      </button>
    </div>
  );
}
