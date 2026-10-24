/**
 * Спільні утиліти парсингу спортивних протоколів легкої атлетики (Word / PDF / Excel / Text).
 */

export function parseProtocolDob(s: string): Date | null {
  if (!s) return null;
  const clean = s.trim().replace(/[,\s]/g, '.');
  const p = clean.split('.').filter(Boolean);
  if (p.length === 3) {
    let day = parseInt(p[0], 10);
    let month = parseInt(p[1], 10);
    let year = parseInt(p[2], 10);
    if (isNaN(year)) return null;
    // Handle 2-digit years if any
    if (year < 100) year += year > 40 ? 1900 : 2000;
    if (isNaN(month) || month < 1) month = 1;
    if (month > 12) month = 12;
    if (isNaN(day) || day < 1) day = 1;
    if (day > 31) day = 28;
    return new Date(Date.UTC(year, month - 1, day));
  } else if (p.length === 1 && p[0].length === 4) {
    const year = parseInt(p[0], 10);
    if (!isNaN(year) && year > 1920 && year < 2100) return new Date(Date.UTC(year, 0, 1));
  }
  return null;
}

export interface ParsedMarkSingle {
  status: string;
  val: number | null;
  timing?: 'manual' | 'electronic';
  raw: string;
}

export function parseSingleMark(str: string): ParsedMarkSingle {
  if (!str) {
    return { status: 'DNS', val: null, raw: str };
  }
  const s = str.trim().toUpperCase().replace(/,/g, '.');
  if (['DNS', 'DNF', 'DQ', 'NM', 'Ф-DNS', 'Ф-DNF', 'Ф-DQ', 'Ф-NM'].includes(s)) {
    const cleanStatus = s.replace('Ф-', '');
    return { status: cleanStatus, val: null, raw: str };
  }

  let timing: 'manual' | 'electronic' = 'electronic';

  // Format mm:ss.xx or mm:ss.x
  const colParts = s.split(':');
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
      raw: str,
    };
  }

  // Format mm.ss.xx (with 2 dots)
  const dotParts = s.split('.');
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
      raw: str,
    };
  }

  // Single float: e.g. 11.2 or 11.24 or 1.85
  const num = parseFloat(s);
  if (!isNaN(num)) {
    const dec = s.split('.')[1];
    if (!dec || dec.length === 1) {
      timing = 'manual';
    } else {
      timing = 'electronic';
    }
    return {
      status: 'OK',
      val: Math.round(num * 100) / 100,
      timing,
      raw: str,
    };
  }

  return { status: 'UNKNOWN', val: null, raw: str };
}

export interface ParsedProtocolValue {
  status: string;
  val: number | null;
  timing?: 'manual' | 'electronic';
  isFinal: boolean;
  heatStr?: string;
  heatVal?: number | null;
  heatTiming?: 'manual' | 'electronic';
  finalStr?: string;
  finalVal?: number | null;
  finalTiming?: 'manual' | 'electronic';
  raw: string;
}

export function parseProtocolValue(str: string): ParsedProtocolValue {
  if (!str) {
    return { status: 'DNS', val: null, isFinal: false, raw: str };
  }
  const s = str.trim();

  // If contains final marker "Ф-"
  if (s.includes('Ф-')) {
    const parts = s.split('Ф-');
    const heatRaw = parts[0].trim();
    const finalRaw = parts[1].trim();

    let heatParsed: ParsedMarkSingle | null = null;
    if (heatRaw) {
      heatParsed = parseSingleMark(heatRaw);
    }
    const finalParsed = parseSingleMark(finalRaw);

    return {
      status: finalParsed.status !== 'UNKNOWN' ? finalParsed.status : 'OK',
      val: finalParsed.val,
      timing: finalParsed.timing,
      isFinal: true,
      heatStr: heatRaw || undefined,
      heatVal: heatParsed?.val ?? null,
      heatTiming: heatParsed?.timing,
      finalStr: finalRaw,
      finalVal: finalParsed.val,
      finalTiming: finalParsed.timing,
      raw: str,
    };
  }

  // Pure single mark (heats or field event)
  const single = parseSingleMark(s);
  return {
    status: single.status,
    val: single.val,
    timing: single.timing,
    isFinal: false,
    raw: str,
  };
}

export function matchStandardDisciplineName(title: string): string | null {
  const t = title.toLowerCase().replace(/\s+/g, ' ');

  // 1. Hurdles & Steeplechase (must precede flat running)
  if (/110\s*м?\s*(?:з\/б|з\.б|з\s*бар)/i.test(t)) return '110 м з бар’єрами';
  if (/100\s*м?\s*(?:з\/б|з\.б|з\s*бар)/i.test(t)) return '100 м з бар’єрами';
  if (/60\s*м?\s*(?:з\/б|з\.б|з\s*бар)/i.test(t)) return '60 м з бар’єрами';
  if (/400\s*м?\s*(?:з\/б|з\.б|з\s*бар)/i.test(t)) return '400 м з бар’єрами';
  if (/3000\s*м?\s*(?:з\/п|з\.п|з\s*перешк|перешк)/i.test(t)) return '3000 м з перешкодами';

  // 2. Relays
  if (/100\s*\+\s*200\s*\+\s*300\s*\+\s*400|шведськ/i.test(t)) return 'Естафета 100+200+300+400 м';
  if (/4\s*[хx]\s*100/i.test(t)) return 'Естафета 4х100 м';
  if (/4\s*[хx]\s*400/i.test(t)) return 'Естафета 4х400 м';
  if (/4\s*[хx]\s*800/i.test(t)) return 'Естафета 4х800 м';
  if (/естафет/i.test(t)) return 'Естафета 100+200+300+400 м';

  // 3. Flat running
  if (/(?:біг\s+)?10000\s*м/i.test(t) || t === '10000 м') return '10000 м';
  if (/(?:біг\s+)?5000\s*м/i.test(t) || t === '5000 м') return '5000 м';
  if (/(?:біг\s+)?3000\s*м/i.test(t) || t === '3000 м') return '3000 м';
  if (/(?:біг\s+)?1500\s*м/i.test(t) || t === '1500 м') return '1500 м';
  if (/(?:біг\s+)?800\s*м/i.test(t) || t === '800 м') return '800 м';
  if (/(?:біг\s+)?400\s*м/i.test(t) || t === '400 м') return '400 м';
  if (/(?:біг\s+)?200\s*м/i.test(t) || t === '200 м') return '200 м';
  if (/(?:біг\s+)?100\s*м/i.test(t) || t === '100 м') return '100 м';
  if (/(?:біг\s+)?60\s*м/i.test(t) || t === '60 м') return '60 м';

  // 4. Jumps
  if (/висот/i.test(t)) return 'Стрибки у висоту';
  if (/довжин/i.test(t)) return 'Стрибки у довжину';
  if (/потрійн/i.test(t)) return 'Потрійний стрибок';
  if (/жердин/i.test(t)) return 'Стрибки з жердиною';

  // 5. Throws
  if (/ядр/i.test(t)) return 'Штовхання ядра';
  if (/спис/i.test(t)) return 'Метання списа';
  if (/диск/i.test(t)) return 'Метання диска';
  if (/молот/i.test(t)) return 'Метання молота';

  // 6. Multi-events
  if (/семибор/i.test(t)) return 'Семиборство';
  if (/десятибор/i.test(t)) return 'Десятиборство';

  return null;
}
