import waData from './wa-coefficients.json';

const disciplineMap: Record<string, string> = {
  '60 м': '60m',
  '100 м': '100m',
  '200 м': '200m',
  '300 м': '300m',
  '400 м': '400m',
  '600 м': '600m',
  '800 м': '800m',
  '1000 м': '1000m',
  '1500 м': '1500m',
  '2000 м': '2000m',
  '3000 м': '3000m',
  '5000 м': '5000m',
  '10000 м': '10000m',
  '10 000 м': '10000m',
  '60 м з бар’єрами': '60mH',
  '100 м з бар’єрами': '100mH',
  '110 м з бар’єрами': '110mH',
  '400 м з бар’єрами': '400mH',
  '3000 м з перешкодами': '3000m SC',
  'Стрибки у висоту': 'HJ',
  'Стрибки з жердиною': 'PV',
  'Стрибки у довжину': 'LJ',
  'Потрійний стрибок': 'TJ',
  'Штовхання ядра': 'SP',
  'Метання диска': 'DT',
  'Метання молота': 'HT',
  'Метання списа': 'JT',
  'Семиборство': 'Hept.',
  'Десятиборство': 'Dec.',
};

/**
 * Розрахунок очок за офіційними таблицями World Athletics (IAAF Scoring Tables)
 * @param gender 'M' | 'F'
 * @param disciplineName назва дисципліни українською або код
 * @param value результат: секунди для бігу, метри для стрибків/метань
 * @param timing 'manual' | 'electronic' (для ручного хронометражу додається 0.24 с)
 */
export function calculateWaScore(
  gender: string,
  disciplineName: string,
  value: number,
  timing?: string,
): number | null {
  if (value === undefined || value === null || Number.isNaN(value) || value <= 0) return null;
  const waKey = disciplineMap[disciplineName] || disciplineName;
  const g = gender === 'F' ? (waData as any).women : (waData as any).men;
  if (!g) return null;
  const poly = g[waKey];
  if (!poly || !Array.isArray(poly) || poly.length < 3) return null;

  // Офіційні таблиці World Athletics базуються на електронному хронометражі.
  // Для ручного хронометражу додається 0.24 секунди.
  let evalValue = value;
  if (timing === 'manual') {
    const isSprintOrRun =
      ['60m', '100m', '200m', '300m', '400m', '60mH', '100mH', '110mH', '400mH'].includes(waKey) ||
      waKey.endsWith('m') ||
      waKey.endsWith('mH') ||
      waKey.includes('relay');
    if (isSprintOrRun) {
      evalValue = Math.round((value + 0.24) * 100) / 100;
    }
  }

  const [a, b, c] = poly;
  const score = Math.round(a * evalValue * evalValue + b * evalValue + c);
  return score > 0 ? score : 0;
}
