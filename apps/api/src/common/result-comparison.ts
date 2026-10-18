/**
 * Уніфікована логіка порівняння спортивних результатів.
 *
 * Відповідно до правил легкої атлетики:
 * - У бігових видах результат з ручним хронометражем (manual) отримує +0.24 секунди
 *   при співставленні та формуванні рейтингів.
 * - У бігових видах менше значення є кращим (швидшим).
 * - У технічних видах (стрибки, метання) та багатоборствах більше значення є кращим.
 */

export function getComparableValue(
  value: number | undefined | null,
  type: string = 'time',
  timing?: 'manual' | 'electronic' | string,
): number {
  if (value === undefined || value === null) return type === 'time' ? Infinity : -Infinity;
  if (type === 'time') {
    if (timing === 'manual' && typeof value === 'number') {
      return Math.round((value + 0.24) * 100) / 100;
    }
    return value;
  }
  return value;
}

export function isBetterMark(
  type: string = 'time',
  a: { value?: number | null; timing?: string },
  b: { value?: number | null; timing?: string },
): boolean {
  if (a.value === undefined || a.value === null) return false;
  if (b.value === undefined || b.value === null) return true;

  if (type === 'time') {
    const valA = getComparableValue(a.value, 'time', a.timing);
    const valB = getComparableValue(b.value, 'time', b.timing);
    if (Math.abs(valA - valB) > 0.0001) {
      return valA < valB;
    }
    // При однаковому скоригованому часі пріоритет має електронний хронометраж
    return a.timing === 'electronic' && b.timing !== 'electronic';
  }

  return (a.value ?? 0) > (b.value ?? 0);
}

export function pickBestMark<T extends { value?: number | null; timing?: string }>(
  list: T[],
  type: string = 'time',
): T | null {
  if (!list || list.length === 0) return null;
  return list.reduce<T | null>((acc, item) => {
    if (!acc) return item;
    return isBetterMark(type, item, acc) ? item : acc;
  }, null);
}
