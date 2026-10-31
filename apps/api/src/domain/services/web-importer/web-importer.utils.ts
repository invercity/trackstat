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
