import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateFormat } from '@/types/models';

export const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function dateKey(value: string | Date): string {
  const date = value instanceof Date ? value : parseISO(value);
  if (!isValid(date)) return '';
  return format(date, 'yyyy-MM-dd');
}

export function parseDateKey(key: string): Date {
  const parsed = parseISO(`${key}T12:00:00`);
  return isValid(parsed) ? parsed : new Date();
}

export function formatLongDate(value: string | Date | null | undefined): string {
  const date = toDate(value ?? null);
  if (!date) return '—';
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatDate(value: string | Date | null | undefined, pattern = 'd MMM yyyy'): string {
  const date = toDate(value ?? null);
  if (!date) return '—';
  return format(date, pattern, { locale: es });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value ?? null);
  if (!date) return '—';
  return format(date, "d MMM yyyy · HH:mm", { locale: es });
}

export function formatTime(value: string | Date | null | undefined): string {
  const date = toDate(value ?? null);
  if (!date) return '—';
  return format(date, 'HH:mm');
}

export function formatRelativeDay(value: string | Date | null | undefined): string {
  const date = toDate(value ?? null);
  if (!date) return '—';
  const days = differenceInCalendarDays(startOfDay(date), startOfDay(new Date()));
  if (days === 0) return 'Hoy';
  if (days === -1) return 'Ayer';
  if (days === 1) return 'Mañana';
  if (days > 1 && days < 7) return `En ${days} días`;
  if (days < -1 && days > -7) return `Hace ${Math.abs(days)} días`;
  return formatDate(date, 'd MMM yyyy');
}

export function formatDateByPreference(
  value: string | Date | null | undefined,
  preference: DateFormat,
): string {
  const date = toDate(value ?? null);
  if (!date) return '—';
  return format(date, preference === 'dd/MM/yyyy' ? 'dd/MM/yyyy' : preference, {
    locale: es,
  });
}

export function formatMonthYear(value: string | Date): string {
  const date = toDate(value) ?? new Date();
  const text = format(date, 'MMMM yyyy', { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatWeekday(value: Date): string {
  return format(value, 'EEEE', { locale: es });
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function isSameCalendarDay(a: string | Date | null, b: string | Date | null): boolean {
  const first = toDate(a);
  const second = toDate(b);
  if (!first || !second) return false;
  return isSameDay(first, second);
}

export interface MonthCell {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
}

export function getMonthMatrix(month: Date): MonthCell[][] {
  const first = startOfWeek(startOfMonth(month), WEEK_OPTIONS);
  const last = endOfWeek(endOfMonth(month), WEEK_OPTIONS);
  const days = eachDayOfInterval({ start: first, end: last });
  const weeks: MonthCell[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(
      days.slice(index, index + 7).map((date) => ({
        date,
        key: dateKey(date),
        inCurrentMonth: date.getMonth() === month.getMonth(),
      })),
    );
  }
  return weeks;
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, WEEK_OPTIONS);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getMonthRange(anchor: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(startOfMonth(anchor), WEEK_OPTIONS),
    end: endOfWeek(endOfMonth(anchor), WEEK_OPTIONS),
  };
}

export function startOfCurrentWeek(): Date {
  return startOfWeek(new Date(), WEEK_OPTIONS);
}

export function daysAgo(days: number): Date {
  return startOfDay(addDays(new Date(), -days));
}

export function toLocalInputValue(value: Date | string = new Date()): string {
  const date = typeof value === 'string' ? toDate(value) ?? new Date() : value;
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function fromLocalInputValue(value: string): string {
  const date = new Date(value);
  return isValid(date) ? date.toISOString() : new Date().toISOString();
}

export function dayLabelShort(value: Date): string {
  return format(value, 'EEEEE', { locale: es }).toUpperCase();
}

export function dayNumber(value: Date): number {
  return Number(format(value, 'd'));
}
