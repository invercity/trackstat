/**
 * Спільні утиліти парсингу спортивних протоколів легкої атлетики (Word / PDF / Excel).
 */

export function parseProtocolDob(s: string): Date | null {
  if (!s) return null;
  const clean = s.trim();
  const p = clean.split('.');
  if (p.length === 3) {
    let day = parseInt(p[0], 10);
    let month = parseInt(p[1], 10);
    const year = parseInt(p[2], 10);
    if (isNaN(year)) return null;
    if (isNaN(month) || month < 1) month = 1;
    if (month > 12) month = 12;
    if (isNaN(day) || day < 1) day = 1;
    if (day > 31) day = 28;
    return new Date(Date.UTC(year, month - 1, day));
  } else if (p.length === 1 && p[0].length === 4) {
    const year = parseInt(p[0], 10);
    if (!isNaN(year)) return new Date(Date.UTC(year, 0, 1));
  }
  return null;
}

export interface ParsedProtocolValue {
  status: string;
  val: number | null;
  timing?: 'manual' | 'electronic';
  isFinal: boolean;
  heatStr?: string;
  raw: string;
}

export function parseProtocolValue(str: string): ParsedProtocolValue {
  if (!str) {
    return { status: 'DNS', val: null, timing: undefined, isFinal: false, raw: str };
  }
  const s = str.trim().toUpperCase();
  if (['DNS', 'DNF', 'DQ', 'NM'].includes(s)) {
    return { status: s, val: null, timing: undefined, isFinal: false, raw: str };
  }

  let target = s;
  let isFinal = false;
  let heatStr: string | undefined;

  if (s.includes('Ф-')) {
    isFinal = true;
    const parts = s.split('Ф-');
    target = parts[1].trim();
    if (parts[0].trim()) {
      heatStr = parts[0].trim();
    }
  }
  target = target.replace(',', '.');

  let timing: 'manual' | 'electronic' = 'electronic';

  // Format mm:ss.xx or mm:ss,x
  const colParts = target.split(':');
  if (colParts.length === 2) {
    const mins = parseFloat(colParts[0]);
    const secs = parseFloat(colParts[1]);
    const secDecimals = colParts[1].split('.')[1];
    if (!secDecimals || secDecimals.length === 1) {
      timing = 'manual';
    } else {
      timing = 'electronic';
    }
    return {
      status: 'OK',
      val: Math.round((mins * 60 + secs) * 100) / 100,
      timing,
      isFinal,
      heatStr,
      raw: str,
    };
  }

  // Format mm.ss.xx
  const dotParts = target.split('.');
  if (dotParts.length === 3) {
    const mins = parseFloat(dotParts[0]);
    const secs = parseFloat(dotParts[1] + '.' + dotParts[2]);
    if (dotParts[2].length === 1) {
      timing = 'manual';
    } else {
      timing = 'electronic';
    }
    return {
      status: 'OK',
      val: Math.round((mins * 60 + secs) * 100) / 100,
      timing,
      isFinal,
      heatStr,
      raw: str,
    };
  }

  // Decimal seconds or meters
  const num = parseFloat(target);
  if (!isNaN(num)) {
    const dec = target.split('.')[1];
    if (!dec || dec.length === 1) {
      timing = 'manual';
    } else {
      timing = 'electronic';
    }
    return {
      status: 'OK',
      val: Math.round(num * 100) / 100,
      timing,
      isFinal,
      heatStr,
      raw: str,
    };
  }

  return { status: 'UNKNOWN', val: null, timing: undefined, isFinal, heatStr, raw: str };
}

export function matchStandardDisciplineName(title: string): string | null {
  if (title.includes('110 м з/б')) return '110 м з бар’єрами';
  if (title.includes('100 м з/б')) return '100 м з бар’єрами';
  if (title.includes('Біг 100 м') || title.includes('100 м')) return '100 м';
  if (title.includes('Біг 200 м') || title.includes('200 м')) return '200 м';
  if (title.includes('Біг 400 м') || title.includes('400 м')) return '400 м';
  if (title.includes('Біг 800 м') || title.includes('800 м')) return '800 м';
  if (title.includes('Біг 1500 м') || title.includes('1500 м')) return '1500 м';
  if (title.includes('Естафетний біг') || title.includes('100+200+300+400')) return 'Естафета 100+200+300+400 м';
  if (title.includes('4х100')) return 'Естафета 4х100 м';
  if (title.includes('4х400')) return 'Естафета 4х400 м';
  if (title.includes('висота') || title.includes('висоту')) return 'Стрибки у висоту';
  if (title.includes('довжина') || title.includes('довжину')) return 'Стрибки у довжину';
  if (title.includes('потрійний')) return 'Потрійний стрибок';
  if (title.includes('жердин')) return 'Стрибки з жердиною';
  if (title.includes('ядро') || title.includes('ядра')) return 'Штовхання ядра';
  if (title.includes('спис') || title.includes('списа')) return 'Метання списа';
  if (title.includes('диск') || title.includes('диска')) return 'Метання диска';
  if (title.includes('молот') || title.includes('молота')) return 'Метання молота';
  return null;
}
