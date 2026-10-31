import { parseProtocolValue } from '../../../common/protocol-parser';

export function decodeHtmlEntities(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export const IKS_OBLAST_MAP: Record<string, string> = {
  chng: 'Чернігівська',
  kyiv: 'Київська',
  dnip: 'Дніпропетровська',
  odes: 'Одеська',
  vinn: 'Вінницька',
  lviv: 'Львівська',
  khar: 'Харківська',
  zapr: 'Запорізька',
  sumy: 'Сумська',
  polt: 'Полтавська',
  cher: 'Черкаська',
  zhto: 'Житомирська',
  voly: 'Волинська',
  rivn: 'Рівненська',
  tern: 'Тернопільська',
  ivano: 'Івано-Франківська',
  zaka: 'Закарпатська',
  khem: 'Хмельницька',
  chrv: 'Чернівецька',
  kiro: 'Кіровоградська',
  myko: 'Миколаївська',
  kher: 'Херсонська',
  done: 'Донецька',
  luha: 'Луганська',
  krym: 'АР Крим',
  sev: 'Севастополь',
};

export function formatUkrainianName(str?: string): string {
  if (!str) return '';
  const parts = str.trim().split(/([\s-]+)/);
  return parts
    .map((part) => {
      if (!part || part === ' ' || part === '-') return part;
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

export function parseUarDateToIso(str?: string): string {
  if (!str) return '';
  const parts = str.trim().split('.');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${month}-${day}`;
  }
  return str;
}

export function detectCompetitionLevel(title?: string): 'city' | 'regional' | 'national' | 'international' {
  const lower = (title || '').toLowerCase();
  if (lower.includes('міжнародн') || lower.includes('європ') || lower.includes('світ')) {
    return 'international';
  }
  if (
    lower.includes('україни') ||
    lower.includes('кубок україни') ||
    lower.includes('чемпіонат україни') ||
    lower.includes('всеукраїнськ') ||
    lower.includes('вз ')
  ) {
    return 'national';
  }
  if (lower.includes('област') || lower.includes('обласна') || lower.includes('обласний')) {
    return 'regional';
  }
  if (lower.includes('міст') || lower.includes('міська') || lower.includes('міський')) {
    return 'city';
  }
  return 'national';
}

export function detectGenderFromLabel(label?: string): 'M' | 'F' {
  const lower = (label || '').toLowerCase();
  if (
    lower.includes('жін') ||
    lower.includes('дівч') ||
    lower.includes('women') ||
    lower.includes('girls')
  ) {
    return 'F';
  }
  return 'M';
}

export function isFinalRoundLabel(roundLabel?: string, combinedEventLabel?: string): boolean {
  if (combinedEventLabel && combinedEventLabel.trim() !== '') {
    return false;
  }
  const lower = (roundLabel || '').toLowerCase().trim();
  if (!lower) return false;
  if (
    lower.includes('1/2') ||
    lower.includes('1/4') ||
    lower.includes('півфінал') ||
    lower.includes('кваліф') ||
    lower.includes('поперед') ||
    lower.includes('виставк') ||
    lower.includes('борств') ||
    lower.includes('qualification') ||
    lower.includes('semi')
  ) {
    return false;
  }
  return lower.includes('фінал') || lower.includes('final');
}

export function isFieldOrPointsDiscipline(disciplineName?: string, isTechFlag?: boolean): boolean {
  if (isTechFlag) return true;
  const lower = (disciplineName || '').toLowerCase();
  return /стриб|висот|довжин|жердин|потрійн|ядр|спис|диск|молот|борств/i.test(lower);
}

/**
 * Обчислює загальні місця у фіналі серед усіх учасників (усіх забігів/потоків)
 * до застосування регіонального фільтра.
 */
export function computeOverallFinalPlaces<T>(
  entries: Array<{ item: T; rawMark: string; heatPlace?: number }>,
  higherWins: boolean,
): Map<T, number> {
  const rankMap = new Map<T, number>();
  const scored: Array<{ item: T; sortKey: number; heatPlace: number }> = [];

  for (const entry of entries) {
    const parsed = parseProtocolValue(entry.rawMark);
    if (parsed.status !== 'OK' || parsed.val == null || isNaN(parsed.val)) {
      continue;
    }
    const sortKey = higherWins ? -parsed.val : parsed.val;
    const heatPlace =
      typeof entry.heatPlace === 'number' && !isNaN(entry.heatPlace) && entry.heatPlace > 0
        ? entry.heatPlace
        : 999;
    scored.push({ item: entry.item, sortKey, heatPlace });
  }

  scored.sort((a, b) => {
    if (Math.abs(a.sortKey - b.sortKey) > 1e-6) {
      return a.sortKey - b.sortKey;
    }
    return a.heatPlace - b.heatPlace;
  });

  let i = 0;
  while (i < scored.length) {
    let j = i + 1;
    while (j < scored.length && Math.abs(scored[j].sortKey - scored[i].sortKey) <= 1e-6) {
      j++;
    }
    const place = i + 1;
    for (let k = i; k < j; k++) {
      rankMap.set(scored[k].item, place);
    }
    i = j;
  }

  return rankMap;
}

