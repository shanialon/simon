import { HISTORY_KEY, MAX_HISTORY, addResult, clearHistory, loadHistory } from './historyStorage';
import { formatFinishedAt } from './formatFinishedAt';

const stored = () => JSON.parse(localStorage.getItem(HISTORY_KEY)!);
const valid = { id: 'a', finishedAt: '2026-10-30T12:00:00.000Z', completedRounds: 3, outcome: 'loss' };

describe('historyStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts empty', () => {
    expect(loadHistory()).toEqual({ ok: true, results: [] });
  });

  it('adds newest first in the versioned format', () => {
    addResult({ completedRounds: 2, outcome: 'loss' });
    const second = addResult({ completedRounds: 10, outcome: 'win' });
    expect(second.ok && second.results.map((r) => r.completedRounds)).toEqual([10, 2]);
    const data = stored();
    expect(data.schemaVersion).toBe(1);
    expect(data.results).toHaveLength(2);
    expect(new Date(data.results[0].finishedAt).toISOString()).toBe(data.results[0].finishedAt);
    expect(data.results[0].id).not.toBe(data.results[1].id);
    expect(loadHistory()).toEqual({ ok: true, results: data.results });
  });

  it('keeps at most 10, dropping the oldest', () => {
    for (let i = 0; i <= MAX_HISTORY; i++) addResult({ completedRounds: i, outcome: 'loss' });
    const loaded = loadHistory();
    expect(loaded.ok && loaded.results.map((r) => r.completedRounds)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('reports unreadable data as an error', () => {
    for (const raw of ['{not json', 'null', '[]', '{"schemaVersion":2,"results":[]}', '{"schemaVersion":1}']) {
      localStorage.setItem(HISTORY_KEY, raw);
      expect(loadHistory()).toEqual({ ok: false });
    }
  });

  it('filters out invalid entries and keeps the valid ones', () => {
    const results = [
      valid,
      { ...valid, id: 'b', outcome: 'draw' },
      { ...valid, id: 'c', completedRounds: 11 },
      { ...valid, id: 'd', completedRounds: 2.5 },
      { ...valid, id: 'e', finishedAt: 'yesterday' },
      { ...valid, id: '' },
      null,
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 1, results }));
    expect(loadHistory()).toEqual({ ok: true, results: [valid] });
  });

  it('replaces unreadable data with a fresh valid list on the next save', () => {
    localStorage.setItem(HISTORY_KEY, '{broken');
    expect(addResult({ completedRounds: 0, outcome: 'loss' }).ok).toBe(true);
    const loaded = loadHistory();
    expect(loaded.ok && loaded.results).toHaveLength(1);
  });

  it('clears the history', () => {
    addResult({ completedRounds: 1, outcome: 'loss' });
    expect(clearHistory()).toBe(true);
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    expect(loadHistory()).toEqual({ ok: true, results: [] });
  });

  it('never throws when storage is unavailable', () => {
    const fail = () => {
      throw new Error('blocked');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(fail);
    expect(loadHistory()).toEqual({ ok: false });
    expect(addResult({ completedRounds: 1, outcome: 'loss' })).toEqual({ ok: false });
    expect(clearHistory()).toBe(false);
  });

  it('formats the finish time in local Hebrew date and 24h time', () => {
    const iso = new Date(2026, 9, 30, 14, 32).toISOString();
    expect(formatFinishedAt(iso)).toEqual({ date: '30.10.2026', time: '14:32' });
  });
});
