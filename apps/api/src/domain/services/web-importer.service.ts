import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ageCategory } from '../../common/age-category';
import { determineSeason } from '../../common/season';
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
import { IksIntegrationProvider } from './web-importer/providers/iks.provider';
import { UarIntegrationProvider } from './web-importer/providers/uar.provider';
import { detectCompetitionLevel } from './web-importer/web-importer.utils';
import {
  WebCompetitionItem,
  WebImportPreviewResponse,
  WebIntegrationMeta,
  WebIntegrationProvider,
} from './web-importer/web-integration.interface';

export * from './web-importer/web-integration.interface';
export * from './web-importer/web-importer.utils';
export * from './web-importer/providers/iks.provider';
export * from './web-importer/providers/uar.provider';

@Injectable()
export class WebImporterService {
  private readonly providers = new Map<string, WebIntegrationProvider>();

  constructor(
    @InjectModel(Athlete.name) private athletes: Model<Athlete>,
    @InjectModel(Competition.name) private competitions: Model<Competition>,
    @InjectModel(Discipline.name) private disciplines: Model<Discipline>,
    @InjectModel(Result.name) private results: Model<Result>,
    @InjectModel(School.name) private schools: Model<School>,
    @InjectModel(Season.name) private seasons: Model<Season>,
    private readonly protocolImporter: ProtocolImporterService,
  ) {
    this.registerProvider(new IksIntegrationProvider());
    this.registerProvider(new UarIntegrationProvider());
  }

  registerProvider(provider: WebIntegrationProvider): void {
    this.providers.set(provider.meta.id, provider);
  }

  private getProvider(integrationId: string): WebIntegrationProvider {
    const provider = this.providers.get(integrationId);
    if (!provider || !provider.meta.enabled) {
      throw new BadRequestException(`Інтеграція "${integrationId}" не підтримується або вимкнена`);
    }
    return provider;
  }

  getIntegrations(): WebIntegrationMeta[] {
    return Array.from(this.providers.values()).map((p) => p.meta);
  }

  async getYears(integrationId: string): Promise<number[]> {
    return this.getProvider(integrationId).getYears();
  }

  async getCompetitions(integrationId: string, year: number): Promise<WebCompetitionItem[]> {
    return this.getProvider(integrationId).getCompetitions(year);
  }

  async previewCompetitionResults(
    integrationId: string,
    compId: string,
    year: number,
    regionFilter = 'Чернігівська',
  ): Promise<WebImportPreviewResponse> {
    const provider = this.getProvider(integrationId);
    const payload = await provider.fetchCompetitionResults(compId, year, regionFilter);
    const seasonSpec = determineSeason(payload.startDate || new Date(Date.UTC(year, 5, 1)));

    // Check if competition already exists in our DB
    const existingComp = await this.competitions.findOne({
      name: { $regex: new RegExp(`^${payload.title.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') },
    });

    // Cache disciplines and schools from our DB
    const [allDisciplines, allSchools, allAthletes] = await Promise.all([
      this.disciplines.find(),
      this.schools.find(),
      this.athletes.find().populate('school'),
    ]);
    const discMap = new Map<string, Discipline>();
    allDisciplines.forEach((d) => discMap.set(d.name, d));

    // Cache athletes from our DB for matching
    const athleteByName = new Map<string, Athlete[]>();
    for (const a of allAthletes) {
      const key = `${a.lastName.trim().toLowerCase()}_${a.firstName.trim().toLowerCase()}`;
      if (!athleteByName.has(key)) athleteByName.set(key, []);
      athleteByName.get(key)!.push(a);
    }

    const items: ParsedItemPreview[] = [];
    const disciplinesFoundSet = new Set<string>();
    let validResults = 0;
    let newAthletesCount = 0;
    let matchedAthletesCount = 0;
    let warningsCount = 0;
    let seq = 0;

    for (const r of payload.results) {
      seq++;
      const warnings: string[] = [];

      const disciplineCanonicalName =
        matchStandardDisciplineName(r.rawDisciplineName) || r.rawDisciplineName;
      const discDoc = discMap.get(disciplineCanonicalName);

      const isFinal =
        r.rawRound.toLowerCase().includes('фінал') && !r.rawRound.toLowerCase().includes('1/2');
      const round: 'фінал' | 'забіг' = isFinal ? 'фінал' : 'забіг';

      const lastName = r.lastName;
      const firstName = r.firstName;
      const athleteName = `${lastName} ${firstName}`.trim();

      let birthDateIso: string | undefined;
      let calculatedAgeCat = r.rawCategory || 'U18';

      if (!r.isRelay && r.dobStr) {
        const bDate = parseProtocolDob(r.dobStr);
        if (bDate) {
          birthDateIso = bDate.toISOString();
          calculatedAgeCat = ageCategory(bDate, new Date(Date.UTC(seasonSpec.year, 0, 1)));
        }
      }

      // Value and status parsing
      const parsedVal = parseProtocolValue(r.rawMark);
      const numValue = parsedVal.val ?? undefined;
      if (numValue == null && parsedVal.status === 'OK' && r.rawMark) {
        warnings.push(`Не вдалося розпізнати числовий результат з "${r.rawMark}"`);
      }

      // Timing detection
      let timing: 'manual' | 'electronic' | undefined;
      if (discDoc?.type === 'time' || !discDoc) {
        if (
          r.rawMark.endsWith('h') ||
          (r.rawMark.includes(',') && r.rawMark.split(',')[1]?.length === 1)
        ) {
          timing = 'manual';
        } else if (r.rawMark.includes('.') && r.rawMark.split('.')[1]?.length >= 2) {
          timing = 'electronic';
        } else if (parsedVal.timing) {
          timing = parsedVal.timing;
        } else {
          timing = 'electronic';
        }
      }

      // Sport rank & WA Score
      let sportRank: string | undefined = r.grade || undefined;
      let waScore: number | undefined;

      if (!r.isRelay && numValue != null && parsedVal.status === 'OK') {
        const detectedRank = determineSportRank(r.gender, disciplineCanonicalName, numValue, timing);
        if (detectedRank) sportRank = detectedRank;

        const score = calculateWaScore(r.gender, disciplineCanonicalName, numValue, timing);
        if (score != null && score > 0) waScore = score;
      }

      // Athlete matching in DB
      let athleteMatch: ParsedItemPreview['athleteMatch'] = { status: 'new' };
      let matchedSchoolId: string | undefined;
      let matchedSchoolName: string | undefined;

      if (!r.isRelay) {
        const searchKey = `${lastName.toLowerCase()}_${firstName.toLowerCase()}`;
        const candidates = athleteByName.get(searchKey) || [];

        if (candidates.length > 0) {
          let exact = candidates.find((c) => {
            if (!birthDateIso || !c.birthDate) return false;
            return new Date(c.birthDate).toISOString().slice(0, 10) === birthDateIso.slice(0, 10);
          });

          if (!exact && candidates.length === 1 && !r.dobStr) {
            exact = candidates[0];
          }

          if (exact) {
            athleteMatch = {
              status: 'exact_match',
              existingAthleteId: String((exact as any)._id),
              existingName: `${exact.lastName} ${exact.firstName}`,
              existingDob: exact.birthDate
                ? new Date(exact.birthDate).toISOString().slice(0, 10)
                : undefined,
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
      const schoolQueryText = r.teamStr || r.participantRegion;
      if (!r.isRelay && !matchedSchoolId && schoolQueryText) {
        const resolvedSchool = resolveSchool(schoolQueryText);
        if (resolvedSchool) {
          const targetLower = resolvedSchool.name.toLowerCase();
          const sDoc = allSchools.find((s) => s.name.toLowerCase().includes(targetLower));
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
        id: `${integrationId}-${seq}`,
        selected: true,
        place: r.placeNum,
        athleteName,
        lastName,
        firstName,
        dobStr: r.dobStr,
        birthDate: birthDateIso,
        ageCategory: calculatedAgeCat,
        gender: r.gender,
        teamStr: schoolQueryText,
        schoolId: matchedSchoolId,
        schoolName: matchedSchoolName,
        disciplineCanonicalName,
        disciplineId: discDoc ? String((discDoc as any)._id) : undefined,
        disciplineType: (discDoc?.type as any) || 'time',
        eventHeader: `${r.rawDisciplineName} (${r.rawRound})`,
        round,
        rawMark: r.rawMark,
        value: numValue,
        wind: r.wind,
        timing,
        status: parsedVal.status,
        sportRank,
        waScore,
        coaches: r.coaches || [],
        isRelay: r.isRelay,
        relayMembers: r.relayMembers,
        athleteMatch,
        warnings,
      });
    }

    const detectedLevel = detectCompetitionLevel(payload.title);

    return {
      integrationId,
      competition: {
        id: compId,
        name: payload.title,
        date: payload.startDate,
        endDate: payload.endDate || payload.startDate,
        location: payload.location,
        level: detectedLevel,
        indoor: payload.indoor || seasonSpec.indoor,
        seasonYear: seasonSpec.year,
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
