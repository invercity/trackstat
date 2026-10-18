export interface SeasonSpec {
  year: number;
  indoor: boolean;
  label: string;
}

/**
 * Визначення сезону за датою:
 * - Сезон outdoor (стадіон): квітень - жовтень (місяці 4..10)
 * - Сезон indoor (манеж): листопад - березень (місяці 11..12 та 1..3)
 *   Листопад та грудень поточного року відносяться до indoor сезону наступного року.
 *   Січень - березень відносяться до indoor сезону поточного року.
 */
export function determineSeason(date: Date | string = new Date()): SeasonSpec {
  const d = new Date(date);
  const month = d.getUTCMonth() + 1; // 1 = Jan .. 12 = Dec
  const calYear = d.getUTCFullYear();

  if (month >= 4 && month <= 10) {
    return {
      year: calYear,
      indoor: false,
      label: `${calYear}`,
    };
  }

  const seasonYear = month >= 11 ? calYear + 1 : calYear;
  return {
    year: seasonYear,
    indoor: true,
    label: `${seasonYear} (i)`,
  };
}

export function isCurrentSeason(
  season: { year: number; indoor: boolean },
  now: Date | string = new Date(),
): boolean {
  const curr = determineSeason(now);
  return season.year === curr.year && season.indoor === curr.indoor;
}
