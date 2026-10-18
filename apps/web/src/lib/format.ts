import type { Discipline } from './types';

/**
 * Визначає, чи є хронометраж ручним за текстовим записом результату
 */
export function detectTiming(text: string): 'manual' | 'electronic' {
  const clean = text.trim().toLowerCase();
  if (clean.endsWith('h') || clean.endsWith('р') || clean.includes('руч')) return 'manual';
  const parts = clean.replace(',', '.').split('.');
  if (parts.length === 2) {
    const decimals = parts[1].replace(/[^0-9]/g, '');
    if (decimals.length === 1) return 'manual';
    if (decimals.length >= 2) return 'electronic';
  }
  return 'electronic';
}

/**
 * Форматує результат за типом виду:
 *  - час: ручний хронометраж показується до десятих (11.6, 12.0, 1:58.9)
 *         електронний хронометраж показується до сотих (11.64, 12.00, 1:58.94)
 *  - відстань: 0.00 м
 *  - очки: ціле число
 */
export function formatValue(
  value: number | undefined | null,
  type: Discipline['type'],
  timing?: 'manual' | 'electronic' | string,
): string {
  if (value === undefined || value === null) return '–';
  if (type === 'points') return String(Math.round(value));
  if (type === 'distance') return value.toFixed(2);

  const isManual = timing === 'manual';
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = value - h * 3600 - m * 60;

  if (isManual) {
    const sec = s.toFixed(1).padStart(4, '0');
    if (h) return `${h}:${String(m).padStart(2, '0')}:${sec}`;
    if (m) return `${m}:${sec}`;
    return s.toFixed(1);
  }

  const sec = s.toFixed(2).padStart(5, '0');
  if (h) return `${h}:${String(m).padStart(2, '0')}:${sec}`;
  if (m) return `${m}:${sec}`;
  return s.toFixed(2);
}

/**
 * Ефективне значення для порівняння результатів.
 * Ручний хронометраж у бігових видах отримує +0.24 секунди при порівнянні з електронним.
 */
export function getComparableValue(
  value: number | undefined | null,
  type: Discipline['type'] = 'time',
  timing?: 'manual' | 'electronic' | string,
): number {
  if (value === undefined || value === null || Number.isNaN(value)) return Infinity;
  if (type !== 'time') return value;
  if (timing === 'manual') {
    return Math.round((value + 0.24) * 100) / 100;
  }
  return value;
}

/**
 * Порівнює два результати з урахуванням того, що до ручного хронометражу додається 0.24 с.
 * Повертає < 0 якщо a кращий за b, > 0 якщо b кращий за a, 0 якщо рівні.
 */
export function compareResults(
  a: { value?: number | null; timing?: 'manual' | 'electronic' | string },
  b: { value?: number | null; timing?: 'manual' | 'electronic' | string },
  type: Discipline['type'] = 'time',
): number {
  if (a.value === undefined || a.value === null) return 1;
  if (b.value === undefined || b.value === null) return -1;
  if (type === 'time') {
    const compA = getComparableValue(a.value, 'time', a.timing);
    const compB = getComparableValue(b.value, 'time', b.timing);
    if (Math.abs(compA - compB) > 0.0001) return compA - compB; // менший час кращий
    // При рівності: електронний хронометраж має пріоритет
    if (a.timing !== b.timing) {
      return a.timing === 'electronic' ? -1 : 1;
    }
    return 0;
  }
  // distance / points: більший результат кращий
  return b.value - a.value;
}

/** Розбирає введений текст у число (час "1:52.3" → 112.3). Повертає NaN при помилці. */
export function parseValue(text: string, type: Discipline['type']): number {
  const clean = text.trim().replace(',', '.');
  if (!clean) return NaN;
  if (type !== 'time') return Number(clean);
  const parts = clean.replace(/[^\d:.]/g, '').split(':').map(Number);
  if (parts.some((p) => Number.isNaN(p)) || parts.length > 3) return NaN;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

export const formatDate = (d?: string | null) =>
  d ? new Date(d).toISOString().slice(0, 10).split('-').reverse().join('.') : '–';

export const fullName = (a: { lastName: string; firstName: string; middleName?: string }) =>
  `${a.lastName} ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`;
