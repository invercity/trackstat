import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ageCategory } from '../../common/age-category';
import { determineSeason } from '../../common/season';
import { calculateResultPoints } from '../ranking-rules';
import { Athlete, Competition, Result, School, Season } from '../schemas';
import { SeasonsService } from './seasons.service';

@Injectable()
export class RankingsService {
  // In-memory cache for default year resolution and available years
  private cachedYearResolution: {
    defaultYear: number;
    allYears: number[];
    expiresAt: number;
  } | null = null;

  // In-memory cache for calculated rankings per target year
  private rankingsCache = new Map<number, { data: any; expiresAt: number }>();

  // Cache TTL: 10 minutes
  private readonly CACHE_TTL_MS = 10 * 60 * 1000;

  constructor(
    @InjectModel(Athlete.name) private athletes: Model<Athlete>,
    @InjectModel(Result.name) private results: Model<Result>,
    @InjectModel(Season.name) private seasons: Model<Season>,
    @InjectModel(School.name) private schools: Model<School>,
    @InjectModel(Competition.name) private competitions: Model<Competition>,
    private readonly seasonsService: SeasonsService,
  ) {}

  /**
   * Clears the rankings and year resolution cache (e.g. after importing new protocols/results)
   */
  invalidateCache() {
    this.cachedYearResolution = null;
    this.rankingsCache.clear();
  }

  private async resolveYearContext(yearOrSeasonId?: string | number): Promise<{
    targetYear: number;
    allYears: number[];
  }> {
    const now = Date.now();
    const currentSpec = determineSeason();
    const currentYear = currentSpec.year;

    let defaultYear = currentYear;
    let allYears: number[] = [];

    // Use cached year resolution if available and not expired
    if (this.cachedYearResolution && this.cachedYearResolution.expiresAt > now) {
      defaultYear = this.cachedYearResolution.defaultYear;
      allYears = this.cachedYearResolution.allYears;
    } else {
      // Ensure the current season exists in DB
      await this.seasonsService.ensureSeason();

      // Available season years
      const seasonYears = await this.seasons.distinct('year');
      const resultYears = await this.results.aggregate([
        { $match: { status: 'OK', athlete: { $ne: null }, date: { $ne: null } } },
        { $project: { year: { $year: '$date' } } },
        { $group: { _id: '$year' } },
      ]);
      allYears = Array.from(
        new Set([
          currentYear,
          ...seasonYears,
          ...resultYears.map((r: any) => r._id),
        ]),
      )
        .filter((y): y is number => typeof y === 'number' && !isNaN(y))
        .sort((a, b) => b - a);

      // Check if current athletic season year has any results
      const startOfSeasonYear = new Date(Date.UTC(currentYear - 1, 10, 1));
      const endOfSeasonYear = new Date(Date.UTC(currentYear, 9, 31, 23, 59, 59, 999));
      const matchingSeasons = await this.seasons.find({ year: currentYear }).select('_id').lean();
      const seasonIds = matchingSeasons.map((s) => s._id);

      const hasResults = await this.results.countDocuments({
        $or: [
          { season: { $in: seasonIds } },
          { date: { $gte: startOfSeasonYear, $lte: endOfSeasonYear } },
        ],
        status: 'OK',
        athlete: { $ne: null },
      });

      if (hasResults === 0) {
        const latestResult = await this.results
          .findOne({ status: 'OK', athlete: { $ne: null }, date: { $ne: null } })
          .sort({ date: -1 })
          .select('date')
          .lean();

        if (latestResult?.date) {
          const seasonSpec = determineSeason(new Date(latestResult.date));
          defaultYear = seasonSpec.year;
        } else {
          const fallback = allYears.find((y) => y !== currentYear);
          if (fallback) defaultYear = fallback;
        }
      }

      this.cachedYearResolution = {
        defaultYear,
        allYears,
        expiresAt: now + this.CACHE_TTL_MS,
      };
    }

    // Determine target year
    let targetYear = defaultYear;
    if (yearOrSeasonId) {
      const str = String(yearOrSeasonId).trim();
      const num = parseInt(str, 10);
      if (!isNaN(num) && num >= 1900 && num <= 2100 && str.length === 4) {
        targetYear = num;
      } else {
        const matchedSeason = await this.seasons.findById(str).lean();
        if (matchedSeason?.year) {
          targetYear = matchedSeason.year;
        }
      }
    }

    return { targetYear, allYears };
  }

  async getRankings(yearOrSeasonId?: string | number) {
    const { targetYear, allYears } = await this.resolveYearContext(yearOrSeasonId);

    const now = Date.now();
    const cachedRankings = this.rankingsCache.get(targetYear);
    if (cachedRankings && cachedRankings.expiresAt > now) {
      return {
        ...cachedRankings.data,
        allYears,
      };
    }

    // Seasons matching the year (stadium + manege)
    const matchingSeasons = await this.seasons.find({ year: targetYear }).select('_id year indoor label').lean();
    const seasonIds = matchingSeasons.map((s) => s._id);

    // Load athletes and schools
    const allAthletes = await this.athletes.find().populate('school').lean();
    const athleteMap = new Map<string, any>();
    for (const a of allAthletes) {
      athleteMap.set(String(a._id), {
        ...a,
        ageCategory: ageCategory(a.birthDate, new Date(Date.UTC(targetYear, 5, 1))),
      });
    }

    // Load results in athletic season year (Nov 1 of targetYear-1 through Oct 31 of targetYear)
    const startOfSeasonYear = new Date(Date.UTC(targetYear - 1, 10, 1));
    const endOfSeasonYear = new Date(Date.UTC(targetYear, 9, 31, 23, 59, 59, 999));

    const results = await this.results
      .find({
        $or: [
          { season: { $in: seasonIds } },
          { date: { $gte: startOfSeasonYear, $lte: endOfSeasonYear } },
        ],
        status: 'OK',
        athlete: { $ne: null },
      })
      .populate('competition', 'name level date')
      .populate('discipline', 'name nameEn type')
      .lean();

    // Group results by athlete and compute points
    const athleteResults = new Map<string, any[]>();
    for (const r of results) {
      const aId = String(r.athlete);
      const a = athleteMap.get(aId);
      if (!a) continue;

      const comp: any = r.competition;
      const level = comp?.level || 'obl';
      const aCat = r.ageCategory || a.ageCategory;

      const isPreliminaryRound = r.round && !r.round.toLowerCase().includes('фінал');
      const isLocalCompetition = level === 'obl' || level === 'regional' || level === 'city';
      const place =
        typeof r.place === 'number' && (isLocalCompetition || !isPreliminaryRound)
          ? r.place
          : null;
      const pts = calculateResultPoints({
        level,
        category: aCat,
        place,
        rank: r.rank,
        notes: r.notes,
      });

      const resItem = {
        resultId: String(r._id),
        competitionName: comp?.name || '–',
        competitionLevel: level,
        competitionDate: comp?.date || r.date,
        disciplineName: (r.discipline as any)?.name || '–',
        value: r.value,
        timing: r.timing,
        rawMark: r.rawMark,
        place,
        rank: r.rank,
        placePoints: pts.placePoints,
        bonusPoints: pts.bonusPoints,
        totalPoints: pts.totalPoints,
      };

      const list = athleteResults.get(aId) || [];
      list.push(resItem);
      athleteResults.set(aId, list);
    }

    // Calculate totals for each athlete (top 5 results across the whole year)
    const scoredAthletes: any[] = [];
    for (const [aId, resList] of athleteResults.entries()) {
      const a = athleteMap.get(aId);
      if (!a) continue;

      // Sort by points descending
      resList.sort((x, y) => y.totalPoints - x.totalPoints);
      const top5 = resList.slice(0, 5);
      const totalPoints = top5.reduce((sum, item) => sum + item.totalPoints, 0);

      scoredAthletes.push({
        athlete: {
          _id: a._id,
          lastName: a.lastName,
          firstName: a.firstName,
          middleName: a.middleName,
          birthDate: a.birthDate,
          gender: a.gender,
          ageCategory: a.ageCategory,
          club: a.club,
          school: a.school ? { _id: String(a.school._id), name: a.school.name, city: a.school.city } : undefined,
        },
        totalPoints,
        countedResultsCount: top5.length,
        results: top5,
      });
    }

    const sortAndRank = (list: any[]) => {
      return list
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 10)
        .map((item, idx) => ({ ...item, rank: idx + 1 }));
    };

    const u16_m = sortAndRank(scoredAthletes.filter((item) => item.athlete.ageCategory === 'U16' && item.athlete.gender === 'M'));
    const u16_f = sortAndRank(scoredAthletes.filter((item) => item.athlete.ageCategory === 'U16' && item.athlete.gender === 'F'));
    const u18_m = sortAndRank(scoredAthletes.filter((item) => item.athlete.ageCategory === 'U18' && item.athlete.gender === 'M'));
    const u18_f = sortAndRank(scoredAthletes.filter((item) => item.athlete.ageCategory === 'U18' && item.athlete.gender === 'F'));
    const adult_m = sortAndRank(
      scoredAthletes.filter(
        (item) => (item.athlete.ageCategory === 'ADULT' || item.athlete.ageCategory === 'U23' || item.athlete.ageCategory === 'U20') && item.athlete.gender === 'M',
      ),
    );
    const adult_f = sortAndRank(
      scoredAthletes.filter(
        (item) => (item.athlete.ageCategory === 'ADULT' || item.athlete.ageCategory === 'U23' || item.athlete.ageCategory === 'U20') && item.athlete.gender === 'F',
      ),
    );

    // Calculate school rankings
    const allSchools = await this.schools.find({ name: { $not: /особист/i } }).lean();
    const schoolMap = new Map<string, any>();
    for (const s of allSchools) {
      schoolMap.set(String(s._id), {
        _id: String(s._id),
        name: s.name,
        shortName: s.shortName,
        city: s.city,
        region: s.region,
        totalPoints: 0,
        athletes: [] as any[],
      });
    }

    for (const sa of scoredAthletes) {
      const sId = sa.athlete.school?._id;
      if (!sId) continue;
      const schoolItem = schoolMap.get(sId);
      if (schoolItem) {
        schoolItem.totalPoints += sa.totalPoints;
        schoolItem.athletes.push({
          _id: sa.athlete._id,
          lastName: sa.athlete.lastName,
          firstName: sa.athlete.firstName,
          middleName: sa.athlete.middleName,
          birthDate: sa.athlete.birthDate,
          gender: sa.athlete.gender,
          ageCategory: sa.athlete.ageCategory,
          totalPoints: sa.totalPoints,
          countedResultsCount: sa.countedResultsCount,
          results: sa.results,
        });
      }
    }

    const schoolsRanked = Array.from(schoolMap.values())
      .map((s) => {
        s.athletes.sort((a: any, b: any) => b.totalPoints - a.totalPoints);
        return {
          rank: 0,
          school: {
            _id: s._id,
            name: s.name,
            shortName: s.shortName,
            city: s.city,
            region: s.region,
          },
          totalPoints: s.totalPoints,
          athletesCount: s.athletes.filter((a: any) => a.totalPoints > 0).length,
          athletes: s.athletes,
        };
      })
      .filter((s) => s.totalPoints > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((s, idx) => ({ ...s, rank: idx + 1 }));

    const result = {
      year: targetYear,
      allYears,
      categories: {
        u16_m,
        u16_f,
        u18_m,
        u18_f,
        adult_m,
        adult_f,
      },
      schools: schoolsRanked.slice(0, 10),
    };

    this.rankingsCache.set(targetYear, {
      data: result,
      expiresAt: now + this.CACHE_TTL_MS,
    });

    return result;
  }

  async getSchoolRankingDetails(schoolId: string, yearOrSeasonId?: string | number) {
    const school = await this.schools.findById(schoolId).lean();
    if (!school) throw new NotFoundException('Школу не знайдено');
    const rankings = await this.getRankings(yearOrSeasonId);
    const matched = rankings.schools.find((s) => s.school._id === schoolId);
    return {
      school,
      year: rankings.year,
      totalPoints: matched?.totalPoints || 0,
      rank: matched?.rank || null,
      athletes: matched?.athletes || [],
    };
  }
}
