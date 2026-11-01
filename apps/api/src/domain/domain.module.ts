import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AthletesController,
  CompetitionsController,
  DisciplinesController,
  ProtocolImportController,
  RankingsController,
  RelaysController,
  ResultsController,
  SchoolsController,
  SeasonsController,
  WebImportController,
} from './controllers';
import {
  Athlete,
  AthleteSchema,
  Competition,
  CompetitionSchema,
  Discipline,
  DisciplineSchema,
  Result,
  ResultSchema,
  School,
  SchoolSchema,
  Season,
  SeasonSchema,
} from './schemas';
import {
  AthletesService,
  CompetitionsService,
  DisciplinesService,
  ProtocolImporterService,
  RankingsService,
  RelaysService,
  ResultsService,
  SchoolsService,
  SeasonsService,
  WebImporterService,
  AppCacheService,
} from './services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Discipline.name, schema: DisciplineSchema },
      { name: Season.name, schema: SeasonSchema },
      { name: Athlete.name, schema: AthleteSchema },
      { name: Competition.name, schema: CompetitionSchema },
      { name: Result.name, schema: ResultSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
  ],
  controllers: [
    DisciplinesController,
    SeasonsController,
    AthletesController,
    CompetitionsController,
    ResultsController,
    RelaysController,
    SchoolsController,
    RankingsController,
    ProtocolImportController,
    WebImportController,
  ],
  providers: [
    AppCacheService,
    DisciplinesService,
    SeasonsService,
    AthletesService,
    CompetitionsService,
    ResultsService,
    RelaysService,
    SchoolsService,
    RankingsService,
    ProtocolImporterService,
    WebImporterService,
  ],
  exports: [AppCacheService],
})
export class DomainModule {}
