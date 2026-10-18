import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrudService } from '../../common/crud';
import { Discipline, Result } from '../schemas';

@Injectable()
export class DisciplinesService extends CrudService {
  constructor(
    @InjectModel(Discipline.name) model: Model<Discipline>,
    @InjectModel(Result.name) private results: Model<Result>,
  ) {
    super(model);
  }

  async findAll() {
    return this.model.find().sort({ group: 1, name: 1 }).lean();
  }

  protected async guardRemove(id: string) {
    if (await this.results.exists({ discipline: id })) {
      throw new ConflictException('Є результати з цим видом');
    }
  }
}
