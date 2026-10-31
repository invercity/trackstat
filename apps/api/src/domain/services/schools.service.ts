import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ageCategory } from '../../common/age-category';
import { CrudService } from '../../common/crud';
import { Athlete, School } from '../schemas';

@Injectable()
export class SchoolsService extends CrudService {
  constructor(
    @InjectModel(School.name) model: Model<School>,
    @InjectModel(Athlete.name) private athletes: Model<Athlete>,
  ) {
    super(model);
  }

  async findAll() {
    const schools = await this.model
      .find({ name: { $not: /особист/i } })
      .sort({ name: 1 })
      .lean();
    const counts = await this.athletes.aggregate([
      { $match: { school: { $ne: null } } },
      { $group: { _id: '$school', count: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>(counts.map((c: any) => [String(c._id), c.count]));
    return schools.map((s: any) => ({
      ...s,
      athleteCount: countMap.get(String(s._id)) || 0,
    }));
  }

  async findOne(id: string) {
    const school = await this.model.findById(id).lean();
    if (!school) throw new NotFoundException('Школу не знайдено');
    const athleteCount = await this.athletes.countDocuments({ school: id });
    return {
      ...school,
      athleteCount,
    };
  }

  async getSchoolAthletes(schoolId: string) {
    const athletes = await this.athletes
      .find({ school: schoolId })
      .populate('school')
      .sort({ lastName: 1, firstName: 1 })
      .lean();
    return athletes.map((a: any) => ({
      ...a,
      ageCategory: ageCategory(a.birthDate),
    }));
  }

  protected async guardRemove(id: string) {
    if (await this.athletes.exists({ school: id })) {
      throw new ConflictException('До цієї школи привʼязані спортсмени');
    }
  }
}
