const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-07" → "7 Oct 2026", "2026-10" → "Oct 2026", "2026" → "2026". */
export function formatPartial(value: string | undefined): string {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  if (d) return `${d} ${MONTHS[m - 1]} ${y}`;
  if (m) return `${MONTHS[m - 1]} ${y}`;
  return String(y);
}

export const monthYear = (date: Date) => `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
export const dayMonthYear = (date: Date) => `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** "2019-01" … "2025-12" → "2019 – 2025"; open end → "2026 – present". */
export function span(start: string, end?: string): string {
  const s = start.slice(0, 4);
  if (!end) return `${s} – present`;
  const e = end.slice(0, 4);
  return s === e ? s : `${s} – ${e}`;
}

/** Sort key for "YYYY", "YYYY-MM" or "YYYY-MM-DD". */
export const partialKey = (value: string | undefined, year = 0) => (value ?? String(year)).padEnd(10, '-');

export function daysSince(value: string | Date, now = new Date()) {
  const d = typeof value === 'string' ? new Date(value.length === 7 ? `${value}-01` : value) : value;
  return (now.getTime() - d.getTime()) / 86_400_000;
}
