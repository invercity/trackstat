import { ParsedItemPreview } from '../protocol-importer.service';

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

export interface RawWebParticipantResult {
  rawDisciplineName: string;
  rawCategory: string;
  rawRound: string;
  gender: 'M' | 'F';
  isRelay: boolean;
  participantRegion: string;
  teamStr?: string;
  lastName: string;
  firstName: string;
  relayMembers?: string[];
  dobStr?: string;
  rawMark: string;
  placeNum?: number;
  wind?: number;
  grade?: string;
  coaches?: string[];
}

export interface RawWebCompetitionPayload {
  compId: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  indoor: boolean;
  year: number;
  results: RawWebParticipantResult[];
}

export interface WebIntegrationProvider {
  readonly meta: WebIntegrationMeta;
  getYears(): Promise<number[]>;
  getCompetitions(year: number): Promise<WebCompetitionItem[]>;
  fetchCompetitionResults(
    compId: string,
    year: number,
    regionFilter: string,
  ): Promise<RawWebCompetitionPayload>;
}
