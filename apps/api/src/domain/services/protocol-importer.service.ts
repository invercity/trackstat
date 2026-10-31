import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as mammoth from 'mammoth';
import {
  Athlete,
  Competition,
  Discipline,
  Result,
  School,
  Season,
} from '../schemas';
import {
  matchStandardDisciplineName,
  parseProtocolDob,
  parseProtocolValue,
} from '../../common/protocol-parser';
import { resolveSchool } from '../../common/school-resolver';
import { ageCategory } from '../../common/age-category';
import { determineSeason } from '../../common/season';
import { calculateWaScore } from '../wa-scoring';
import { determineSportRank } from '../ua-ranks';

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

function parseDatesFromText(str: string): { date?: Date; endDate?: Date } {
  const m = str.match(/(\d{1,2})(?:\s*-\s*(\d{1,2}))?\.(\d{1,2})\.(\d{4})/);
  if (!m) return {};
  const startDay = parseInt(m[1], 10);
  const endDay = m[2] ? parseInt(m[2], 10) : startDay;
  const month = parseInt(m[3], 10) - 1;
  const year = parseInt(m[4], 10);
  return {
    date: new Date(Date.UTC(year, month, startDay)),
    endDate: new Date(Date.UTC(year, month, endDay)),
  };
}

@Injectable()
export class ProtocolImporterService {
  constructor(
    @InjectModel(Athlete.name) private athletes: Model<Athlete>,
    @InjectModel(Competition.name) private competitions: Model<Competition>,
    @InjectModel(Discipline.name) private disciplines: Model<Discipline>,
    @InjectModel(Result.name) private results: Model<Result>,
    @InjectModel(School.name) private schools: Model<School>,
    @InjectModel(Season.name) private seasons: Model<Season>,
  ) {}

  async preview(fileBuffer: Buffer, fileName: string): Promise<ProtocolPreviewResponse> {
    const isDocx =
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc') ||
      (fileBuffer.length > 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b);

    let html = '';
    let plainText = '';

    if (isDocx) {
      try {
        const mammothResult = await mammoth.convertToHtml({ buffer: fileBuffer });
        html = mammothResult.value;
      } catch (err: any) {
        throw new BadRequestException(`Помилка відкриття Word файлу: ${err.message}`);
      }
    } else {
      plainText = fileBuffer.toString('utf8');
    }

    // 1. Preload disciplines and schools for matching
    const allDisciplines = await this.disciplines.find().lean();
    const discMap = new Map<string, any>();
    for (const d of allDisciplines) {
      discMap.set(d.name, d);
    }

    const allSchools = await this.schools.find().lean();
    const schoolMap = new Map<string, any>();
    for (const s of allSchools) {
      schoolMap.set(s.name.toLowerCase(), s);
      if (s.shortName) schoolMap.set(s.shortName.toLowerCase(), s);
    }

    // 2. Preload existing athletes for matching
    const allAthletes = await this.athletes.find().lean();
    const athleteByName = new Map<string, any[]>();
    for (const a of allAthletes) {
      const key = `${a.lastName.toLowerCase()}_${a.firstName.toLowerCase()}`;
      if (!athleteByName.has(key)) athleteByName.set(key, []);
      athleteByName.get(key)!.push(a);
    }

    // 3. Extract Metadata
    const metadata = this.extractMetadata(html || plainText);

    // 4. Parse Rows
    const rawRows = isDocx ? this.extractDocxRows(html) : this.extractTextRows(plainText);

    let itemSeq = 0;
    const items: ParsedItemPreview[] = [];
    const disciplinesFoundSet = new Set<string>();

    let newAthletesCount = 0;
    let matchedAthletesCount = 0;
    let validResults = 0;
    let warningsCount = 0;

    for (const r of rawRows) {
      const warnings: string[] = [];

      // Discipline resolution
      const discCanonical = matchStandardDisciplineName(r.eventHeader);
      let discDoc = discCanonical ? discMap.get(discCanonical) : null;

      if (!discDoc && discCanonical) {
        discDoc = {
          name: discCanonical,
          type: discCanonical.includes('Стрибки') || discCanonical.includes('Метання') || discCanonical.includes('Штовхання') || discCanonical.includes('Потрійний')
            ? 'distance'
            : 'time',
        };
      }

      if (discCanonical) {
        disciplinesFoundSet.add(discCanonical);
      } else {
        warnings.push(`Не вдалося розпізнати дисципліну з заголовка: "${r.eventHeader}"`);
      }

      const discType = discDoc?.type || (r.eventHeader.includes('Стрибки') || r.eventHeader.includes('Метання') || r.eventHeader.includes('Штовхання') ? 'distance' : 'time');
      const isRelay = (discDoc?.group === 'relay') || r.eventHeader.toLowerCase().includes('естафет');

      // School resolution
      let schoolDoc: any = null;
      if (r.teamStr) {
        const resolved = resolveSchool(r.teamStr);
        schoolDoc = schoolMap.get(resolved.name.toLowerCase());
      }

      // Athlete Name & Match
      let athleteMatch: ParsedItemPreview['athleteMatch'] = { status: 'new' };
      let lastName = '';
      let firstName = '';
      let middleName: string | undefined;
      let relayMembers: string[] | undefined;

      if (isRelay) {
        relayMembers = r.nameStr
          .split(/\s{2,}|\n|,/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        const nameParts = r.nameStr.trim().split(/\s+/);
        lastName = nameParts[0] || '';
        firstName = nameParts[1] || '';
        middleName = nameParts.slice(2).join(' ') || undefined;

        if (lastName && firstName) {
          const key = `${lastName.toLowerCase()}_${firstName.toLowerCase()}`;
          const candidates = athleteByName.get(key);

          if (candidates && candidates.length > 0) {
            const parsedDob = parseProtocolDob(r.dobStr);
            const exact = candidates.find((c) => {
              if (!parsedDob || !c.birthDate) return false;
              const d1 = new Date(c.birthDate);
              return (
                d1.getUTCFullYear() === parsedDob.getUTCFullYear() &&
                d1.getUTCMonth() === parsedDob.getUTCMonth() &&
                d1.getUTCDate() === parsedDob.getUTCDate()
              );
            });

            if (exact) {
              athleteMatch = {
                status: 'exact_match',
                existingAthleteId: String(exact._id),
                existingName: `${exact.lastName} ${exact.firstName}`,
                existingDob: new Date(exact.birthDate).toISOString().slice(0, 10),
              };
              matchedAthletesCount++;
            } else {
              const yearMatch = candidates.find((c) => {
                if (!parsedDob || !c.birthDate) return false;
                return new Date(c.birthDate).getUTCFullYear() === parsedDob.getUTCFullYear();
              });
              const picked = yearMatch || candidates[0];
              athleteMatch = {
                status: 'fuzzy_match',
                existingAthleteId: String(picked._id),
                existingName: `${picked.lastName} ${picked.firstName}`,
                existingDob: new Date(picked.birthDate).toISOString().slice(0, 10),
              };
              matchedAthletesCount++;
            }
          } else {
            athleteMatch = { status: 'new' };
            newAthletesCount++;
          }
        }
      }

      // Parse DOB
      const dobDate = parseProtocolDob(r.dobStr);
      if (!dobDate && !isRelay && r.nameStr) {
        warnings.push(`Некоректна дата народження: "${r.dobStr}"`);
      }

      // Calculate Category
      const compYear = metadata.suggestedSeasonYear || 2026;
      const compDateRef = metadata.suggestedDate ? new Date(metadata.suggestedDate) : new Date(Date.UTC(compYear, 8, 1));
      const calculatedCat = isRelay ? 'U18' : dobDate ? ageCategory(dobDate, compDateRef) : 'U18';

      // Parse Result Mark
      const parsedVal = parseProtocolValue(r.resStr);
      if (parsedVal.status === 'UNKNOWN') {
        warnings.push(`Незрозумілий результат: "${r.resStr}"`);
      }

      const coaches = r.coachStr
        ? r.coachStr
            .split(/[,;]/)
            .map((c) => c.trim())
            .filter((c) => c && c.toLowerCase() !== 'особисто')
        : [];

      const placeNum = r.placeStr ? parseInt(r.placeStr, 10) : undefined;
      const sportRank = r.rankStr ? r.rankStr.trim() : undefined;

      // Handle dual entries (Heats + Final) vs single entry
      if (parsedVal.isFinal && parsedVal.heatVal !== null && parsedVal.heatVal !== undefined) {
        // 1. Heat Item
        const heatTiming = discType === 'time' ? parsedVal.heatTiming : undefined;
        let heatWaScore: number | undefined;
        if (parsedVal.heatVal && discCanonical) {
          const sc = calculateWaScore(r.gender, discCanonical, parsedVal.heatVal, heatTiming);
          if (sc !== null && sc > 0) heatWaScore = sc;
        }

        itemSeq++;
        items.push({
          id: `row-${itemSeq}`,
          selected: true,
          athleteName: r.nameStr,
          lastName,
          firstName,
          middleName,
          dobStr: r.dobStr,
          birthDate: dobDate?.toISOString(),
          ageCategory: calculatedCat,
          gender: r.gender,
          teamStr: r.teamStr,
          schoolId: schoolDoc ? String(schoolDoc._id) : undefined,
          schoolName: schoolDoc ? schoolDoc.name : undefined,
          disciplineCanonicalName: discCanonical || r.eventHeader,
          disciplineId: discDoc?._id ? String(discDoc._id) : undefined,
          disciplineType: discType,
          eventHeader: r.eventHeader,
          round: 'забіг',
          rawMark: parsedVal.heatStr || String(parsedVal.heatVal),
          value: parsedVal.heatVal,
          timing: heatTiming,
          status: 'OK',
          waScore: heatWaScore,
          coaches,
          isRelay,
          relayMembers,
          athleteMatch,
          warnings: [...warnings],
        });
        validResults++;

        // 2. Final Item
        const finalTiming = discType === 'time' ? parsedVal.finalTiming : undefined;
        let finalWaScore: number | undefined;
        let finalRank = sportRank;
        if (parsedVal.finalVal && discCanonical) {
          const sc = calculateWaScore(r.gender, discCanonical, parsedVal.finalVal, finalTiming);
          if (sc !== null && sc > 0) finalWaScore = sc;
          if (!finalRank) {
            const autoR = determineSportRank(r.gender, discCanonical, parsedVal.finalVal, finalTiming);
            if (autoR) finalRank = autoR;
          }
        }

        itemSeq++;
        items.push({
          id: `row-${itemSeq}`,
          selected: true,
          place: !isNaN(placeNum as number) ? placeNum : undefined,
          athleteName: r.nameStr,
          lastName,
          firstName,
          middleName,
          dobStr: r.dobStr,
          birthDate: dobDate?.toISOString(),
          ageCategory: calculatedCat,
          gender: r.gender,
          teamStr: r.teamStr,
          schoolId: schoolDoc ? String(schoolDoc._id) : undefined,
          schoolName: schoolDoc ? schoolDoc.name : undefined,
          disciplineCanonicalName: discCanonical || r.eventHeader,
          disciplineId: discDoc?._id ? String(discDoc._id) : undefined,
          disciplineType: discType,
          eventHeader: r.eventHeader,
          round: 'фінал',
          rawMark: parsedVal.finalStr || r.resStr,
          value: parsedVal.finalVal ?? undefined,
          timing: finalTiming,
          status: parsedVal.status,
          sportRank: finalRank,
          waScore: finalWaScore,
          coaches,
          isRelay,
          relayMembers,
          athleteMatch,
          warnings: [...warnings],
        });
        validResults++;
      } else {
        // Single Item
        const timing = discType === 'time' ? parsedVal.timing : undefined;
        let waScore: number | undefined;
        let computedRank = sportRank;
        if (parsedVal.val !== null && parsedVal.val !== undefined && discCanonical) {
          const sc = calculateWaScore(r.gender, discCanonical, parsedVal.val, timing);
          if (sc !== null && sc > 0) waScore = sc;
          if (!computedRank) {
            const autoR = determineSportRank(r.gender, discCanonical, parsedVal.val, timing);
            if (autoR) computedRank = autoR;
          }
        }

        const roundName: 'фінал' | 'забіг' = parsedVal.isFinal || (placeNum !== undefined && placeNum <= 3) || discType === 'distance' ? 'фінал' : 'забіг';

        itemSeq++;
        items.push({
          id: `row-${itemSeq}`,
          selected: true,
          place: !isNaN(placeNum as number) ? placeNum : undefined,
          athleteName: r.nameStr,
          lastName,
          firstName,
          middleName,
          dobStr: r.dobStr,
          birthDate: dobDate?.toISOString(),
          ageCategory: calculatedCat,
          gender: r.gender,
          teamStr: r.teamStr,
          schoolId: schoolDoc ? String(schoolDoc._id) : undefined,
          schoolName: schoolDoc ? schoolDoc.name : undefined,
          disciplineCanonicalName: discCanonical || r.eventHeader,
          disciplineId: discDoc?._id ? String(discDoc._id) : undefined,
          disciplineType: discType,
          eventHeader: r.eventHeader,
          round: roundName,
          rawMark: r.resStr,
          value: parsedVal.val ?? undefined,
          timing,
          status: parsedVal.status,
          sportRank: computedRank,
          waScore,
          coaches,
          isRelay,
          relayMembers,
          athleteMatch,
          warnings: [...warnings],
        });

        if (parsedVal.status === 'OK') validResults++;
      }

      if (warnings.length > 0) {
        warningsCount += warnings.length;
      }
    }

    return {
      fileName,
      metadata,
      stats: {
        totalRows: items.length,
        validResults,
        newAthletesCount,
        matchedAthletesCount,
        disciplinesCount: disciplinesFoundSet.size,
        warningsCount,
      },
      disciplinesFound: Array.from(disciplinesFoundSet),
      items,
    };
  }

  async commit(payload: ProtocolCommitPayload): Promise<ProtocolCommitResponse> {
    if (!payload.items || payload.items.length === 0) {
      throw new BadRequestException('Немає вибраних результатів для імпорту');
    }

    let compDoc: any;

    if (payload.competitionMode === 'new') {
      if (!payload.newCompetition?.name) {
        throw new BadRequestException('Вкажіть назву нового змагання');
      }
      const seasonSpec = payload.newCompetition.date
        ? determineSeason(payload.newCompetition.date)
        : {
            year: payload.newCompetition.seasonYear || 2026,
            indoor: false,
            label: String(payload.newCompetition.seasonYear || 2026),
          };
      const seasonYear = seasonSpec.year;
      let seasonDoc = await this.seasons.findOne({ year: seasonYear, indoor: seasonSpec.indoor });
      if (!seasonDoc) {
        seasonDoc = await this.seasons.findOne({ year: seasonYear });
      }
      if (!seasonDoc) {
        seasonDoc = await this.seasons.create({
          year: seasonYear,
          indoor: seasonSpec.indoor,
          label: seasonSpec.label,
        });
      }

      compDoc = await this.competitions.create({
        name: payload.newCompetition.name,
        date: new Date(payload.newCompetition.date),
        endDate: payload.newCompetition.endDate ? new Date(payload.newCompetition.endDate) : undefined,
        location: payload.newCompetition.location || 'м.Чернігів',
        level: payload.newCompetition.level || 'regional',
        season: seasonDoc._id,
        disciplines: [],
        ageCategories: [],
      });
    } else {
      compDoc = await this.competitions.findById(payload.competitionId);
      if (!compDoc) throw new BadRequestException('Обране змагання не знайдено');
    }

    const selectedItems = payload.items.filter((it) => it.selected !== false);
    let importedResultsCount = 0;
    let athletesCreatedCount = 0;
    let athletesMatchedCount = 0;

    const compDisciplinesSet = new Set<string>((compDoc.disciplines || []).map((id: any) => String(id)));
    const compCategoriesSet = new Set<string>(compDoc.ageCategories || []);

    // Cache created/matched athletes to avoid duplicates within same file import
    const athleteCache = new Map<string, Types.ObjectId>();

    for (const item of selectedItems) {
      // 1. Resolve Discipline
      let discDoc = await this.disciplines.findOne({ name: item.disciplineCanonicalName });
      if (!discDoc) {
        discDoc = await this.disciplines.create({
          name: item.disciplineCanonicalName,
          nameEn: item.disciplineCanonicalName,
          type: item.disciplineType || 'time',
          group: item.isRelay ? 'relay' : 'sprint',
          allowedCategories: [],
        });
      }

      compDisciplinesSet.add(String(discDoc._id));

      // 2. Resolve Athlete
      let athleteId: Types.ObjectId | undefined;

      if (!item.isRelay && item.lastName && item.firstName) {
        const cacheKey = `${item.lastName.toLowerCase()}_${item.firstName.toLowerCase()}`;

        if (athleteCache.has(cacheKey)) {
          athleteId = athleteCache.get(cacheKey);
        } else if (item.athleteMatch.existingAthleteId) {
          athleteId = new Types.ObjectId(item.athleteMatch.existingAthleteId);
          athletesMatchedCount++;
          athleteCache.set(cacheKey, athleteId);

          // Update missing info on existing athlete
          const updateOps: any = {};
          if (item.schoolId) updateOps.school = new Types.ObjectId(item.schoolId);
          if (item.teamStr) updateOps.club = item.teamStr;
          if (item.coaches && item.coaches.length > 0) {
            updateOps.$addToSet = { coaches: { $each: item.coaches } };
          }
          if (Object.keys(updateOps).length > 0) {
            await this.athletes.updateOne({ _id: athleteId }, updateOps);
          }
        } else {
          // Check DB one more time
          let found = await this.athletes.findOne({
            lastName: new RegExp(`^${item.lastName}$`, 'i'),
            firstName: new RegExp(`^${item.firstName}$`, 'i'),
          });

          if (found) {
            athleteId = found._id;
            athletesMatchedCount++;
          } else {
            const birthDate = item.birthDate
              ? new Date(item.birthDate)
              : parseProtocolDob(item.dobStr || '') || new Date(Date.UTC(2010, 0, 1));

            const newAthlete = await this.athletes.create({
              lastName: item.lastName,
              firstName: item.firstName,
              middleName: item.middleName,
              birthDate,
              gender: item.gender,
              club: item.teamStr,
              school: item.schoolId ? new Types.ObjectId(item.schoolId) : undefined,
              coaches: item.coaches || [],
            });
            athleteId = newAthlete._id;
            athletesCreatedCount++;
          }
          athleteCache.set(cacheKey, athleteId);
        }
      }

      // 3. Save Result
      const resultDoc: any = {
        competition: compDoc._id,
        athlete: athleteId,
        discipline: discDoc._id,
        season: compDoc.season,
        date: compDoc.date,
        status: item.status || 'OK',
        value: item.value,
        timing: item.timing,
        rawMark: item.rawMark,
        place: item.place,
        round: item.round || 'фінал',
        ageCategory: item.ageCategory || 'U18',
        rank: item.sportRank,
        waScore: item.waScore,
        wind: item.wind,
        coaches: item.coaches,
      };

      if (item.isRelay) {
        resultDoc.teamName = item.teamStr;
        resultDoc.relayMembers = item.relayMembers || [];
      }

      // Update or insert result
      const filter: any = {
        competition: compDoc._id,
        discipline: discDoc._id,
        round: resultDoc.round,
      };

      if (item.isRelay) {
        filter.teamName = item.teamStr;
        filter.athlete = { $exists: false };
      } else if (athleteId) {
        filter.athlete = athleteId;
      }

      await this.results.updateOne(filter, { $set: resultDoc }, { upsert: true });
      compCategoriesSet.add(resultDoc.ageCategory);
      importedResultsCount++;
    }

    // Update competition's disciplines and ageCategories list
    compDoc.disciplines = Array.from(compDisciplinesSet).map((id) => new Types.ObjectId(id));
    compDoc.ageCategories = Array.from(compCategoriesSet);
    await compDoc.save();

    return {
      success: true,
      competitionId: String(compDoc._id),
      competitionName: compDoc.name,
      importedResultsCount,
      athletesCreatedCount,
      athletesMatchedCount,
    };
  }

  private extractMetadata(content: string) {
    const textOnly = content.replace(/<[^>]+>/g, '\n');
    const lines = textOnly
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let suggestedName = '';
    let suggestedDate: string | undefined;
    let suggestedEndDate: string | undefined;
    let suggestedLocation = 'м.Чернігів';
    let suggestedLevel = 'regional';
    let suggestedSeasonYear = 2026;

    // Scan first 15 lines for metadata
    for (let i = 0; i < Math.min(lines.length, 25); i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      if (
        !suggestedName &&
        (lower.includes('чемпіонат') ||
          lower.includes('першість') ||
          lower.includes('змагання') ||
          lower.includes('кубок'))
      ) {
        suggestedName = line;
        if (lower.includes('област')) suggestedLevel = 'regional';
        else if (lower.includes('україни')) suggestedLevel = 'national';
        else if (lower.includes('міст')) suggestedLevel = 'city';
        else if (lower.includes('міжнародн') || lower.includes('європ')) suggestedLevel = 'international';
      }

      const parsedDates = parseDatesFromText(line);
      if (parsedDates.date && !suggestedDate) {
        suggestedDate = parsedDates.date.toISOString().slice(0, 10);
        suggestedSeasonYear = determineSeason(parsedDates.date).year;
        if (parsedDates.endDate) {
          suggestedEndDate = parsedDates.endDate.toISOString().slice(0, 10);
        }

        // Location is often in the same line after 'р.'
        if (line.includes('м.')) {
          const mIdx = line.indexOf('м.');
          suggestedLocation = line.slice(mIdx).trim();
        }
      }
    }

    if (!suggestedName) {
      suggestedName = 'Чемпіонат Чернігівської області з легкої атлетики';
    }

    return {
      suggestedName,
      suggestedDate,
      suggestedEndDate,
      suggestedLocation,
      suggestedLevel,
      suggestedSeasonYear,
    };
  }

  private extractDocxRows(html: string): Array<{
    gender: 'M' | 'F';
    eventHeader: string;
    placeStr: string;
    nameStr: string;
    dobStr: string;
    teamStr: string;
    resStr: string;
    rankStr: string;
    coachStr: string;
  }> {
    const rowsOut: Array<{
      gender: 'M' | 'F';
      eventHeader: string;
      placeStr: string;
      nameStr: string;
      dobStr: string;
      teamStr: string;
      resStr: string;
      rankStr: string;
      coachStr: string;
    }> = [];

    const tableMatches = html.match(/<table[\s\S]*?<\/table>/g) || [];

    for (const tableHtml of tableMatches) {
      if (!tableHtml.includes('Прізвище') && !tableHtml.includes('спортсмен')) {
        continue;
      }

      let currentGender: 'M' | 'F' = 'M';
      if (tableHtml.includes('жінк') || tableHtml.includes('дівчат')) {
        currentGender = 'F';
      }

      const trMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/g) || [];
      let currentEventHeader = '';

      let placeCol = 0;
      let nameCol = 1;
      let dobCol = 2;
      let teamCol = 3;
      let resCol = 4;
      let rankCol = 5;
      let coachCol = 6;

      for (const tr of trMatches) {
        // Detect section headers with wide colspan or single cell
        const isHeaderRow = (() => {
          if (/\b\d{2}\.\d{2}\.\d{4}\b/.test(tr)) return false;
          const hasWideColspan = /colspan\s*=\s*["']?([4-9]|\d{2})["']?/i.test(tr);
          const tdCount = (tr.match(/<td[\s\S]*?<\/td>/gi) || []).length;
          if (!hasWideColspan && tdCount > 2) return false;
          const clean = tr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
          return (
            /\b(60|100|200|300|400|500|600|800|1000|1500|2000|3000|5000|10000)\s*(?:м|m)?\b/i.test(clean) ||
            clean.includes('біг') ||
            clean.includes('стриб') ||
            clean.includes('потрійн') ||
            clean.includes('висот') ||
            clean.includes('довжин') ||
            clean.includes('жердин') ||
            clean.includes('штовх') ||
            clean.includes('метан') ||
            clean.includes('естафет') ||
            clean.includes('з/б') ||
            clean.includes('перешкод')
          );
        })();

        if (isHeaderRow) {
          const headerClean = tr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (headerClean) {
            currentEventHeader = headerClean;
            const hLow = headerClean.toLowerCase();
            if (hLow.includes('дівчат') || hLow.includes('жінк')) {
              currentGender = 'F';
            } else if (hLow.includes('юнак') || hLow.includes('чоловік')) {
              currentGender = 'M';
            }
          }
          continue;
        }

        // Header mapping
        if (tr.includes('Місце') && tr.includes('Прізвище')) {
          const headerCells = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map((td) =>
            td.replace(/<[^>]+>/g, '').trim().toLowerCase(),
          );
          headerCells.forEach((c, idx) => {
            if (c.includes('місце')) placeCol = idx;
            else if (c.includes('прізвище') || c.includes('спортсмен')) nameCol = idx;
            else if (c.includes('народж')) dobCol = idx;
            else if (c.includes('команда') || c.includes('школа')) teamCol = idx;
            else if (c.includes('результат')) resCol = idx;
            else if (c.includes('розряд')) rankCol = idx;
            else if (c.includes('тренер')) coachCol = idx;
          });
          continue;
        }

        const cells = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map((td) =>
          td.replace(/<[^>]+>/g, '').trim(),
        );

        if (cells.length >= 5 && currentEventHeader) {
          const nameStr = cells[nameCol] || '';
          const resStr = cells[resCol] || '';
          if (!nameStr && !resStr) continue;

          rowsOut.push({
            gender: currentGender,
            eventHeader: currentEventHeader,
            placeStr: cells[placeCol] || '',
            nameStr,
            dobStr: cells[dobCol] || '',
            teamStr: cells[teamCol] || '',
            resStr,
            rankStr: cells[rankCol] || '',
            coachStr: cells[coachCol] || '',
          });
        }
      }
    }

    return rowsOut;
  }

  private extractTextRows(text: string): Array<{
    gender: 'M' | 'F';
    eventHeader: string;
    placeStr: string;
    nameStr: string;
    dobStr: string;
    teamStr: string;
    resStr: string;
    rankStr: string;
    coachStr: string;
  }> {
    const rowsOut: Array<{
      gender: 'M' | 'F';
      eventHeader: string;
      placeStr: string;
      nameStr: string;
      dobStr: string;
      teamStr: string;
      resStr: string;
      rankStr: string;
      coachStr: string;
    }> = [];

    const lines = text.split('\n');
    let currentGender: 'M' | 'F' = 'M';
    let currentEventHeader = '';

    for (const line of lines) {
      const tr = line.trim();
      if (!tr) continue;

      if (tr.includes('Жінки.')) {
        currentGender = 'F';
        continue;
      }
      if (tr.includes('Чоловіки.')) {
        currentGender = 'M';
        continue;
      }

      if (tr.startsWith('|') && tr.endsWith('|')) {
        const rawCells = tr
          .split('|')
          .map((c) => c.replace(/<td.*?\/>/g, '').trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        if (rawCells.some((c) => c.includes('Місце') || c.includes('спортсмена'))) continue;

        const nonEmpty = rawCells.filter(Boolean);
        if (
          nonEmpty.length === 1 &&
          (nonEmpty[0].includes('100') ||
            nonEmpty[0].includes('200') ||
            nonEmpty[0].includes('400') ||
            nonEmpty[0].includes('800') ||
            nonEmpty[0].includes('1500') ||
            nonEmpty[0].includes('3000') ||
            nonEmpty[0].includes('Стрибки') ||
            nonEmpty[0].includes('Потрійний') ||
            nonEmpty[0].includes('Штовхання') ||
            nonEmpty[0].includes('Метання') ||
            nonEmpty[0].includes('Естафет'))
        ) {
          currentEventHeader = nonEmpty[0];
          const hLow = currentEventHeader.toLowerCase();
          if (hLow.includes('дівчат') || hLow.includes('жінк')) {
            currentGender = 'F';
          } else if (hLow.includes('юнак') || hLow.includes('чоловік')) {
            currentGender = 'M';
          }
          continue;
        }

        if (rawCells.length >= 6 && currentEventHeader) {
          rowsOut.push({
            gender: currentGender,
            eventHeader: currentEventHeader,
            placeStr: rawCells[0] || '',
            nameStr: rawCells[1] || '',
            dobStr: rawCells[2] || '',
            teamStr: rawCells[3] || '',
            resStr: rawCells[4] || '',
            rankStr: rawCells[5] || '',
            coachStr: rawCells[6] || '',
          });
        }
      }
    }

    return rowsOut;
  }
}
