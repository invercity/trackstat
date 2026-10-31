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
  /** true якщо норматив у таблиці ЄСКУ позначено літерою «а» (автохронометраж) */
  auto?: boolean;
}

// Менше або дорівнює для бігу (менший час кращий)
// Більше або дорівнює для технічних та багатоборств (більша відстань/висота/очки кращі)

interface StandardsConfig {
  type: 'time' | 'distance' | 'points';
  standards: Standard[];
  indoorStandards?: Standard[];
}

const MEN_STANDARDS: Record<string, StandardsConfig> = {
  '60 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 6.65, auto: true },
      { rank: 'МС', val: 6.80, auto: true },
      { rank: 'КМС', val: 6.7 },
      { rank: 'І', val: 7.0 },
      { rank: 'ІІ', val: 7.4 },
      { rank: 'ІІІ', val: 7.8 },
      { rank: 'І-юн', val: 8.2 },
      { rank: 'ІІ-юн', val: 8.6 },
      { rank: 'ІІІ-юн', val: 9.0 },
    ],
  },
  '100 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 10.27, auto: true },
      { rank: 'МС', val: 10.70, auto: true },
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
      { rank: 'МСМК', val: 20.65, auto: true },
      { rank: 'МС', val: 21.40, auto: true },
      { rank: 'КМС', val: 22.0 },
      { rank: 'І', val: 22.8 },
      { rank: 'ІІ', val: 23.6 },
      { rank: 'ІІІ', val: 25.5 },
      { rank: 'І-юн', val: 26.5 },
      { rank: 'ІІ-юн', val: 27.5 },
      { rank: 'ІІІ-юн', val: 28.5 },
    ],
    indoorStandards: [
      { rank: 'МС', val: 21.70, auto: true },
      { rank: 'КМС', val: 22.5 },
      { rank: 'І', val: 23.4 },
      { rank: 'ІІ', val: 24.3 },
      { rank: 'ІІІ', val: 26.3 },
      { rank: 'І-юн', val: 27.4 },
      { rank: 'ІІ-юн', val: 28.5 },
      { rank: 'ІІІ-юн', val: 29.6 },
    ],
  },
  '300 м': {
    type: 'time',
    standards: [
      { rank: 'КМС', val: 35.6 },
      { rank: 'І', val: 36.5 },
      { rank: 'ІІ', val: 38.3 },
      { rank: 'ІІІ', val: 40.0 },
      { rank: 'І-юн', val: 41.5 },
      { rank: 'ІІ-юн', val: 43.5 },
      { rank: 'ІІІ-юн', val: 46.0 },
    ],
    indoorStandards: [
      { rank: 'КМС', val: 35.6 },
      { rank: 'І', val: 36.5 },
      { rank: 'ІІ', val: 38.3 },
      { rank: 'ІІІ', val: 41.5 },
      { rank: 'І-юн', val: 42.8 },
      { rank: 'ІІ-юн', val: 45.0 },
      { rank: 'ІІІ-юн', val: 47.5 },
    ],
  },
  '400 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 45.90, auto: true },
      { rank: 'МС', val: 47.50, auto: true },
      { rank: 'КМС', val: 49.0 },
      { rank: 'І', val: 50.6 },
      { rank: 'ІІ', val: 53.5 },
      { rank: 'ІІІ', val: 56.0 },
      { rank: 'І-юн', val: 59.5 },
      { rank: 'ІІ-юн', val: 61.5 },
      { rank: 'ІІІ-юн', val: 64.0 },
    ],
    indoorStandards: [
      { rank: 'МСМК', val: 46.80, auto: true },
      { rank: 'МС', val: 48.50, auto: true },
      { rank: 'КМС', val: 50.4 },
      { rank: 'І', val: 51.8 },
      { rank: 'ІІ', val: 54.0 },
      { rank: 'ІІІ', val: 57.0 },
      { rank: 'І-юн', val: 60.0 },
      { rank: 'ІІ-юн', val: 63.0 },
      { rank: 'ІІІ-юн', val: 66.0 },
    ],
  },
  '800 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 106.5, auto: true },
      { rank: 'МС', val: 109.5, auto: true },
      { rank: 'КМС', val: 114.0 },
      { rank: 'І', val: 120.0 },
      { rank: 'ІІ', val: 130.0 },
      { rank: 'ІІІ', val: 140.0 },
      { rank: 'І-юн', val: 150.0 },
      { rank: 'ІІ-юн', val: 160.0 },
      { rank: 'ІІІ-юн', val: 170.0 },
    ],
    indoorStandards: [
      { rank: 'МСМК', val: 108.45, auto: true },
      { rank: 'МС', val: 111.0, auto: true },
      { rank: 'КМС', val: 115.5 },
      { rank: 'І', val: 121.0 },
      { rank: 'ІІ', val: 130.5 },
      { rank: 'ІІІ', val: 140.0 },
      { rank: 'І-юн', val: 148.0 },
      { rank: 'ІІ-юн', val: 155.0 },
      { rank: 'ІІІ-юн', val: 170.0 },
    ],
  },
  '1000 м': {
    type: 'time',
    standards: [
      { rank: 'МС', val: 142.0, auto: true },
      { rank: 'КМС', val: 148.0 },
      { rank: 'І', val: 156.0 },
      { rank: 'ІІ', val: 163.0 },
      { rank: 'ІІІ', val: 180.0 },
      { rank: 'І-юн', val: 195.0 },
      { rank: 'ІІ-юн', val: 205.0 },
      { rank: 'ІІІ-юн', val: 215.0 },
    ],
  },
  '1500 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 218.0, auto: true },
      { rank: 'МС', val: 226.0, auto: true },
      { rank: 'КМС', val: 234.0 },
      { rank: 'І', val: 248.0 },
      { rank: 'ІІ', val: 265.0 },
      { rank: 'ІІІ', val: 290.0 },
      { rank: 'І-юн', val: 305.0 },
      { rank: 'ІІ-юн', val: 325.0 },
      { rank: 'ІІІ-юн', val: 350.0 },
    ],
    indoorStandards: [
      { rank: 'МСМК', val: 220.0, auto: true },
      { rank: 'МС', val: 227.5, auto: true },
      { rank: 'КМС', val: 237.0 },
      { rank: 'І', val: 248.0 },
      { rank: 'ІІ', val: 267.0 },
      { rank: 'ІІІ', val: 290.0 },
      { rank: 'І-юн', val: 305.0 },
      { rank: 'ІІ-юн', val: 325.0 },
      { rank: 'ІІІ-юн', val: 350.0 },
    ],
  },
  '3000 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 472.0, auto: true },
      { rank: 'МС', val: 488.0, auto: true },
      { rank: 'КМС', val: 510.0 },
      { rank: 'І', val: 540.0 },
      { rank: 'ІІ', val: 575.0 },
      { rank: 'ІІІ', val: 620.0 },
    ],
    indoorStandards: [
      { rank: 'МСМК', val: 475.0, auto: true },
      { rank: 'МС', val: 491.0, auto: true },
      { rank: 'КМС', val: 515.0 },
      { rank: 'І', val: 540.0 },
      { rank: 'ІІ', val: 580.0 },
      { rank: 'ІІІ', val: 620.0 },
    ],
  },
  '5000 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 806.0, auto: true },
      { rank: 'МС', val: 845.0, auto: true },
      { rank: 'КМС', val: 880.0 },
      { rank: 'І', val: 920.0 },
      { rank: 'ІІ', val: 990.0 },
      { rank: 'ІІІ', val: 1070.0 },
    ],
  },
  '10000 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 1690.0, auto: true },
      { rank: 'МС', val: 1770.0, auto: true },
      { rank: 'КМС', val: 1830.0 },
      { rank: 'І', val: 1950.0 },
      { rank: 'ІІ', val: 2070.0 },
      { rank: 'ІІІ', val: 2260.0 },
    ],
  },
  '60 м з бар’єрами': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 7.75, auto: true },
      { rank: 'МС', val: 8.10, auto: true },
      { rank: 'КМС', val: 8.3 },
      { rank: 'І', val: 8.6 },
      { rank: 'ІІ', val: 9.0 },
      { rank: 'ІІІ', val: 9.5 },
      { rank: 'І-юн', val: 9.8 },
      { rank: 'ІІ-юн', val: 10.3 },
      { rank: 'ІІ-юн', val: 10.5 },
      { rank: 'ІІІ-юн', val: 10.8 },
    ],
  },
  '110 м з бар’єрами': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 13.60, auto: true },
      { rank: 'МС', val: 14.20, auto: true },
      { rank: 'КМС', val: 14.7 },
      { rank: 'І', val: 15.3 },
      { rank: 'ІІ', val: 15.9 },
      { rank: 'ІІІ', val: 16.4 },
      { rank: 'І-юн', val: 17.4 },
      { rank: 'ІІ-юн', val: 19.4 },
    ],
  },
  '300 м з бар’єрами': {
    type: 'time',
    standards: [
      { rank: 'І', val: 43.0 },
      { rank: 'ІІ', val: 46.0 },
      { rank: 'ІІІ', val: 49.0 },
      { rank: 'І-юн', val: 52.5 },
      { rank: 'ІІ-юн', val: 56.0 },
      { rank: 'ІІІ-юн', val: 60.0 },
    ],
  },
  '400 м з бар’єрами': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 49.80, auto: true },
      { rank: 'МС', val: 52.50, auto: true },
      { rank: 'КМС', val: 54.7 },
      { rank: 'І', val: 57.0 },
      { rank: 'ІІ', val: 60.0 },
      { rank: 'ІІІ', val: 63.0 },
      { rank: 'І-юн', val: 66.0 },
      { rank: 'ІІ-юн', val: 69.0 },
      { rank: 'ІІІ-юн', val: 70.0 },
    ],
  },
  '2000 м з перешкодами': {
    type: 'time',
    standards: [
      { rank: 'КМС', val: 360.0 },
      { rank: 'І', val: 380.0 },
      { rank: 'ІІ', val: 405.0 },
      { rank: 'ІІІ', val: 440.0 },
    ],
    indoorStandards: [
      { rank: 'КМС', val: 350.0 },
      { rank: 'І', val: 370.0 },
      { rank: 'ІІ', val: 395.0 },
      { rank: 'ІІІ', val: 430.0 },
    ],
  },
  '3000 м з перешкодами': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 508.0, auto: true },
      { rank: 'МС', val: 526.5, auto: true },
      { rank: 'КМС', val: 560.0 },
      { rank: 'І', val: 590.0 },
      { rank: 'ІІ', val: 630.0 },
      { rank: 'ІІІ', val: 690.0 },
    ],
    indoorStandards: [
      { rank: 'МС', val: 515.0, auto: true },
      { rank: 'КМС', val: 545.0 },
      { rank: 'І', val: 570.0 },
      { rank: 'ІІ', val: 620.0 },
      { rank: 'ІІІ', val: 680.0 },
    ],
  },
  'Естафета 4х100 м': {
    type: 'time',
    standards: [
      { rank: 'МС', val: 41.50, auto: true },
      { rank: 'КМС', val: 42.0 },
      { rank: 'І', val: 43.0 },
      { rank: 'ІІ', val: 44.5 },
      { rank: 'ІІІ', val: 46.5 },
      { rank: 'І-юн', val: 51.5 },
      { rank: 'ІІ-юн', val: 55.0 },
      { rank: 'ІІІ-юн', val: 58.0 },
    ],
  },
  'Естафета 4х400 м': {
    type: 'time',
    standards: [
      { rank: 'МС', val: 190.0, auto: true },
      { rank: 'КМС', val: 196.0 },
      { rank: 'І', val: 205.0 },
      { rank: 'ІІ', val: 215.0 },
      { rank: 'ІІІ', val: 226.0 },
      { rank: 'І-юн', val: 234.0 },
      { rank: 'ІІ-юн', val: 244.0 },
      { rank: 'ІІІ-юн', val: 260.0 },
    ],
  },
  'Естафета 100+200+300+400 м': {
    type: 'time',
    standards: [
      { rank: 'КМС', val: 118.5 },
      { rank: 'І', val: 119.5 },
      { rank: 'ІІ', val: 121.2 },
      { rank: 'ІІІ', val: 124.5 },
      { rank: 'І-юн', val: 126.5 },
      { rank: 'ІІ-юн', val: 128.5 },
      { rank: 'ІІІ-юн', val: 130.5 },
    ],
  },
  'Стрибки у висоту': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 2.28 },
      { rank: 'МС', val: 2.15 },
      { rank: 'КМС', val: 2.05 },
      { rank: 'І', val: 1.93 },
      { rank: 'ІІ', val: 1.75 },
      { rank: 'ІІІ', val: 1.65 },
      { rank: 'І-юн', val: 1.55 },
      { rank: 'ІІ-юн', val: 1.40 },
      { rank: 'ІІІ-юн', val: 1.30 },
    ],
  },
  'Стрибки з жердиною': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 5.60 },
      { rank: 'МС', val: 5.20 },
      { rank: 'КМС', val: 4.60 },
      { rank: 'І', val: 4.20 },
      { rank: 'ІІ', val: 3.60 },
      { rank: 'ІІІ', val: 3.20 },
      { rank: 'І-юн', val: 2.80 },
      { rank: 'ІІ-юн', val: 2.40 },
      { rank: 'ІІІ-юн', val: 2.10 },
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
      { rank: 'І-юн', val: 32.00 },
      { rank: 'ІІ-юн', val: 31.00 },
      { rank: 'ІІІ-юн', val: 26.00 },
    ],
  },
  'Метання молота': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 76.00 },
      { rank: 'МС', val: 66.00 },
      { rank: 'КМС', val: 61.00 },
      { rank: 'І', val: 54.00 },
      { rank: 'ІІ', val: 46.50 },
      { rank: 'ІІІ', val: 38.00 },
      { rank: 'І-юн', val: 34.00 },
      { rank: 'ІІ-юн', val: 28.00 },
      { rank: 'ІІІ-юн', val: 23.00 },
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
      { rank: 'І-юн', val: 36.00 },
      { rank: 'ІІ-юн', val: 28.50 },
      { rank: 'ІІІ-юн', val: 22.50 },
    ],
  },
  'П’ятиборство': {
    type: 'points',
    standards: [
      { rank: 'КМС', val: 3250 },
      { rank: 'І', val: 2900 },
      { rank: 'ІІ', val: 2400 },
      { rank: 'ІІІ', val: 1900 },
      { rank: 'І-юн', val: 1650 },
      { rank: 'ІІ-юн', val: 1400 },
      { rank: 'ІІІ-юн', val: 1150 },
    ],
  },
  'Семиборство': {
    type: 'points',
    standards: [
      { rank: 'МСМК', val: 5900 },
      { rank: 'МС', val: 5350 },
      { rank: 'КМС', val: 4900 },
      { rank: 'І', val: 4150 },
      { rank: 'ІІ', val: 3500 },
      { rank: 'ІІІ', val: 2800 },
      { rank: 'І-юн', val: 2500 },
      { rank: 'ІІ-юн', val: 2100 },
      { rank: 'ІІІ-юн', val: 1600 },
    ],
  },
  'Десятиборство': {
    type: 'points',
    standards: [
      { rank: 'МСМК', val: 8050 },
      { rank: 'МС', val: 7100 },
      { rank: 'КМС', val: 6400 },
      { rank: 'І', val: 5600 },
      { rank: 'ІІ', val: 4800 },
      { rank: 'ІІІ', val: 3700 },
      { rank: 'І-юн', val: 3500 },
      { rank: 'ІІ-юн', val: 3000 },
      { rank: 'ІІІ-юн', val: 2500 },
    ],
  },
};

const WOMEN_STANDARDS: Record<string, StandardsConfig> = {
  '60 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 7.25, auto: true },
      { rank: 'МС', val: 7.50, auto: true },
      { rank: 'КМС', val: 7.5 },
      { rank: 'І', val: 7.7 },
      { rank: 'ІІ', val: 8.2 },
      { rank: 'ІІІ', val: 8.7 },
      { rank: 'І-юн', val: 9.2 },
      { rank: 'ІІ-юн', val: 9.7 },
      { rank: 'ІІІ-юн', val: 10.3 },
    ],
  },
  '100 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 11.30, auto: true },
      { rank: 'МС', val: 11.80, auto: true },
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
      { rank: 'МСМК', val: 22.94, auto: true },
      { rank: 'МС', val: 24.14, auto: true },
      { rank: 'КМС', val: 25.0 },
      { rank: 'І', val: 26.0 },
      { rank: 'ІІ', val: 27.4 },
      { rank: 'ІІІ', val: 29.0 },
      { rank: 'І-юн', val: 30.5 },
      { rank: 'ІІ-юн', val: 32.0 },
      { rank: 'ІІІ-юн', val: 35.5 },
    ],
    indoorStandards: [
      { rank: 'МС', val: 24.40, auto: true },
      { rank: 'КМС', val: 25.2 },
      { rank: 'І', val: 26.3 },
      { rank: 'ІІ', val: 27.8 },
      { rank: 'ІІІ', val: 30.0 },
      { rank: 'І-юн', val: 31.5 },
      { rank: 'ІІ-юн', val: 33.0 },
      { rank: 'ІІІ-юн', val: 36.5 },
    ],
  },
  '300 м': {
    type: 'time',
    standards: [
      { rank: 'КМС', val: 39.5 },
      { rank: 'І', val: 41.5 },
      { rank: 'ІІ', val: 46.0 },
      { rank: 'ІІІ', val: 48.0 },
      { rank: 'І-юн', val: 50.0 },
      { rank: 'ІІ-юн', val: 53.0 },
      { rank: 'ІІІ-юн', val: 56.0 },
    ],
    indoorStandards: [
      { rank: 'КМС', val: 39.5 },
      { rank: 'І', val: 41.5 },
      { rank: 'ІІ', val: 46.0 },
      { rank: 'ІІІ', val: 50.0 },
      { rank: 'І-юн', val: 52.0 },
      { rank: 'ІІ-юн', val: 55.0 },
      { rank: 'ІІІ-юн', val: 59.0 },
    ],
  },
  '400 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 51.35, auto: true },
      { rank: 'МС', val: 53.50, auto: true },
      { rank: 'КМС', val: 55.5 },
      { rank: 'І', val: 58.5 },
      { rank: 'ІІ', val: 62.5 },
      { rank: 'ІІІ', val: 67.0 },
      { rank: 'І-юн', val: 73.0 },
      { rank: 'ІІ-юн', val: 77.0 },
      { rank: 'ІІІ-юн', val: 79.0 },
    ],
    indoorStandards: [
      { rank: 'МСМК', val: 52.75, auto: true },
      { rank: 'МС', val: 54.50, auto: true },
      { rank: 'КМС', val: 56.5 },
      { rank: 'І', val: 59.5 },
      { rank: 'ІІ', val: 64.5 },
      { rank: 'ІІІ', val: 69.0 },
      { rank: 'І-юн', val: 75.0 },
      { rank: 'ІІ-юн', val: 79.0 },
      { rank: 'ІІІ-юн', val: 81.0 },
    ],
  },
  '800 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 121.3, auto: true },
      { rank: 'МС', val: 125.5, auto: true },
      { rank: 'КМС', val: 132.0 },
      { rank: 'І', val: 142.0 },
      { rank: 'ІІ', val: 150.0 },
      { rank: 'ІІІ', val: 175.0 },
      { rank: 'І-юн', val: 185.0 },
      { rank: 'ІІ-юн', val: 198.0 },
      { rank: 'ІІІ-юн', val: 215.0 },
    ],
    indoorStandards: [
      { rank: 'МСМК', val: 122.5, auto: true },
      { rank: 'МС', val: 126.5, auto: true },
      { rank: 'КМС', val: 134.0 },
      { rank: 'І', val: 142.0 },
      { rank: 'ІІ', val: 152.0 },
      { rank: 'ІІІ', val: 175.0 },
      { rank: 'І-юн', val: 185.0 },
      { rank: 'ІІ-юн', val: 198.0 },
      { rank: 'ІІІ-юн', val: 215.0 },
    ],
  },
  '1000 м': {
    type: 'time',
    standards: [
      { rank: 'МС', val: 164.0, auto: true },
      { rank: 'КМС', val: 172.0 },
      { rank: 'І', val: 184.0 },
      { rank: 'ІІ', val: 199.0 },
      { rank: 'ІІІ', val: 220.0 },
      { rank: 'І-юн', val: 240.0 },
      { rank: 'ІІ-юн', val: 260.0 },
      { rank: 'ІІІ-юн', val: 285.0 },
    ],
  },
  '1500 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 248.0, auto: true },
      { rank: 'МС', val: 258.0, auto: true },
      { rank: 'КМС', val: 274.0 },
      { rank: 'І', val: 292.0 },
      { rank: 'ІІ', val: 315.0 },
      { rank: 'ІІІ', val: 345.0 },
      { rank: 'І-юн', val: 365.0 },
      { rank: 'ІІ-юн', val: 390.0 },
      { rank: 'ІІІ-юн', val: 430.0 },
    ],
    indoorStandards: [
      { rank: 'МСМК', val: 250.0, auto: true },
      { rank: 'МС', val: 260.0, auto: true },
      { rank: 'КМС', val: 280.0 },
      { rank: 'І', val: 295.0 },
      { rank: 'ІІ', val: 320.0 },
      { rank: 'ІІІ', val: 350.0 },
      { rank: 'І-юн', val: 375.0 },
      { rank: 'ІІ-юн', val: 405.0 },
      { rank: 'ІІІ-юн', val: 450.0 },
    ],
  },
  '3000 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 535.0, auto: true },
      { rank: 'МС', val: 555.0, auto: true },
      { rank: 'КМС', val: 585.0 },
      { rank: 'І', val: 630.0 },
      { rank: 'ІІ', val: 690.0 },
      { rank: 'ІІІ', val: 750.0 },
    ],
    indoorStandards: [
      { rank: 'МСМК', val: 539.0, auto: true },
      { rank: 'МС', val: 560.0, auto: true },
      { rank: 'КМС', val: 590.0 },
      { rank: 'І', val: 640.0 },
      { rank: 'ІІ', val: 700.0 },
      { rank: 'ІІІ', val: 760.0 },
    ],
  },
  '5000 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 935.0, auto: true },
      { rank: 'МС', val: 990.0, auto: true },
      { rank: 'КМС', val: 1050.0 },
      { rank: 'І', val: 1110.0 },
      { rank: 'ІІ', val: 1175.0 },
      { rank: 'ІІІ', val: 1310.0 },
    ],
  },
  '10000 м': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 1950.0, auto: true },
      { rank: 'МС', val: 2065.0, auto: true },
      { rank: 'КМС', val: 2150.0 },
      { rank: 'І', val: 2300.0 },
      { rank: 'ІІ', val: 2475.0 },
      { rank: 'ІІІ', val: 2640.0 },
    ],
  },
  '60 м з бар’єрами': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 8.15, auto: true },
      { rank: 'МС', val: 8.50, auto: true },
      { rank: 'КМС', val: 8.7 },
      { rank: 'І', val: 9.2 },
      { rank: 'ІІ', val: 9.8 },
      { rank: 'ІІІ', val: 10.4 },
      { rank: 'І-юн', val: 10.8 },
      { rank: 'ІІ-юн', val: 11.5 },
      { rank: 'ІІІ-юн', val: 12.6 },
    ],
  },
  '100 м з бар’єрами': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 13.00, auto: true },
      { rank: 'МС', val: 13.85, auto: true },
      { rank: 'КМС', val: 14.6 },
      { rank: 'І', val: 15.2 },
      { rank: 'ІІ', val: 16.4 },
      { rank: 'ІІІ', val: 18.0 },
      { rank: 'І-юн', val: 19.5 },
      { rank: 'ІІ-юн', val: 20.0 },
      { rank: 'ІІІ-юн', val: 22.0 },
    ],
  },
  '300 м з бар’єрами': {
    type: 'time',
    standards: [
      { rank: 'І', val: 47.5 },
      { rank: 'ІІ', val: 51.5 },
      { rank: 'ІІІ', val: 56.0 },
      { rank: 'І-юн', val: 60.0 },
      { rank: 'ІІ-юн', val: 62.0 },
      { rank: 'ІІІ-юн', val: 64.0 },
    ],
  },
  '400 м з бар’єрами': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 55.80, auto: true },
      { rank: 'МС', val: 59.50, auto: true },
      { rank: 'КМС', val: 62.5 },
      { rank: 'І', val: 66.0 },
      { rank: 'ІІ', val: 69.5 },
      { rank: 'ІІІ', val: 76.0 },
      { rank: 'І-юн', val: 80.0 },
    ],
  },
  '2000 м з перешкодами': {
    type: 'time',
    standards: [
      { rank: 'КМС', val: 410.0 },
      { rank: 'І', val: 430.0 },
      { rank: 'ІІ', val: 450.0 },
      { rank: 'ІІІ', val: 480.0 },
    ],
    indoorStandards: [
      { rank: 'КМС', val: 400.0 },
      { rank: 'І', val: 421.0 },
      { rank: 'ІІ', val: 447.0 },
      { rank: 'ІІІ', val: 480.0 },
    ],
  },
  '3000 м з перешкодами': {
    type: 'time',
    standards: [
      { rank: 'МСМК', val: 590.0, auto: true },
      { rank: 'МС', val: 625.0, auto: true },
      { rank: 'КМС', val: 660.0 },
      { rank: 'І', val: 695.0 },
      { rank: 'ІІ', val: 745.0 },
      { rank: 'ІІІ', val: 800.0 },
    ],
    indoorStandards: [
      { rank: 'МС', val: 600.0, auto: true },
      { rank: 'КМС', val: 630.0 },
      { rank: 'І', val: 660.0 },
      { rank: 'ІІ', val: 690.0 },
      { rank: 'ІІІ', val: 710.0 },
    ],
  },
  'Естафета 4х100 м': {
    type: 'time',
    standards: [
      { rank: 'МС', val: 45.30, auto: true },
      { rank: 'КМС', val: 47.5 },
      { rank: 'І', val: 50.0 },
      { rank: 'ІІ', val: 53.0 },
      { rank: 'ІІІ', val: 56.0 },
      { rank: 'І-юн', val: 60.0 },
      { rank: 'ІІ-юн', val: 62.5 },
      { rank: 'ІІІ-юн', val: 66.5 },
    ],
  },
  'Естафета 4х400 м': {
    type: 'time',
    standards: [
      { rank: 'МС', val: 213.0, auto: true },
      { rank: 'КМС', val: 224.0 },
      { rank: 'І', val: 240.0 },
      { rank: 'ІІ', val: 255.0 },
      { rank: 'ІІІ', val: 270.0 },
      { rank: 'І-юн', val: 290.0 },
      { rank: 'ІІ-юн', val: 308.0 },
      { rank: 'ІІІ-юн', val: 328.0 },
    ],
  },
  'Естафета 100+200+300+400 м': {
    type: 'time',
    standards: [
      { rank: 'КМС', val: 132.0 },
      { rank: 'І', val: 134.3 },
      { rank: 'ІІ', val: 137.0 },
      { rank: 'ІІІ', val: 140.0 },
      { rank: 'І-юн', val: 142.5 },
      { rank: 'ІІ-юн', val: 155.5 },
      { rank: 'ІІІ-юн', val: 157.5 },
    ],
  },
  'Стрибки у висоту': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 1.92 },
      { rank: 'МС', val: 1.83 },
      { rank: 'КМС', val: 1.75 },
      { rank: 'І', val: 1.65 },
      { rank: 'ІІ', val: 1.50 },
      { rank: 'ІІІ', val: 1.40 },
      { rank: 'І-юн', val: 1.30 },
      { rank: 'ІІ-юн', val: 1.20 },
      { rank: 'ІІІ-юн', val: 1.10 },
    ],
  },
  'Стрибки з жердиною': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 4.40 },
      { rank: 'МС', val: 3.90 },
      { rank: 'КМС', val: 3.40 },
      { rank: 'І', val: 3.00 },
      { rank: 'ІІ', val: 2.70 },
      { rank: 'ІІІ', val: 2.40 },
      { rank: 'І-юн', val: 2.20 },
      { rank: 'ІІ-юн', val: 2.00 },
      { rank: 'ІІІ-юн', val: 1.80 },
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
      { rank: 'І-юн', val: 8.00 },
      { rank: 'ІІ-юн', val: 7.00 },
      { rank: 'ІІІ-юн', val: 6.00 },
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
  'Метання молота': {
    type: 'distance',
    standards: [
      { rank: 'МСМК', val: 69.00 },
      { rank: 'МС', val: 60.00 },
      { rank: 'КМС', val: 54.00 },
      { rank: 'І', val: 48.00 },
      { rank: 'ІІ', val: 42.00 },
      { rank: 'ІІІ', val: 33.00 },
      { rank: 'І-юн', val: 29.00 },
      { rank: 'ІІ-юн', val: 24.00 },
      { rank: 'ІІІ-юн', val: 22.00 },
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
      { rank: 'І-юн', val: 21.00 },
      { rank: 'ІІ-юн', val: 19.00 },
      { rank: 'ІІІ-юн', val: 16.00 },
    ],
  },
  'П’ятиборство': {
    type: 'points',
    standards: [
      { rank: 'МСМК', val: 4500 },
      { rank: 'МС', val: 4000 },
      { rank: 'КМС', val: 3500 },
      { rank: 'І', val: 3100 },
      { rank: 'ІІ', val: 2550 },
      { rank: 'ІІІ', val: 2000 },
      { rank: 'І-юн', val: 1600 },
      { rank: 'ІІ-юн', val: 1400 },
      { rank: 'ІІІ-юн', val: 1200 },
    ],
  },
  'Семиборство': {
    type: 'points',
    standards: [
      { rank: 'МСМК', val: 6150 },
      { rank: 'МС', val: 5400 },
      { rank: 'КМС', val: 4700 },
      { rank: 'І', val: 4000 },
      { rank: 'ІІ', val: 3200 },
      { rank: 'ІІІ', val: 2400 },
      { rank: 'І-юн', val: 2100 },
      { rank: 'ІІ-юн', val: 1600 },
      { rank: 'ІІІ-юн', val: 1100 },
    ],
  },
  'Десятиборство': {
    type: 'points',
    standards: [
      { rank: 'МСМК', val: 8000 },
      { rank: 'МС', val: 7400 },
      { rank: 'КМС', val: 6700 },
      { rank: 'І', val: 6100 },
      { rank: 'ІІ', val: 5300 },
      { rank: 'ІІІ', val: 4500 },
      { rank: 'І-юн', val: 4100 },
      { rank: 'ІІ-юн', val: 3600 },
      { rank: 'ІІІ-юн', val: 3200 },
    ],
  },
};

/**
 * Визначає кваліфікаційний розряд (ЄСКУ) за результатом, статтю, видом спорту, типом хронометражу та типом арени (indoor/outdoor)
 */
export function determineSportRank(
  gender: string,
  disciplineName: string,
  value: number,
  timing?: string,
  indoor?: boolean,
): SportRank | null {
  if (value === undefined || value === null || Number.isNaN(value) || value <= 0) return null;
  const table = gender === 'F' ? WOMEN_STANDARDS : MEN_STANDARDS;
  const cfg = table[disciplineName];
  if (!cfg) return null;

  const isSprint = [
    '60 м',
    '100 м',
    '200 м',
    '300 м',
    '400 м',
    '60 м з бар’єрами',
    '100 м з бар’єрами',
    '110 м з бар’єрами',
    '300 м з бар’єрами',
    '400 м з бар’єрами',
    'Естафета 4х100 м',
    'Естафета 4х400 м',
    'Естафета 100+200+300+400 м',
  ].includes(disciplineName);

  const standardsList = indoor && cfg.indoorStandards ? cfg.indoorStandards : cfg.standards;

  for (const item of standardsList) {
    if (cfg.type === 'time') {
      const targetVal = item.val;
      let checkVal = value;

      if (isSprint) {
        const isStandardElectronic = item.auto ?? (Math.round(item.val * 10) !== item.val * 10);
        if (isStandardElectronic) {
          // Стандарт електронний («а»): до ручного результату додається 0.24 с
          if (timing === 'manual') checkVal = Math.round((value + 0.24) * 100) / 100;
        } else {
          // Стандарт ручний: за автохронометражу норма збільшується на 0.24 с (еквівалентно value - 0.24 <= item.val)
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
