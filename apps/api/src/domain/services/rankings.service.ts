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
  constructor(
    @InjectModel(Athlete.name) private athletes: Model<Athlete>,
    @InjectModel(Result.name) private results: Model<Result>,
    @InjectModel(Season.name) private seasons: Model<Season>,
    @InjectModel(School.name) private schools: Model<School>,
    @InjectModel(Competition.name) private competitions: Model<Competition>,
    private readonly seasonsService: SeasonsService,
  ) {}

  async getRankings(yearOrSeasonId?: string | number) {
    const currentSpec = determineSeason();
    const currentYear = currentSpec.year;

    // Ensure the current season exists in DB
    await this.seasonsService.ensureSeason();

    // Determine target year
    let targetYear = currentYear;
    if (yearOrSeasonId) {
      const str = String(yearOrSeasonId).trim();
      const num = parseInt(str, 10);
      if (!isNaN(num) && num >= 1900 && num <= 2100 && str.length === 4) {
        targetYear = num;
      } else {
        // Might be a Season ID
        const matchedSeason = await this.seasons.findById(str).lean();
        if (matchedSeason?.year) {
          targetYear = matchedSeason.year;
        }
      }
    }

    // Available season years
    const seasonYears = await this.seasons.distinct('year');
    const allYears = Array.from(new Set([currentYear, ...seasonYears]))
      .filter((y): y is number => typeof y === 'number' && !isNaN(y))
      .sort((a, b) => b - a);

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

      const place = typeof r.place === 'number' ? r.place : null;
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
    const allSchools = await this.schools.find().lean();
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

    return {
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
