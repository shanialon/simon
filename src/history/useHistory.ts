import { useCallback, useState } from 'react';
import { addResult, clearHistory, loadHistory, type GameResult } from './historyStorage';

// Lives in App next to useGame; the list shows only what was actually stored (ADR-13)
export function useHistory() {
  const [initial] = useState(loadHistory);
  const [results, setResults] = useState<GameResult[]>(initial.ok ? initial.results : []);
  const [loadFailed, setLoadFailed] = useState(!initial.ok);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const record = useCallback((input: Pick<GameResult, 'completedRounds' | 'outcome'>) => {
    const saved = addResult(input);
    if (!saved.ok) return false;
    setResults(saved.results);
    // A fresh valid list now exists
    setLoadFailed(false);
    return true;
  }, []);

  const clear = useCallback(() => {
    const ok = clearHistory();
    setDeleteFailed(!ok);
    // On failure the list stays on screen
    if (ok) setResults([]);
    return ok;
  }, []);

  const resetDeleteError = useCallback(() => setDeleteFailed(false), []);

  return { results, loadFailed, deleteFailed, record, clear, resetDeleteError };
}

export type History = ReturnType<typeof useHistory>;
