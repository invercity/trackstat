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
  wind?: number;
  raw: string;
}

export function parseSingleMark(str: string): ParsedMarkSingle {
  if (!str) {
    return { status: 'DNS', val: null, raw: str };
  }
  let s = str.trim().toUpperCase().replace(/,/g, '.');
  let wind: number | undefined;

  // Handle jump/sprint mark with wind after slash, e.g. "5.67/0.0", "5.44/+2.4", "10.97/-0.6"
  if (s.includes('/')) {
    const slashParts = s.split('/');
    s = slashParts[0].trim();
    const windStr = slashParts[1]?.trim();
    if (windStr && /^[+-]?\d+(?:\.\d+)?$/.test(windStr)) {
      wind = parseFloat(windStr);
    }
  }

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
      wind,
      raw: str,
    };
  }

  // Format mm.ss.xx (with 2 dots, strictly numeric parts)
  const dotParts = s.split('.');
  if (dotParts.length === 3 && /^\d+\.\d+\.\d+$/.test(s)) {
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
      wind,
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
      wind,
      raw: str,
    };
  }

  return { status: 'UNKNOWN', val: null, raw: str };
}

export interface ParsedProtocolValue {
  status: string;
  val: number | null;
  timing?: 'manual' | 'electronic';
  wind?: number;
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
      wind: finalParsed.wind ?? heatParsed?.wind,
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
    wind: single.wind,
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
  if (/300\s*м?\s*(?:з\/б|з\.б|з\s*бар)/i.test(t)) return '300 м з бар’єрами';
  if (/400\s*м?\s*(?:з\/б|з\.б|з\s*бар)/i.test(t)) return '400 м з бар’єрами';
  if (/2000\s*м?\s*(?:з\/п|з\.п|з\s*перешк|перешк)/i.test(t)) return '2000 м з перешкодами';
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
  if (/п['’]?ятибор|5-?бор/i.test(t)) return 'П’ятиборство';
  if (/семибор|7-?бор/i.test(t)) return 'Семиборство';
  if (/десятибор|10-?бор/i.test(t)) return 'Десятиборство';

  return null;
}

/**
 * Повертає числовий порядок легкоатлетичної дисципліни (60м -> 100м -> 200м -> 400м -> 800м -> 1500м -> 3000м -> 5000м -> 10000м -> бар'єри -> перешкоди -> стрибки -> метання -> багатоборства -> естафети).
 */
export function getDisciplineSortWeight(name?: string | null): number {
  if (!name) return 9999;
  const t = name.toLowerCase().replace(/\s+/g, ' ').trim();

  // 1. Relays (500+)
  if (t.includes('естафет') || /4\s*[хx]\s*\d+/i.test(t)) {
    if (/4\s*[хx]\s*100/i.test(t)) return 510;
    if (/100\s*\+\s*200/i.test(t)) return 520;
    if (/4\s*[хx]\s*400/i.test(t)) return 530;
    if (/4\s*[хx]\s*800/i.test(t)) return 540;
    return 550;
  }

  // 2. Combined events (400+)
  if (t.includes('п’ятибор') || t.includes("п'ятибор") || t.includes('трибор')) return 405;
  if (t.includes('семибор')) return 410;
  if (t.includes('десятибор')) return 420;

  // 3. Throws (300+)
  if (t.includes('ядр')) return 310;
  if (t.includes('диск')) return 320;
  if (t.includes('молот')) return 330;
  if (t.includes('спис')) return 340;

  // 4. Jumps (200+)
  if (t.includes('висот')) return 210;
  if (t.includes('жердин')) return 220;
  if (t.includes('довжин')) return 230;
  if (t.includes('потрійн')) return 240;

  // 5. Hurdles & Steeplechase (100+)
  if (/бар|з\/б|з\.б/i.test(t)) {
    if (/\b60\b/.test(t)) return 110;
    if (/\b100\b/.test(t)) return 120;
    if (/\b110\b/.test(t)) return 130;
    if (/\b300\b/.test(t)) return 135;
    if (/\b400\b/.test(t)) return 140;
    return 145;
  }
  if (/перешк|з\/п|з\.п/i.test(t)) {
    if (/\b1500\b/.test(t)) return 150;
    if (/\b2000\b/.test(t)) return 155;
    if (/\b3000\b/.test(t)) return 160;
    return 165;
  }

  // 6. Cross-country / Non-stadium (600+, after all stadium disciplines)
  if (t.includes('крос')) {
    const kmMatch = t.match(/(\d+)\s*км/);
    return 600 + (kmMatch ? parseInt(kmMatch[1], 10) : 5);
  }

  // 7. Flat track running (1..89): extract distance in meters
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

export function compareDisciplineNames(a?: string | null, b?: string | null): number {
  const wA = getDisciplineSortWeight(a);
  const wB = getDisciplineSortWeight(b);
  if (wA !== wB) return wA - wB;
  return (a || '').localeCompare(b || '');
}
