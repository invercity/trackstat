import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrudService } from '../../common/crud';
import { determineSeason, SeasonSpec } from '../../common/season';
import { Competition, Season } from '../schemas';

@Injectable()
export class SeasonsService extends CrudService {
  constructor(
    @InjectModel(Season.name) model: Model<Season>,
    @InjectModel(Competition.name) private competitions: Model<Competition>,
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

  protected async guardRemove(id: string) {
    if (await this.competitions.exists({ season: id })) {
      throw new ConflictException('У сезоні є змагання');
    }
  }
}
