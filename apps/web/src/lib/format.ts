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

/**
 * Повертає числовий порядок легкоатлетичної дисципліни (60 -> 100 -> 200 -> 400 -> 800 -> 1500 -> 3000 -> 5000 -> 10000 -> бар'єри -> перешкоди -> стрибки -> метання -> багатоборства -> естафети).
 */
export function getDisciplineSortWeight(name?: string | null): number {
  if (!name) return 9999;
  const t = name.toLowerCase().replace(/\s+/g, ' ').trim();

  if (t.includes('естафет') || /4\s*[хx]\s*\d+/i.test(t) || t.includes('relay')) {
    if (/4\s*[хx]\s*100/i.test(t)) return 510;
    if (/100\s*\+\s*200/i.test(t) || t.includes('swedish')) return 520;
    if (/4\s*[хx]\s*400/i.test(t)) return 530;
    if (/4\s*[хx]\s*800/i.test(t)) return 540;
    return 550;
  }

  if (t.includes('п’ятибор') || t.includes("п'ятибор") || t.includes('трибор') || t.includes('pentathlon')) return 405;
  if (t.includes('семибор') || t.includes('heptathlon')) return 410;
  if (t.includes('десятибор') || t.includes('decathlon')) return 420;

  if (t.includes('ядр') || t.includes('shot')) return 310;
  if (t.includes('диск') || t.includes('discus')) return 320;
  if (t.includes('молот') || t.includes('hammer')) return 330;
  if (t.includes('спис') || t.includes('javelin')) return 340;

  if (t.includes('висот') || t.includes('high jump')) return 210;
  if (t.includes('жердин') || t.includes('pole vault')) return 220;
  if (t.includes('довжин') || t.includes('long jump')) return 230;
  if (t.includes('потрійн') || t.includes('triple jump')) return 240;

  if (/бар|з\/б|з\.б|hurdle/i.test(t)) {
    if (/\b60\b/.test(t)) return 110;
    if (/\b100\b/.test(t)) return 120;
    if (/\b110\b/.test(t)) return 130;
    if (/\b300\b/.test(t)) return 135;
    if (/\b400\b/.test(t)) return 140;
    return 145;
  }
  if (/перешк|з\/п|з\.п|steeple/i.test(t)) {
    if (/\b1500\b/.test(t)) return 150;
    if (/\b2000\b/.test(t)) return 155;
    if (/\b3000\b/.test(t)) return 160;
    return 165;
  }

  if (t.includes('крос') || t.includes('cross')) {
    const kmMatch = t.match(/(\d+)\s*(?:км|km)/);
    return 600 + (kmMatch ? parseInt(kmMatch[1], 10) : 5);
  }

  const mMatch = t.match(/(?:^|\D)(\d+)\s*(?:м|m)(?:$|[^а-яіїєґa-z])/i);
  if (mMatch) {
    const meters = parseInt(mMatch[1], 10);
    if (meters === 60) return 10;
    if (meters === 100) return 20;
    if (meters === 200) return 30;
    if (meters === 300) return 35;
    if (meters === 400) return 40;
    if (meters === 600) return 45;
    if (meters === 800) return 50;
    if (meters === 1000) return 55;
    if (meters === 1500) return 60;
    if (meters === 2000) return 65;
    if (meters === 3000) return 70;
    if (meters === 5000) return 80;
    if (meters === 10000) return 85;
    return Math.min(89, Math.round(meters / 100));
  }

  return 900;
}

export function compareDisciplines(a?: string | null, b?: string | null): number {
  const wA = getDisciplineSortWeight(a);
  const wB = getDisciplineSortWeight(b);
  if (wA !== wB) return wA - wB;
  return (a || '').localeCompare(b || '');
}
