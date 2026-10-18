import { Body, Delete, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { Model } from 'mongoose';

export class CrudService {
  constructor(protected readonly model: Model<any>) {}

  async findAll(_query: any = {}): Promise<any> {
    return this.model.find().lean();
  }

  async findOne(id: string): Promise<any> {
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new NotFoundException();
    return doc;
  }

  async create(body: any): Promise<any> {
    return (await this.model.create(body)).toObject();
  }

  async update(id: string, body: any): Promise<any> {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException();
    doc.set(body);
    await doc.save(); // виконує валідацію та хуки
    return doc.toObject();
  }

  /** Перевизначається в нащадках, щоб заборонити видалення пов'язаних даних. */
  protected async guardRemove(_id: string): Promise<void> {}

  async remove(id: string) {
    await this.guardRemove(id);
    const res = await this.model.deleteOne({ _id: id });
    if (!res.deletedCount) throw new NotFoundException();
    return { deleted: true };
  }
}

export class CrudController {
  constructor(protected readonly service: CrudService) {}

  @Get() list(@Query() query: any) {
    return this.service.findAll(query);
  }
  @Get(':id') one(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Post() create(@Body() body: any) {
    return this.service.create(body);
  }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
