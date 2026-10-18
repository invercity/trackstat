import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrudService } from '../../common/crud';
import { Competition, Result } from '../schemas';
import { SeasonsService } from './seasons.service';

@Injectable()
export class CompetitionsService extends CrudService {
  constructor(
    @InjectModel(Competition.name) model: Model<Competition>,
    @InjectModel(Result.name) private results: Model<Result>,
    private readonly seasonsService: SeasonsService,
  ) {
    super(model);
  }

  async create(body: any) {
    // If season is not provided, automatically deduce and ensure season from competition date
    if (!body.season && body.date) {
      const { season } = await this.seasonsService.ensureSeason(body.date);
      if (season?._id) {
        body.season = season._id;
      }
    }
    return super.create(body);
  }

  private populate(q: any) {
    return q.populate('season').populate('disciplines', 'name nameEn type');
  }

  async findAll(query: any = {}) {
    const filter: any = {};
    if (query.seasonId) filter.season = query.seasonId;
    return this.populate(this.model.find(filter).sort({ date: -1 })).lean();
  }

  async findOne(id: string) {
    const doc = await this.populate(this.model.findById(id)).lean();
    if (!doc) throw new NotFoundException();
    return doc;
  }

  async latestOverview() {
    const comps = await this.populate(this.model.find().sort({ date: -1 }).limit(3)).lean();

    const fetchTop = async (compId: any, gender: 'M' | 'F') => {
      const top = await this.results.aggregate([
        { $match: { competition: compId, waScore: { $exists: true, $ne: null }, athlete: { $ne: null } } },
        { $lookup: { from: 'athletes', localField: 'athlete', foreignField: '_id', as: 'a' } },
        { $unwind: '$a' },
        { $match: { 'a.gender': gender } },
        { $lookup: { from: 'disciplines', localField: 'discipline', foreignField: '_id', as: 'd' } },
        { $unwind: '$d' },
        { $sort: { waScore: -1 } },
        { $group: { _id: '$athlete', doc: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$doc' } },
        { $sort: { waScore: -1 } },
        { $limit: 5 },
      ]);

      return top.map((r: any) => ({
        _id: r._id,
        athlete: {
          _id: r.a._id,
          lastName: r.a.lastName,
          firstName: r.a.firstName,
          middleName: r.a.middleName,
          gender: r.a.gender,
        },
        discipline: {
          _id: r.d._id,
          name: r.d.name,
          nameEn: r.d.nameEn,
          type: r.d.type,
        },
        value: r.value,
        timing: r.timing,
        rank: r.rank,
        waScore: r.waScore,
        round: r.round,
      }));
    };

    return Promise.all(
      comps.map(async (c: any) => ({
        ...c,
        topMen: await fetchTop(c._id, 'M'),
        topWomen: await fetchTop(c._id, 'F'),
      })),
    );
  }

  protected async guardRemove(id: string) {
    if (await this.results.exists({ competition: id })) {
      throw new ConflictException('У змаганні є результати');
    }
  }
}
