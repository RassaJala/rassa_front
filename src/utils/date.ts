import { toLocalDate } from '@/common/waste';

const MS_PER_DAY = 86_400_000;

/**
 * Backend sends fecha_publicacion as a bare date ("2026-08-10"). `new Date()`
 * parses that as UTC midnight, which shifts the day back in negative-offset
 * timezones (e.g. -03:00 shows the previous Sunday). Parse as a local date.
 */
export function parseLocalDate(iso: string): Date {
  return toLocalDate(iso) ?? new Date();
}

// Backend rule: publications can only be created/edited on Monday
// (rassa_back views use `timezone.localdate().weekday() != 0`).
export function isMondayToday(date: Date = new Date()): boolean {
  return date.getDay() === 1;
}

export function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
}
