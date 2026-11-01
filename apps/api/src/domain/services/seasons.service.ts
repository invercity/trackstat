import { ConflictException, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrudService } from '../../common/crud';
import { determineSeason, SeasonSpec } from '../../common/season';
import { Competition, Result, Season } from '../schemas';
import { AppCacheService } from '../../common/cache/app-cache.service';

@Injectable()
export class SeasonsService extends CrudService {
  constructor(
    @InjectModel(Season.name) model: Model<Season>,
    @InjectModel(Competition.name) private competitions: Model<Competition>,
    @InjectModel(Result.name) private results: Model<Result>,
    @Optional() private readonly cache: AppCacheService = new AppCacheService(),
  ) {
    super(model);
  }

  async findAll() {
    const list = await this.model.find().sort({ year: -1, indoor: -1 }).lean();
    const current = determineSeason();
    return list.map((s: any) => ({
      ...s,
      isCurrent: s.year === current.year && s.indoor === current.indoor,
    }));
  }

  /**
   * Гарантує наявність запису сезону в БД для вказаної дати (або поточної, якщо date не задано).
   * Автоматично створює запис сезону, якщо він ще не існує.
   */
  async ensureSeason(date?: Date | string | null) {
    const spec: SeasonSpec = determineSeason(date || undefined);
    let current = await this.model.findOne({ year: spec.year, indoor: spec.indoor }).lean();
    if (!current) {
      current = (await this.model.create({
        year: spec.year,
        indoor: spec.indoor,
        label: spec.label,
      })).toObject();
    }
    return {
      spec,
      season: current,
    };
  }

  async getCurrentSeason() {
    const { spec, season } = await this.ensureSeason();
    return {
      ...spec,
      season,
    };
  }

  /**
   * Повертає контекст активного атлетичного року (сезону):
   * - defaultYear: автоматично обраний рік (якщо в поточному сезоні 0 результатів, обирається останній з результатами)
   * - targetYear: рік, що запитувався, або defaultYear
   * - allYears: усі доступні роки в системі (відсортовані за спаданням)
   *
   * Результат кешується через AppCacheService (10 хвилин), уникаючи повторних важких агрегацій.
   */
  async getActiveYearContext(explicitYearOrSeasonId?: string | number): Promise<{
    defaultYear: number;
    targetYear: number;
    allYears: number[];
    isCurrentYear: boolean;
  }> {
    const { defaultYear, allYears } = await this.cache.getOrSet(
      'season:active_year_context',
      async () => {
        const currentSpec = determineSeason();
        const currentYear = currentSpec.year;

        await this.ensureSeason();

        const seasonYears = await this.model.distinct('year');
        const resultYears = await this.results.aggregate([
          { $match: { status: 'OK', athlete: { $ne: null }, date: { $ne: null } } },
          { $project: { year: { $year: '$date' } } },
          { $group: { _id: '$year' } },
        ]);
        const computedAllYears = Array.from(
          new Set([
            currentYear,
            ...seasonYears,
            ...resultYears.map((r: any) => r._id),
          ]),
        )
          .filter((y): y is number => typeof y === 'number' && !isNaN(y))
          .sort((a, b) => b - a);

        const startOfSeasonYear = new Date(Date.UTC(currentYear - 1, 10, 1));
        const endOfSeasonYear = new Date(Date.UTC(currentYear, 9, 31, 23, 59, 59, 999));
        const matchingSeasons = await this.model.find({ year: currentYear }).select('_id').lean();
        const seasonIds = matchingSeasons.map((s: any) => s._id);

        const hasResults = await this.results.countDocuments({
          $or: [
            { season: { $in: seasonIds } },
            { date: { $gte: startOfSeasonYear, $lte: endOfSeasonYear } },
          ],
          status: 'OK',
          athlete: { $ne: null },
        });

        let computedDefaultYear = currentYear;
        if (hasResults === 0) {
          const latestResult = await this.results
            .findOne({ status: 'OK', athlete: { $ne: null }, date: { $ne: null } })
            .sort({ date: -1 })
            .select('date')
            .lean();

          if (latestResult?.date) {
            const seasonSpec = determineSeason(new Date(latestResult.date));
            computedDefaultYear = seasonSpec.year;
          } else {
            const fallback = computedAllYears.find((y) => y !== currentYear);
            if (fallback) computedDefaultYear = fallback;
          }
        }

        return {
          defaultYear: computedDefaultYear,
          allYears: computedAllYears,
        };
      },
      10 * 60 * 1000,
    );

    let targetYear = defaultYear;
    if (explicitYearOrSeasonId) {
      const str = String(explicitYearOrSeasonId).trim();
      const num = parseInt(str, 10);
      if (!isNaN(num) && num >= 1900 && num <= 2100 && str.length === 4) {
        targetYear = num;
      } else {
        const matchedSeason = await this.model.findById(str).lean();
        if (matchedSeason?.year) {
          targetYear = matchedSeason.year;
        }
      }
    }

    const currentYear = determineSeason().year;
    return {
      defaultYear,
      targetYear,
      allYears,
      isCurrentYear: targetYear === currentYear,
    };
  }

  /**
   * Скидає кеш активного року та пов'язані залежні кеші
   */
  invalidateYearContext() {
    this.cache.deletePrefix('season:');
    this.cache.deletePrefix('rankings:');
    this.cache.deletePrefix('leaderboard:');
  }

  protected async guardRemove(id: string) {
    if (await this.competitions.exists({ season: id })) {
      throw new ConflictException('У сезоні є змагання');
    }
  }
}
