export type SportRank =
  | 'МСМК'
  | 'МС'
  | 'КМС'
  | 'І'
  | 'ІІ'
  | 'ІІІ'
  | 'І-юн'
  | 'ІІ-юн'
  | 'ІІІ-юн';

interface Standard {
  rank: SportRank;
  val: number;
}

// Менше або дорівнює для бігу (менший час кращий)
// Більше або дорівнює для технічних (більша відстань/висота краща)

interface StandardsConfig {
  type: 'time' | 'distance' | 'points';
  standards: Standard[];
}

const MEN_STANDARDS: Record<string, StandardsConfig> = {
  '100 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 10.27 },
      { rank: 'МС', val: 10.70 },
      { rank: 'КМС', val: 10.8 },
      { rank: 'І', val: 11.1 },
      { rank: 'ІІ', val: 11.5 },
      { rank: 'ІІІ', val: 12.0 },
      { rank: 'І-юн', val: 12.5 },
      { rank: 'ІІ-юн', val: 13.0 },
      { rank: 'ІІІ-юн', val: 14.0 },
    ],
  },
  '200 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 20.65 },
      { rank: 'МС', val: 21.40 },
      { rank: 'КМС', val: 22.0 },
      { rank: 'І', val: 22.8 },
      { rank: 'ІІ', val: 23.6 },
      { rank: 'ІІІ', val: 25.5 },
      { rank: 'І-юн', val: 26.5 },
      { rank: 'ІІ-юн', val: 27.5 },
      { rank: 'ІІІ-юн', val: 28.5 },
    ],
  },
  '400 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 45.90 },
      { rank: 'МС', val: 47.50 },
      { rank: 'КМС', val: 49.0 },
      { rank: 'І', val: 50.6 },
      { rank: 'ІІ', val: 53.5 },
      { rank: 'ІІІ', val: 56.0 },
      { rank: 'І-юн', val: 59.5 },
      { rank: 'ІІ-юн', val: 61.5 },
      { rank: 'ІІІ-юн', val: 64.0 },
    ],
  },
  '800 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 106.5 },
      { rank: 'МС', val: 109.5 },
      { rank: 'КМС', val: 114.0 },
      { rank: 'І', val: 120.0 },
      { rank: 'ІІ', val: 130.0 },
      { rank: 'ІІІ', val: 140.0 },
      { rank: 'І-юн', val: 150.0 },
      { rank: 'ІІ-юн', val: 160.0 },
      { rank: 'ІІІ-юн', val: 170.0 },
    ],
  },
  '1500 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 218.0 },
      { rank: 'МС', val: 226.0 },
      { rank: 'КМС', val: 234.0 },
      { rank: 'І', val: 248.0 },
      { rank: 'ІІ', val: 265.0 },
      { rank: 'ІІІ', val: 290.0 },
      { rank: 'І-юн', val: 305.0 },
      { rank: 'ІІ-юн', val: 325.0 },
      { rank: 'ІІІ-юн', val: 350.0 },
    ],
  },
  '110 м з бар’єрами': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 13.60 },
      { rank: 'МС', val: 14.20 },
      { rank: 'КМС', val: 14.7 },
      { rank: 'І', val: 15.3 },
      { rank: 'ІІ', val: 15.9 },
      { rank: 'ІІІ', val: 16.4 },
      { rank: 'І-юн', val: 17.4 },
      { rank: 'ІІ-юн', val: 19.4 },
    ],
  },
  'Стрибки у довжину': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 8.00 },
      { rank: 'МС', val: 7.60 },
      { rank: 'КМС', val: 7.20 },
      { rank: 'І', val: 6.80 },
      { rank: 'ІІ', val: 6.30 },
      { rank: 'ІІІ', val: 5.80 },
      { rank: 'І-юн', val: 5.30 },
      { rank: 'ІІ-юн', val: 4.75 },
      { rank: 'ІІІ-юн', val: 4.00 },
    ],
  },
  'Потрійний стрибок': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 16.90 },
      { rank: 'МС', val: 16.10 },
      { rank: 'КМС', val: 15.20 },
      { rank: 'І', val: 14.30 },
      { rank: 'ІІ', val: 13.30 },
      { rank: 'ІІІ', val: 12.30 },
      { rank: 'І-юн', val: 11.80 },
      { rank: 'ІІ-юн', val: 11.00 },
      { rank: 'ІІІ-юн', val: 10.00 },
    ],
  },
  'Штовхання ядра': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 20.00 },
      { rank: 'МС', val: 18.00 },
      { rank: 'КМС', val: 15.00 },
      { rank: 'І', val: 13.00 },
      { rank: 'ІІ', val: 11.00 },
      { rank: 'ІІІ', val: 9.00 },
    ],
  },
  'Метання диска': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 62.00 },
      { rank: 'МС', val: 55.00 },
      { rank: 'КМС', val: 50.00 },
      { rank: 'І', val: 45.00 },
      { rank: 'ІІ', val: 40.00 },
      { rank: 'ІІІ', val: 34.00 },
    ],
  },
  'Метання списа': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 79.00 },
      { rank: 'МС', val: 72.00 },
      { rank: 'КМС', val: 63.00 },
      { rank: 'І', val: 56.00 },
      { rank: 'ІІ', val: 50.00 },
      { rank: 'ІІІ', val: 40.00 },
    ],
  },
};

const WOMEN_STANDARDS: Record<string, StandardsConfig> = {
  '100 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 11.30 },
      { rank: 'МС', val: 11.80 },
      { rank: 'КМС', val: 12.0 },
      { rank: 'І', val: 12.5 },
      { rank: 'ІІ', val: 13.2 },
      { rank: 'ІІІ', val: 14.0 },
      { rank: 'І-юн', val: 14.8 },
      { rank: 'ІІ-юн', val: 15.6 },
      { rank: 'ІІІ-юн', val: 16.0 },
    ],
  },
  '200 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 22.94 },
      { rank: 'МС', val: 24.14 },
      { rank: 'КМС', val: 25.0 },
      { rank: 'І', val: 26.0 },
      { rank: 'ІІ', val: 27.4 },
      { rank: 'ІІІ', val: 29.0 },
      { rank: 'І-юн', val: 30.5 },
      { rank: 'ІІ-юн', val: 32.0 },
      { rank: 'ІІІ-юн', val: 35.5 },
    ],
  },
  '400 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 51.35 },
      { rank: 'МС', val: 53.50 },
      { rank: 'КМС', val: 55.5 },
      { rank: 'І', val: 58.5 },
      { rank: 'ІІ', val: 62.5 },
      { rank: 'ІІІ', val: 67.0 },
      { rank: 'І-юн', val: 73.0 },
      { rank: 'ІІ-юн', val: 77.0 },
      { rank: 'ІІІ-юн', val: 79.0 },
    ],
  },
  '800 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 121.3 },
      { rank: 'МС', val: 125.5 },
      { rank: 'КМС', val: 132.0 },
      { rank: 'І', val: 142.0 },
      { rank: 'ІІ', val: 150.0 },
      { rank: 'ІІІ', val: 175.0 },
      { rank: 'І-юн', val: 185.0 },
      { rank: 'ІІ-юн', val: 198.0 },
      { rank: 'ІІІ-юн', val: 215.0 },
    ],
  },
  '1500 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 248.0 },
      { rank: 'МС', val: 258.0 },
      { rank: 'КМС', val: 274.0 },
      { rank: 'І', val: 292.0 },
      { rank: 'ІІ', val: 315.0 },
      { rank: 'ІІІ', val: 345.0 },
      { rank: 'І-юн', val: 365.0 },
      { rank: 'ІІ-юн', val: 390.0 },
      { rank: 'ІІІ-юн', val: 430.0 },
    ],
  },
  '100 м з бар’єрами': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 13.00 },
      { rank: 'МС', val: 13.85 },
      { rank: 'КМС', val: 14.6 },
      { rank: 'І', val: 15.2 },
      { rank: 'ІІ', val: 16.4 },
      { rank: 'ІІІ', val: 18.0 },
      { rank: 'І-юн', val: 19.5 },
      { rank: 'ІІ-юн', val: 20.0 },
      { rank: 'ІІІ-юн', val: 22.0 },
    ],
  },
  'Стрибки у довжину': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 6.60 },
      { rank: 'МС', val: 6.25 },
      { rank: 'КМС', val: 5.90 },
      { rank: 'І', val: 5.60 },
      { rank: 'ІІ', val: 5.20 },
      { rank: 'ІІІ', val: 4.70 },
      { rank: 'І-юн', val: 4.20 },
      { rank: 'ІІ-юн', val: 3.80 },
      { rank: 'ІІІ-юн', val: 3.50 },
    ],
  },
  'Потрійний стрибок': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 14.15 },
      { rank: 'МС', val: 13.50 },
      { rank: 'КМС', val: 12.80 },
      { rank: 'І', val: 12.00 },
      { rank: 'ІІ', val: 11.20 },
      { rank: 'ІІІ', val: 10.40 },
      { rank: 'І-юн', val: 9.60 },
      { rank: 'ІІ-юн', val: 8.80 },
      { rank: 'ІІІ-юн', val: 8.00 },
    ],
  },
  'Штовхання ядра': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 18.00 },
      { rank: 'МС', val: 16.00 },
      { rank: 'КМС', val: 14.00 },
      { rank: 'І', val: 12.00 },
      { rank: 'ІІ', val: 10.00 },
      { rank: 'ІІІ', val: 8.00 },
    ],
  },
  'Метання диска': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 61.00 },
      { rank: 'МС', val: 51.50 },
      { rank: 'КМС', val: 46.50 },
      { rank: 'І', val: 41.50 },
      { rank: 'ІІ', val: 36.50 },
      { rank: 'ІІІ', val: 29.00 },
      { rank: 'І-юн', val: 25.00 },
      { rank: 'ІІ-юн', val: 20.00 },
      { rank: 'ІІІ-юн', val: 18.00 },
    ],
  },
  'Метання списа': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 60.50 },
      { rank: 'МС', val: 51.00 },
      { rank: 'КМС', val: 45.00 },
      { rank: 'І', val: 39.00 },
      { rank: 'ІІ', val: 32.00 },
      { rank: 'ІІІ', val: 25.00 },
    ],
  },
};

/**
 * Визначає кваліфікаційний розряд (ЄСКУ) за результатом, статтю, видом спорту та типом хронометражу
 */
export function determineSportRank(
  gender: string,
  disciplineName: string,
  value: number,
  timing?: string,
): SportRank | null {
  if (value === undefined || value === null || Number.isNaN(value) || value <= 0) return null;
  const table = gender === 'F' ? WOMEN_STANDARDS : MEN_STANDARDS;
  const cfg = table[disciplineName];
  if (!cfg) return null;

  const isSprint = [
    '100 м',
    '200 м',
    '400 м',
    '110 м з бар’єрами',
    '100 м з бар’єрами',
    '60 м',
    '60 м з бар’єрами',
  ].includes(disciplineName);

  for (const item of cfg.standards) {
    if (cfg.type === 'time') {
      const targetVal = item.val;
      let checkVal = value;

      if (isSprint) {
        const isStandardElectronic = Math.round(item.val * 10) !== item.val * 10;
        if (isStandardElectronic) {
          // Стандарт електронний: до ручного результату додається 0.24 с
          if (timing === 'manual') checkVal = Math.round((value + 0.24) * 100) / 100;
        } else {
          // Стандарт ручний: від електронного результату віднімається 0.24 с (або до стандарту додається 0.24 с)
          if (timing === 'electronic') checkVal = Math.round((value - 0.24) * 100) / 100;
        }
      }

      if (checkVal <= targetVal) return item.rank;
    } else {
      if (value >= item.val) return item.rank;
    }
  }
  return null;
}
