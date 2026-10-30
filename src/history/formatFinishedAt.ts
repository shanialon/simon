const dateFormat = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

// Device-local date and time, e.g. { date: '30.10.2026', time: '14:32' }
export function formatFinishedAt(iso: string) {
  const d = new Date(iso);
  return { date: dateFormat.format(d), time: timeFormat.format(d) };
}
