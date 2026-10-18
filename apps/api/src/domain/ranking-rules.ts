export type ScoringGroup = 'ADULT' | 'U23' | 'U20' | 'YOUTH';

// Points matrix from official criteria document
export const PLACE_POINTS: Record<string, Record<ScoringGroup, number[]>> = {
  world: {
    ADULT: [350, 310, 280, 250, 230, 215, 200, 185, 130, 120, 110, 100],
    U23:   [310, 280, 250, 230, 215, 200, 185, 130, 120, 110, 100, 90],
    U20:   [280, 250, 230, 215, 200, 185, 130, 120, 110, 100, 90, 80],
    YOUTH: [250, 230, 215, 200, 185, 130, 120, 110, 100, 90, 80, 70],
  },
  europe: {
    ADULT: [240, 210, 185, 170, 155, 145, 135, 125, 90, 80, 70, 60],
    U23:   [210, 185, 170, 155, 145, 135, 125, 90, 80, 70, 60, 50],
    U20:   [185, 170, 155, 145, 135, 125, 90, 80, 70, 60, 50, 40],
    YOUTH: [170, 155, 145, 135, 125, 90, 80, 70, 60, 50, 40, 30],
  },
  ukraine: {
    ADULT: [200, 170, 150, 140, 130, 120, 110, 100, 70, 60, 50, 45],
    U23:   [170, 150, 140, 130, 120, 110, 100, 70, 60, 50, 45, 40],
    U20:   [150, 140, 130, 120, 110, 100, 70, 60, 50, 45, 40, 35],
    YOUTH: [140, 130, 120, 110, 100, 70, 60, 50, 45, 40, 35, 25],
  },
  obl: {
    ADULT: [60, 50, 45, 40, 35, 30, 27, 25, 23, 21, 19, 16],
    U23:   [50, 45, 40, 35, 30, 27, 25, 23, 21, 19, 16, 14],
    U20:   [45, 40, 35, 30, 27, 25, 23, 21, 19, 16, 14, 12],
    YOUTH: [40, 35, 30, 27, 25, 23, 21, 19, 16, 14, 12, 10],
  },
  team_ukraine: {
    ADULT: [170, 150, 140, 130, 120, 110, 100, 70, 60, 50, 45, 40],
    U23:   [150, 140, 130, 120, 110, 100, 70, 60, 50, 45, 40, 35],
    U20:   [140, 130, 120, 110, 100, 70, 60, 50, 45, 40, 35, 30],
    YOUTH: [130, 120, 110, 100, 70, 60, 50, 45, 40, 35, 25, 20],
  },
  cup_ukraine: {
    ADULT: [150, 140, 130, 120, 110, 100, 70, 60, 50, 45, 40, 35],
    U23:   [140, 130, 120, 110, 100, 70, 60, 50, 45, 40, 35, 30],
    U20:   [140, 130, 120, 110, 100, 70, 60, 50, 45, 40, 35, 30],
    YOUTH: [130, 120, 110, 100, 70, 60, 50, 45, 40, 35, 25, 20],
  },
  olympic: {
    ADULT: [350, 310, 280, 250, 230, 215, 200, 185, 130, 120, 110, 100],
    U23:   [310, 280, 250, 230, 215, 200, 185, 130, 120, 110, 100, 90],
    U20:   [280, 250, 230, 215, 200, 185, 130, 120, 110, 100, 90, 80],
    YOUTH: [250, 230, 215, 200, 185, 130, 120, 110, 100, 90, 80, 70],
  },
  youth_olympic: {
    ADULT: [250, 230, 215, 200, 185, 130, 120, 110, 100, 90, 80, 70],
    U23:   [250, 230, 215, 200, 185, 130, 120, 110, 100, 90, 80, 70],
    U20:   [250, 230, 215, 200, 185, 130, 120, 110, 100, 90, 80, 70],
    YOUTH: [250, 230, 215, 200, 185, 130, 120, 110, 100, 90, 80, 70],
  },
  universiade: {
    ADULT: [310, 280, 250, 230, 215, 200, 185, 130, 120, 110, 100, 90],
    U23:   [310, 280, 250, 230, 215, 200, 185, 130, 120, 110, 100, 90],
    U20:   [280, 250, 230, 215, 200, 185, 130, 120, 110, 100, 90, 80],
    YOUTH: [250, 230, 215, 200, 185, 130, 120, 110, 100, 90, 80, 70],
  },
  euro_youth: {
    ADULT: [170, 155, 145, 135, 125, 90, 80, 70, 60, 50, 40, 30],
    U23:   [170, 155, 145, 135, 125, 90, 80, 70, 60, 50, 40, 30],
    U20:   [170, 155, 145, 135, 125, 90, 80, 70, 60, 50, 40, 30],
    YOUTH: [170, 155, 145, 135, 125, 90, 80, 70, 60, 50, 40, 30],
  },
  city: {
    ADULT: [30, 25, 22, 20, 17, 15, 13, 12, 11, 10, 9, 8],
    U23:   [25, 22, 20, 17, 15, 13, 12, 11, 10, 9, 8, 7],
    U20:   [22, 20, 17, 15, 13, 12, 11, 10, 9, 8, 7, 6],
    YOUTH: [20, 17, 15, 13, 12, 11, 10, 9, 8, 7, 6, 5],
  },
};

PLACE_POINTS.regional = PLACE_POINTS.obl;
PLACE_POINTS.national = PLACE_POINTS.ukraine;
PLACE_POINTS.international = PLACE_POINTS.europe;

export const PARTICIPATION_POINTS: Record<string, Record<ScoringGroup, number>> = {
  world: { ADULT: 175, U23: 155, U20: 140, YOUTH: 125 },
  europe: { ADULT: 120, U23: 105, U20: 90, YOUTH: 85 },
  olympic: { ADULT: 175, U23: 155, U20: 140, YOUTH: 125 },
  youth_olympic: { ADULT: 125, U23: 125, U20: 125, YOUTH: 125 },
  universiade: { ADULT: 155, U23: 155, U20: 140, YOUTH: 125 },
  euro_youth: { ADULT: 85, U23: 85, U20: 85, YOUTH: 85 },
  international: { ADULT: 120, U23: 105, U20: 90, YOUTH: 85 },
};

export function getScoringGroup(category: string): ScoringGroup {
  if (category === 'U16' || category === 'U18') return 'YOUTH';
  if (category === 'U20' || category === 'U21') return 'U20';
  if (category === 'U23') return 'U23';
  return 'ADULT';
}

export function getRankBonus(rank: string | undefined, group: ScoringGroup): number {
  if (!rank) return 0;
  const r = rank.toUpperCase().replace(/\s+/g, '');
  if (r.includes('МСУМК')) return group === 'ADULT' ? 100 : group === 'U23' ? 120 : group === 'U20' ? 140 : 0;
  if (r.includes('КМСУ') || r.includes('КМС')) return group === 'ADULT' ? 30 : group === 'U23' ? 40 : group === 'U20' ? 50 : 60;
  if (r.includes('МСУ') || r === 'МС') return group === 'ADULT' ? 60 : group === 'U23' ? 80 : group === 'U20' ? 100 : 120;
  if (group === 'YOUTH') {
    if (
      r === 'I' ||
      r === 'І' ||
      r === '1' ||
      r.includes('ІР') ||
      r.includes('IR') ||
      r.includes('1Р') ||
      r.includes('ІРОЗРЯД') ||
      r.includes('IРОЗРЯД') ||
      r.includes('1РОЗРЯД')
    ) {
      return 20;
    }
  }
  return 0;
}

export function getRecordBonus(notes: string | undefined, group: ScoringGroup): number {
  if (!notes) return 0;
  const n = notes.toLowerCase();
  if (n.includes('рекорд україни') || n.includes('рну')) {
    return group === 'ADULT' ? 200 : group === 'U23' ? 180 : group === 'U20' ? 160 : 140;
  }
  if (n.includes('рекорд області') || n.includes('ро')) {
    return group === 'ADULT' ? 100 : group === 'U23' ? 90 : group === 'U20' ? 80 : 70;
  }
  return 0;
}

export interface CalculateResultPointsParams {
  level?: string;
  category?: string;
  place?: number | null;
  rank?: string;
  notes?: string;
}

export function calculateResultPoints({
  level = 'obl',
  category = 'ADULT',
  place,
  rank,
  notes,
}: CalculateResultPointsParams) {
  const group = getScoringGroup(category);
  let placePoints = 0;
  if (place && place >= 1 && place <= 12) {
    placePoints = PLACE_POINTS[level]?.[group]?.[place - 1] ?? (PLACE_POINTS['obl']?.[group]?.[place - 1] ?? 0);
  } else if (place && place > 12) {
    placePoints = PARTICIPATION_POINTS[level]?.[group] ?? 0;
  }

  const rankBonus = getRankBonus(rank, group);
  const recordBonus = getRecordBonus(notes, group);
  const totalPoints = placePoints + rankBonus + recordBonus;

  return {
    group,
    placePoints,
    rankBonus,
    recordBonus,
    bonusPoints: rankBonus + recordBonus,
    totalPoints,
  };
}
