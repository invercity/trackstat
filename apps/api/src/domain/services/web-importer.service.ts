import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ageCategory } from '../../common/age-category';
import {
  matchStandardDisciplineName,
  parseProtocolDob,
  parseProtocolValue,
} from '../../common/protocol-parser';
import { resolveSchool } from '../../common/school-resolver';
import { determineSportRank } from '../ua-ranks';
import { calculateWaScore } from '../wa-scoring';
import { Athlete, Competition, Discipline, Result, School, Season } from '../schemas';
import {
  ParsedItemPreview,
  ProtocolCommitPayload,
  ProtocolCommitResponse,
  ProtocolImporterService,
} from './protocol-importer.service';

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

@Injectable()
export class WebImporterService {
  constructor(
    @InjectModel(Athlete.name) private athletes: Model<Athlete>,
    @InjectModel(Competition.name) private competitions: Model<Competition>,
    @InjectModel(Discipline.name) private disciplines: Model<Discipline>,
    @InjectModel(Result.name) private results: Model<Result>,
    @InjectModel(School.name) private schools: Model<School>,
    @InjectModel(Season.name) private seasons: Model<Season>,
    private readonly protocolImporter: ProtocolImporterService,
  ) {}

  getIntegrations(): WebIntegrationMeta[] {
    return [
      {
        id: 'uar',
        name: 'UAR (Ukraine Athletics Results)',
        website: 'https://uar.com.ua',
        description: 'Офіційні результати ФЛАУ: Чемпіонати, Кубки України та Всеукраїнські змагання',
        defaultRegion: 'Чернігівська',
        enabled: true,
      },
    ];
  }

  async getYears(integrationId: string): Promise<number[]> {
    if (integrationId !== 'uar') {
      throw new BadRequestException(`Інтеграція "${integrationId}" не підтримується`);
    }

    try {
      const res = await fetch('https://uar.com.ua/api/years.php', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.years) && data.years.length > 0) {
        return data.years.map((y: any) => Number(y)).sort((a: number, b: number) => b - a);
      }
    } catch {
      // Fallback
    }
    return [2026, 2025];
  }

  async getCompetitions(integrationId: string, year: number): Promise<WebCompetitionItem[]> {
    if (integrationId !== 'uar') {
      throw new BadRequestException(`Інтеграція "${integrationId}" не підтримується`);
    }

    const res = await fetch(`https://uar.com.ua/api/competitions.php?year=${encodeURIComponent(year)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new BadRequestException(`Не вдалося завантажити змагання з UAR (код помилки ${res.status})`);
    }

    const data = await res.json();
    const rawList = Array.isArray(data.competitions) ? data.competitions : [];

    return rawList.map((c: any) => ({
      id: String(c.id || ''),
      title: String(c.title || ''),
      startDate: parseUarDateToIso(c.start),
      endDate: parseUarDateToIso(c.end),
      city: String(c.city || ''),
      region: String(c.region || ''),
      country: String(c.country || 'Україна'),
      indoor: c.indoor === 'Так',
      year: Number(c.year) || year,
      detectedLevel: detectCompetitionLevel(c.title),
      hasSchedule: !!c.hasSchedule,
    }));
  }

  async previewCompetitionResults(
    integrationId: string,
    compId: string,
    year: number,
    regionFilter = 'Чернігівська',
  ): Promise<WebImportPreviewResponse> {
    if (integrationId !== 'uar') {
      throw new BadRequestException(`Інтеграція "${integrationId}" не підтримується`);
    }

    // 1. Fetch competition catalog to find event title and details
    let compItem: WebCompetitionItem | undefined;
    try {
      const allComps = await this.getCompetitions(integrationId, year);
      compItem = allComps.find((c) => c.id === compId);
    } catch {}

    // 2. Fetch event data (timetable)
    const eventRes = await fetch(
      `https://uar.com.ua/api/event-data.php?year=${encodeURIComponent(year)}&id=${encodeURIComponent(compId)}`,
      { cache: 'no-store' },
    );
    if (!eventRes.ok) {
      throw new NotFoundException(`Змагання ${compId} не знайдено на UAR`);
    }

    const eventData = await eventRes.json();
    const timetable: any[][] = Array.isArray(eventData.timetable) ? eventData.timetable : [];
    const eventTitle = String(eventData.title || compItem?.title || `Змагання ${compId}`);

    // Check if competition already exists in our DB
    const existingComp = await this.competitions.findOne({
      name: { $regex: new RegExp(`^${eventTitle.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') },
    });

    // Cache disciplines from our DB
    const allDisciplines = await this.disciplines.find();
    const discMap = new Map<string, Discipline>();
    allDisciplines.forEach((d) => discMap.set(d.name, d));

    // Cache athletes from our DB for matching
    const allAthletes = await this.athletes.find().populate('school');
    const athleteByName = new Map<string, Athlete[]>();
    for (const a of allAthletes) {
      const key = `${a.lastName.trim().toLowerCase()}_${a.firstName.trim().toLowerCase()}`;
      if (!athleteByName.has(key)) athleteByName.set(key, []);
      athleteByName.get(key)!.push(a);
    }

    // Extract valid timetable items (must have tid and discipline)
    const validTimetable = timetable.filter((row) => row && row.length >= 6 && row[0] && row[5]);

    // Fetch xml-table in batches of 10
    const fetchedResults: Array<{ row: any[]; data: any }> = [];
    const BATCH_SIZE = 10;
    for (let i = 0; i < validTimetable.length; i += BATCH_SIZE) {
      const chunk = validTimetable.slice(i, i + BATCH_SIZE);
      const chunkRes = await Promise.all(
        chunk.map(async (row) => {
          const tid = row[0];
          try {
            const r = await fetch(
              `https://uar.com.ua/api/xml-table.php?year=${encodeURIComponent(year)}&id=${encodeURIComponent(compId)}&type=tp&tid=${encodeURIComponent(tid)}`,
              { cache: 'no-store' },
            );
            if (!r.ok) return { row, data: null };
            const j = await r.json();
            return { row, data: j };
          } catch {
            return { row, data: null };
          }
        }),
      );
      fetchedResults.push(...chunkRes);
    }

    const items: ParsedItemPreview[] = [];
    const disciplinesFoundSet = new Set<string>();
    let validResults = 0;
    let newAthletesCount = 0;
    let matchedAthletesCount = 0;
    let warningsCount = 0;
    let seq = 0;

    const normRegion = regionFilter.trim().toLowerCase();

    for (const { row, data } of fetchedResults) {
      if (!data || !data.groups || !Array.isArray(data.groups)) continue;

      const rawDisciplineName = String(row[5] || '').trim();
      const rawGenderStr = String(row[6] || '').toLowerCase();
      const rawCatStr = String(row[7] || '').trim();
      const rawRoundStr = String(row[8] || '').trim();

      const disciplineCanonicalName = matchStandardDisciplineName(rawDisciplineName) || rawDisciplineName;
      let discDoc = discMap.get(disciplineCanonicalName);

      const isFinal =
        rawRoundStr.toLowerCase().includes('фінал') && !rawRoundStr.toLowerCase().includes('1/2');
      const round: 'фінал' | 'забіг' = isFinal ? 'фінал' : 'забіг';

      let gender: 'M' | 'F' = 'M';
      if (
        rawGenderStr.includes('жін') ||
        rawGenderStr.includes('дівч') ||
        rawGenderStr.includes('women') ||
        rawGenderStr.includes('girls')
      ) {
        gender = 'F';
      }

      for (const group of data.groups) {
        const participants = Array.isArray(group.participants) ? group.participants : [];

        for (const p of participants) {
          const participantRegion = String(p.region || '').trim();
          if (normRegion && !participantRegion.toLowerCase().includes(normRegion)) {
            continue;
          }

          seq++;
          const warnings: string[] = [];

          const isRelay = !!p.isRelay || !!data.isRelay;
          const rawMark = String(p.mark || '').trim();
          const placeNum = p.placeOrLane && !isNaN(parseInt(p.placeOrLane, 10)) ? parseInt(p.placeOrLane, 10) : undefined;

          let lastName = '';
          let firstName = '';
          let athleteName = '';
          let relayMembers: string[] | undefined;
          let dobStr: string | undefined;
          let birthDateIso: string | undefined;
          let calculatedAgeCat = rawCatStr;

          if (isRelay) {
            athleteName = participantRegion ? `Естафета ${participantRegion}` : 'Естафетна команда';
            lastName = athleteName;
            firstName = '';
            relayMembers = (p.athletes || []).map((a: any) =>
              `${formatUkrainianName(a.lastName)} ${formatUkrainianName(a.firstName)}`.trim(),
            );
          } else {
            lastName = formatUkrainianName(p.lastName);
            firstName = formatUkrainianName(p.firstName);
            athleteName = `${lastName} ${firstName}`.trim();
            dobStr = p.dob ? String(p.dob).trim() : undefined;
            const bDate = parseProtocolDob(dobStr || '');
            if (bDate) {
              birthDateIso = bDate.toISOString();
              calculatedAgeCat = ageCategory(bDate, new Date(year, 0, 1));
            }
          }

          // Value and status parsing
          const parsedVal = parseProtocolValue(rawMark);
          const numValue = parsedVal.val ?? undefined;
          if (numValue == null && parsedVal.status === 'OK' && rawMark) {
            warnings.push(`Не вдалося розпізнати числовий результат з "${rawMark}"`);
          }

          // Timing detection
          let timing: 'manual' | 'electronic' | undefined;
          if (discDoc?.type === 'time' || !discDoc) {
            if (rawMark.includes('.') && rawMark.split('.')[1]?.length >= 2) {
              timing = 'electronic';
            } else if (rawMark.includes(',') && rawMark.split(',')[1]?.length === 1) {
              timing = 'manual';
            } else if (parsedVal.timing) {
              timing = parsedVal.timing;
            } else {
              timing = 'electronic';
            }
          }

          // Sport rank & WA Score
          let sportRank: string | undefined;
          let waScore: number | undefined;

          if (numValue != null && parsedVal.status === 'OK') {
            const detectedRank = determineSportRank(gender, disciplineCanonicalName, numValue, timing);
            if (detectedRank) sportRank = detectedRank;

            const score = calculateWaScore(gender, disciplineCanonicalName, numValue, timing);
            if (score != null && score > 0) waScore = score;
          }

          // Athlete matching in DB
          let athleteMatch: ParsedItemPreview['athleteMatch'] = { status: 'new' };
          let matchedSchoolId: string | undefined;
          let matchedSchoolName: string | undefined;

          if (!isRelay) {
            const searchKey = `${lastName.toLowerCase()}_${firstName.toLowerCase()}`;
            const candidates = athleteByName.get(searchKey) || [];

            if (candidates.length > 0) {
              let exact = candidates.find((c) => {
                if (!birthDateIso || !c.birthDate) return false;
                return (
                  new Date(c.birthDate).toISOString().slice(0, 10) === birthDateIso.slice(0, 10)
                );
              });

              if (!exact && candidates.length === 1 && !dobStr) {
                exact = candidates[0];
              }

              if (exact) {
                athleteMatch = {
                  status: 'exact_match',
                  existingAthleteId: String((exact as any)._id),
                  existingName: `${exact.lastName} ${exact.firstName}`,
                  existingDob: exact.birthDate ? new Date(exact.birthDate).toISOString().slice(0, 10) : undefined,
                };
                matchedAthletesCount++;
                if (exact.school) {
                  matchedSchoolId = String((exact.school as any)._id || exact.school);
                  matchedSchoolName = (exact.school as any).name;
                }
              } else {
                athleteMatch = {
                  status: 'fuzzy_match',
                  existingAthleteId: String((candidates[0] as any)._id),
                  existingName: `${candidates[0].lastName} ${candidates[0].firstName}`,
                  existingDob: candidates[0].birthDate
                    ? new Date(candidates[0].birthDate).toISOString().slice(0, 10)
                    : undefined,
                };
                matchedAthletesCount++;
              }
            } else {
              newAthletesCount++;
            }
          }

          // School resolution if not matched yet
          if (!matchedSchoolId) {
            const resolvedSchool = resolveSchool(participantRegion);
            if (resolvedSchool) {
              const sDoc = await this.schools.findOne({
                name: { $regex: new RegExp(resolvedSchool.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i') },
              });
              if (sDoc) {
                matchedSchoolId = String((sDoc as any)._id);
                matchedSchoolName = sDoc.name;
              }
            }
          }

          disciplinesFoundSet.add(disciplineCanonicalName);
          if (parsedVal.status === 'OK' && numValue != null) {
            validResults++;
          }
          if (warnings.length > 0) {
            warningsCount += warnings.length;
          }

          items.push({
            id: `uar-${seq}`,
            selected: true,
            place: placeNum,
            athleteName,
            lastName,
            firstName,
            dobStr,
            birthDate: birthDateIso,
            ageCategory: calculatedAgeCat,
            gender,
            teamStr: participantRegion,
            schoolId: matchedSchoolId,
            schoolName: matchedSchoolName,
            disciplineCanonicalName,
            disciplineId: discDoc ? String((discDoc as any)._id) : undefined,
            disciplineType: (discDoc?.type as any) || 'time',
            eventHeader: `${rawDisciplineName} (${rawRoundStr})`,
            round,
            rawMark,
            value: numValue,
            timing,
            status: parsedVal.status,
            sportRank,
            waScore,
            coaches: [],
            isRelay,
            relayMembers,
            athleteMatch,
            warnings,
          });
        }
      }
    }

    const startDateIso = compItem?.startDate || parseUarDateToIso(timetable[0]?.[1]);
    const endDateIso = compItem?.endDate || parseUarDateToIso(timetable[timetable.length - 1]?.[1]) || startDateIso;
    const detectedLevel = detectCompetitionLevel(eventTitle);

    return {
      integrationId,
      competition: {
        id: compId,
        name: eventTitle,
        date: startDateIso,
        endDate: endDateIso,
        location: compItem?.city || 'м.Київ',
        level: detectedLevel,
        indoor: compItem?.indoor ?? false,
        seasonYear: year,
        existingCompetitionId: existingComp ? String(existingComp._id) : undefined,
      },
      stats: {
        totalParticipantsFound: items.length,
        validResults,
        newAthletesCount,
        matchedAthletesCount,
        disciplinesCount: disciplinesFoundSet.size,
        warningsCount,
      },
      items,
    };
  }

  async commit(payload: ProtocolCommitPayload): Promise<ProtocolCommitResponse> {
    return this.protocolImporter.commit(payload);
  }
}
