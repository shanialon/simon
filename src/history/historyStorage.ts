// Pure history repository (ADR-4): no React, never throws
export type GameResult = {
  id: string;
  // ISO 8601; formatted for display only when shown
  finishedAt: string;
  completedRounds: number;
  outcome: 'win' | 'loss';
};

type HistoryData = { schemaVersion: 1; results: GameResult[] };

export type LoadResult = { ok: true; results: GameResult[] } | { ok: false };

export const HISTORY_KEY = 'simon.history.v1';
export const MAX_HISTORY = 10;

function isResult(value: unknown): value is GameResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    r.id !== '' &&
    typeof r.finishedAt === 'string' &&
    !Number.isNaN(Date.parse(r.finishedAt)) &&
    Number.isInteger(r.completedRounds) &&
    (r.completedRounds as number) >= 0 &&
    (r.completedRounds as number) <= 10 &&
    (r.outcome === 'win' || r.outcome === 'loss')
  );
}

export function loadHistory(): LoadResult {
  try {
    // Accessing localStorage itself can throw when storage is blocked
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (raw === null) return { ok: true, results: [] };
    const data = JSON.parse(raw) as Partial<HistoryData> | null;
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.results)) return { ok: false };
    // Invalid entries are dropped rather than failing the whole list
    return { ok: true, results: data.results.filter(isResult).slice(0, MAX_HISTORY) };
  } catch {
    return { ok: false };
  }
}

// Not crypto.randomUUID: it is unavailable on insecure HTTP origins (ADR-4)
function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Newest first, max 10; unreadable data is replaced by a fresh valid list
export function addResult(input: Pick<GameResult, 'completedRounds' | 'outcome'>): LoadResult {
  const current = loadHistory();
  const result: GameResult = { id: newId(), finishedAt: new Date().toISOString(), ...input };
  const results = [result, ...(current.ok ? current.results : [])].slice(0, MAX_HISTORY);
  const data: HistoryData = { schemaVersion: 1, results };
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
    return { ok: true, results };
  } catch {
    return { ok: false };
  }
}

// Never reports success when the removal failed (ARCHITECTURE §2.5)
export function clearHistory(): boolean {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
    return true;
  } catch {
    return false;
  }
}
