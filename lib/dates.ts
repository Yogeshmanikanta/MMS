// Date helpers. All dates are local-time YYYY-MM-DD strings.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getTodayString(): string {
  return toDateString(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function getPreviousDateString(dateStr: string): string {
  return addDays(dateStr, -1);
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getMonthName(month: number): string {
  return MONTHS[month - 1] || MONTHS[0];
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** "Tuesday, 29 September" */
export function formatLongDate(dateStr: string): string {
  const weekday = parseDate(dateStr).toLocaleDateString('en-IN', { weekday: 'long' });
  return `${weekday}, ${formatDayMonthLong(dateStr)}`;
}

/** "29 September" */
export function formatDayMonthLong(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
}

/** "29 Sep 2026" */
export function formatShortDate(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "29 Sep" */
export function formatDayMonth(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** "Today", "Yesterday", "Tomorrow" or null */
export function relativeDayName(dateStr: string): string | null {
  const today = getTodayString();
  if (dateStr === today) return 'Today';
  if (dateStr === addDays(today, -1)) return 'Yesterday';
  if (dateStr === addDays(today, 1)) return 'Tomorrow';
  return null;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function formatRupees(amount: number, decimals = 0): string {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: 2 });
}
