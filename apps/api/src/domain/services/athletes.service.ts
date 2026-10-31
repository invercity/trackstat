import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ageCategory } from '../../common/age-category';
import { CrudService } from '../../common/crud';
import { compareDisciplineNames } from '../../common/protocol-parser';
import { pickBestMark } from '../../common/result-comparison';
import { Athlete, Result } from '../schemas';

const oid = (v: any) => String(v?._id ?? v);

@Injectable()
export class AthletesService extends CrudService {
  constructor(
    @InjectModel(Athlete.name) model: Model<Athlete>,
    @InjectModel(Result.name) private results: Model<Result>,
  ) {
    super(model);
  }

  private withCategory(a: any) {
    return { ...a, ageCategory: ageCategory(a.birthDate) };
  }

  async findAll(query: any = {}) {
    const filter: any = {};
    if (query.gender) filter.gender = query.gender;
    if (query.schoolId) filter.school = query.schoolId;
    else if (query.school) filter.school = query.school;

    if (query.search) {
      const rx = new RegExp(String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matchingSchools = await this.model.db
        .model('School')
        .find({ $or: [{ name: rx }, { shortName: rx }, { city: rx }] })
        .select('_id')
        .lean();
      const schoolIds = matchingSchools.map((s: any) => s._id);

      filter.$or = [
        { lastName: rx },
        { firstName: rx },
        { middleName: rx },
        { club: rx },
        ...(schoolIds.length > 0 ? [{ school: { $in: schoolIds } }] : []),
      ];
    }

    const lang = query.lang === 'en' ? 'en' : 'uk';
    const sortBy = query.sortBy || 'lastName';
    const order = query.order === 'desc' ? -1 : 1;
    const sortSpec: any = {};
    if (sortBy === 'birthDate') {
      sortSpec.birthDate = order;
      sortSpec.lastName = order;
    } else if (sortBy === 'club') {
      sortSpec.club = order;
      sortSpec.lastName = order;
    } else {
      sortSpec.lastName = order;
      sortSpec.firstName = order;
    }

    const hasPagination = query.page !== undefined;
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const findCursor = this.model
      .find(filter)
      .populate('school')
      .collation({ locale: lang, strength: 2 })
      .sort(sortSpec);

    if (hasPagination) {
      findCursor.skip(skip).limit(limit);
    }

    const [athletes, total] = await Promise.all([
      findCursor.lean(),
      hasPagination ? this.model.countDocuments(filter) : Promise.resolve(0),
    ]);

    // основні дисципліни = топ-3 за кількістю результатів
    const counts = await this.results.aggregate([
      { $match: { status: { $ne: 'DNS' }, athlete: { $in: athletes.map((a: any) => a._id) } } },
      { $group: { _id: { a: '$athlete', d: '$discipline' }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $lookup: { from: 'disciplines', localField: '_id.d', foreignField: '_id', as: 'd' } },
      { $unwind: '$d' },
    ]);
    const main = new Map<string, any[]>();
    for (const c of counts) {
      const list = main.get(oid(c._id.a)) ?? [];
      if (list.length < 3) list.push({ _id: c.d._id, name: c.d.name, nameEn: c.d.nameEn });
      main.set(oid(c._id.a), list);
    }
    const items = athletes.map((a: any) => ({ ...this.withCategory(a), mainDisciplines: main.get(oid(a._id)) ?? [] }));

    if (hasPagination) {
      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
    return items;
  }

  async findOne(id: string) {
    const a = await this.model.findById(id).populate('school').lean();
    if (!a) throw new NotFoundException();
    return this.withCategory(a);
  }

  protected async guardRemove(id: string) {
    if (await this.results.exists({ athlete: id })) {
      throw new ConflictException('У спортсмена є результати');
    }
  }

  /** Персональні рекорди (загальний / outdoor / indoor) та season best по кожному сезону */
  async stats(id: string) {
    await this.findOne(id);
    const rows: any[] = await this.results
      .find({ athlete: id, status: 'OK', value: { $ne: null } })
      .populate('discipline', 'name nameEn type')
      .populate('season')
      .populate('competition', 'name date location')
      .lean();

    const slim = (r: any) => ({
      resultId: r._id,
      value: r.value,
      timing: r.timing,
      rawMark: r.rawMark,
      wind: r.wind,
      date: r.date,
      ageCategory: r.ageCategory,
      rank: r.rank,
      waScore: r.waScore,
      competition: r.competition,
      season: r.season,
    });

    const groupBy = <T>(list: T[], key: (x: T) => string) => {
      const m = new Map<string, T[]>();
      list.forEach((x) => m.set(key(x), [...(m.get(key(x)) ?? []), x]));
      return m;
    };

    const personalBests = [...groupBy(rows, (r) => oid(r.discipline)).values()]
      .map((list) => {
        const type = list[0]?.discipline?.type || 'time';
        const pick = (l: any[]) => {
          const best = pickBestMark(l, type);
          return best ? slim(best) : null;
        };
        return {
          discipline: list[0].discipline,
          overall: pick(list),
          outdoor: pick(list.filter((r) => !r.season.indoor)),
          indoor: pick(list.filter((r) => r.season.indoor)),
        };
      })
      .sort((a, b) => compareDisciplineNames(a.discipline?.name, b.discipline?.name));

    const seasonBests = [...groupBy(rows, (r) => oid(r.season)).values()]
      .map((list) => {
        const sType = (l: any[]) => l[0]?.discipline?.type || 'time';
        return {
          season: list[0].season,
          results: [...groupBy(list, (r) => oid(r.discipline)).values()]
            .map((l) => {
              const b = pickBestMark(l, sType(l))!;
              return { discipline: b.discipline, ...slim(b) };
            })
            .sort((a, b) => compareDisciplineNames(a.discipline?.name, b.discipline?.name)),
        };
      })
      .sort((a, b) => b.season.year - a.season.year || Number(a.season.indoor) - Number(b.season.indoor));

    return { personalBests, seasonBests };
  }
}
