export type Lang = 'uk' | 'en';

export interface Discipline {
  _id: string;
  name: string;
  nameEn: string;
  type: 'time' | 'distance' | 'points';
  group?: string;
  allowedCategories?: string[];
}
export interface Season {
  _id: string;
  year: number;
  indoor: boolean;
  label: string;
  isCurrent?: boolean;
}
export interface School {
  _id: string;
  name: string;
  shortName?: string;
  city?: string;
  region?: string;
  notes?: string;
  athleteCount?: number;
}

export interface Athlete {
  _id: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  birthDate: string;
  gender: 'M' | 'F';
  coaches: string[];
  club?: string;
  school?: School;
  region?: string;
  notes?: string;
  ageCategory: string;
  mainDisciplines?: Pick<Discipline, '_id' | 'name' | 'nameEn'>[];
}
export interface Competition {
  _id: string;
  name: string;
  date: string;
  endDate?: string;
  location: string;
  season: Season;
  ageCategories: string[];
  disciplines: Discipline[];
  level?: string;
}
export interface Result {
  _id: string;
  competition: Pick<Competition, '_id' | 'name' | 'date' | 'location'>;
  athlete?: Pick<Athlete, '_id' | 'lastName' | 'firstName' | 'middleName' | 'birthDate' | 'gender' | 'club' | 'school'> | null;
  teamName?: string;
  relayMembers?: string[];
  discipline: Discipline;
  season: Season;
  date: string;
  status: string;
  value?: number;
  timing?: 'manual' | 'electronic';
  rawMark?: string;
  wind?: number;
  place?: number;
  round?: string;
  ageCategory: string;
  rank?: string;
  waScore?: number;
  teamPoints?: number;
  notes?: string;
}
export interface PaginatedAthletes {
  items: Athlete[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface Mark {
  resultId: string;
  value: number;
  timing?: 'manual' | 'electronic';
  rawMark?: string;
  wind?: number;
  date: string;
  ageCategory: string;
  rank?: string;
  waScore?: number;
  competition: { _id: string; name: string; date: string; location: string };
  season: Season;
}
export interface Stats {
  personalBests: { discipline: Discipline; overall: Mark | null; outdoor: Mark | null; indoor: Mark | null }[];
  seasonBests: { season: Season; results: (Mark & { discipline: Discipline })[] }[];
}
export interface TopResultItem {
  _id: string;
  athlete: Pick<Athlete, '_id' | 'lastName' | 'firstName' | 'middleName' | 'gender'>;
  discipline: Pick<Discipline, '_id' | 'name' | 'nameEn' | 'type'>;
  value: number;
  timing?: 'manual' | 'electronic';
  rank?: string;
  waScore?: number;
  round?: string;
}

export interface CompetitionOverview extends Competition {
  topMen: TopResultItem[];
  topWomen: TopResultItem[];
}

export const AGE_CATEGORIES = ['U16', 'U18', 'U21', 'U23', 'ADULT'];

export interface RelayAthleteRef {
  _id: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  birthDate: string;
  gender: 'M' | 'F';
  club?: string;
  ageCategory: string;
}

export interface RelayStageMark {
  discipline: string;
  value: number;
  timing?: 'manual' | 'electronic';
  rawMark?: string;
  rank?: string;
  effectiveValue: number;
}

export interface RelayStage {
  stage: number;
  distance: string;
  role: string;
  athlete: RelayAthleteRef | null;
  mark: RelayStageMark | null;
}

export interface RelayStageCandidateGroup {
  stage: number;
  distance: string;
  candidates: {
    athlete: RelayAthleteRef;
    mark: RelayStageMark;
    role: string;
  }[];
}

export interface RelaySquad {
  id: string;
  title: string;
  category: 'U16' | 'U18' | 'U20' | 'U21' | 'U23' | 'ADULT';
  gender: 'M' | 'F';
  relayType: 'swedish' | '4x100' | '4x400' | '4x800';
  stages: RelayStage[];
  reserves: {
    athlete: RelayAthleteRef;
    mark: RelayStageMark;
    role: string;
  }[];
  stageReserves?: RelayStageCandidateGroup[];
  totalTimeEstimated?: number;
  smartSquad?: {
    stages: RelayStage[];
    totalTimeEstimated: number;
    description: string;
  };
}

export interface RankedResultItem {
  resultId: string;
  competitionName: string;
  competitionLevel: string;
  competitionDate: string;
  disciplineName: string;
  value?: number;
  timing?: string;
  rawMark?: string;
  place?: number;
  rank?: string;
  placePoints: number;
  bonusPoints: number;
  totalPoints: number;
}

export interface RankedAthleteItem {
  rank: number;
  athlete: {
    _id: string;
    lastName: string;
    firstName: string;
    middleName?: string;
    birthDate: string;
    gender: 'M' | 'F';
    ageCategory: string;
    club?: string;
    school?: { _id: string; name: string; city?: string };
  };
  totalPoints: number;
  countedResultsCount: number;
  results: RankedResultItem[];
}

export interface RankedSchoolItem {
  rank: number;
  school: {
    _id: string;
    name: string;
    shortName?: string;
    city?: string;
    region?: string;
  };
  totalPoints: number;
  athletesCount: number;
  athletes: {
    _id: string;
    lastName: string;
    firstName: string;
    middleName?: string;
    birthDate: string;
    gender: 'M' | 'F';
    ageCategory: string;
    totalPoints: number;
    countedResultsCount: number;
    results: RankedResultItem[];
  }[];
}

export interface RankingsOverview {
  year: number;
  allYears?: number[];
  season?: Season;
  currentSeason?: {
    year: number;
    indoor: boolean;
    label: string;
    _id?: string;
  };
  allSeasons?: Season[];
  categories: {
    u16_m: RankedAthleteItem[];
    u16_f: RankedAthleteItem[];
    u18_m: RankedAthleteItem[];
    u18_f: RankedAthleteItem[];
    adult_m: RankedAthleteItem[];
    adult_f: RankedAthleteItem[];
  };
  schools: RankedSchoolItem[];
}

export interface LeaderboardItem {
  rank: number;
  athlete: {
    _id: string;
    lastName: string;
    firstName: string;
    middleName?: string;
    birthDate: string;
    gender: 'M' | 'F';
    ageCategory: string;
    club?: string;
    school?: { _id: string; name: string; shortName?: string; city?: string };
  };
  value: number;
  timing?: 'manual' | 'electronic';
  rawMark?: string;
  wind?: number;
  status: string;
  sportRank?: string;
  waScore?: number;
  date: string;
  indoor?: boolean;
  competition: { _id: string; name: string; location?: string };
  round?: string;
}

export interface LeaderboardGroup {
  discipline: {
    _id: string;
    name: string;
    nameEn: string;
    type: string;
  };
  category: string;
  gender: 'M' | 'F';
  results: LeaderboardItem[];
}

export interface LeaderboardResponse {
  mode: 'sb' | 'pb';
  year?: number;
  availableYears?: number[];
  groups: LeaderboardGroup[];
}

export interface ParsedItemPreview {
  id: string;
  selected: boolean;
  place?: number;
  athleteName: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  dobStr?: string;
  birthDate?: string;
  ageCategory: string;
  gender: 'M' | 'F';
  teamStr?: string;
  schoolId?: string;
  schoolName?: string;
  disciplineCanonicalName: string;
  disciplineId?: string;
  disciplineType: string;
  eventHeader: string;
  round: 'забіг' | 'фінал';
  rawMark: string;
  value?: number;
  timing?: 'manual' | 'electronic';
  status: string;
  sportRank?: string;
  waScore?: number;
  wind?: number;
  coaches: string[];
  isRelay: boolean;
  relayMembers?: string[];
  athleteMatch: {
    status: 'new' | 'exact_match' | 'fuzzy_match';
    existingAthleteId?: string;
    existingName?: string;
    existingDob?: string;
  };
  warnings: string[];
}

export interface ProtocolPreviewResponse {
  fileName: string;
  metadata: {
    suggestedName: string;
    suggestedDate?: string;
    suggestedEndDate?: string;
    suggestedLocation?: string;
    suggestedLevel?: string;
    suggestedSeasonYear?: number;
  };
  stats: {
    totalRows: number;
    validResults: number;
    newAthletesCount: number;
    matchedAthletesCount: number;
    disciplinesCount: number;
    warningsCount: number;
  };
  disciplinesFound: string[];
  items: ParsedItemPreview[];
}

export interface ProtocolCommitPayload {
  competitionMode: 'existing' | 'new';
  competitionId?: string;
  newCompetition?: {
    name: string;
    date: string;
    endDate?: string;
    location: string;
    level: string;
    seasonYear: number;
  };
  items: ParsedItemPreview[];
}

export interface ProtocolCommitResponse {
  success: boolean;
  competitionId: string;
  competitionName: string;
  importedResultsCount: number;
  athletesCreatedCount: number;
  athletesMatchedCount: number;
}

export interface WebIntegrationMeta {
  id: string;
  name: string;
  website: string;
  description: string;
  defaultRegion: string;
  enabled: boolean;
}

export interface WebCompetitionItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  city: string;
  region: string;
  country: string;
  indoor: boolean;
  year: number;
  detectedLevel: 'city' | 'regional' | 'national' | 'international';
  hasSchedule: boolean;
}

export interface WebImportPreviewResponse {
  integrationId: string;
  competition: {
    id: string;
    name: string;
    date: string;
    endDate?: string;
    location: string;
    level: 'city' | 'regional' | 'national' | 'international';
    indoor: boolean;
    seasonYear: number;
    existingCompetitionId?: string;
  };
  stats: {
    totalParticipantsFound: number;
    validResults: number;
    matchedAthletesCount: number;
    newAthletesCount: number;
    disciplinesCount: number;
    warningsCount: number;
  };
  items: ParsedItemPreview[];
}

