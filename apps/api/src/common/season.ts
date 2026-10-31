export interface SeasonSpec {
  year: number;
  indoor: boolean;
  label: string;
}

/**
 * Визначення сезону за датою та (опціонально) назвою змагання:
 * - Якщо в назві явно вказано «у приміщенні», «манеж», «різдвяні старти» — це indoor.
 * - Якщо в назві явно вказано «з метань» або «з кросу» — це outdoor (навіть узимку/навесні).
 * - Інакше за датою: квітень - жовтень (4..10) = outdoor, листопад - березень (11..12, 1..3) = indoor.
 *   Листопад та грудень поточного року відносяться до сезону наступного року.
 */
export function determineSeason(
  date: Date | string = new Date(),
  competitionName?: string,
): SeasonSpec {
  const d = new Date(date);
  const month = d.getUTCMonth() + 1; // 1 = Jan .. 12 = Dec
  const calYear = d.getUTCFullYear();
  const seasonYear = month >= 11 ? calYear + 1 : calYear;

  let indoor: boolean;
  if (competitionName && /приміщен|манеж|різдвян|indoor/i.test(competitionName)) {
    indoor = true;
  } else if (competitionName && /метан|крос|шосе|марафон|outdoor/i.test(competitionName)) {
    indoor = false;
  } else {
    indoor = month < 4 || month > 10;
  }

  return {
    year: seasonYear,
    indoor,
    label: `${seasonYear}${indoor ? ' (i)' : ''}`,
  };
}

export function isCurrentSeason(
  season: { year: number; indoor: boolean },
  now: Date | string = new Date(),
): boolean {
  const curr = determineSeason(now);
  return season.year === curr.year && season.indoor === curr.indoor;
}
