import type { GameResult } from '../history/historyStorage';
import { formatFinishedAt } from '../history/formatFinishedAt';
import './HistoryCard.css';

type Props = {
  result: GameResult;
};

export default function HistoryCard({ result }: Props) {
  const { date, time } = formatFinishedAt(result.finishedAt);
  const won = result.outcome === 'win';
  return (
    <li className="history-card">
      <div className="history-card__main">
        <p className="history-card__rounds">
          שלבים שהושלמו: <bdi>{result.completedRounds}</bdi>
        </p>
        <p className={`history-card__outcome history-card__outcome--${result.outcome}`}>
          תוצאה: {won ? 'ניצחון' : 'הפסד'}
        </p>
      </div>
      <p className="history-card__when" dir="ltr">
        {date} {time}
      </p>
    </li>
  );
}
