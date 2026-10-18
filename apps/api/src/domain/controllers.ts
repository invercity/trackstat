import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { CrudController } from '../common/crud';
import {
  AthletesService,
  CompetitionsService,
  DisciplinesService,
  RankingsService,
  RelaysService,
  ResultsService,
  SchoolsService,
  SeasonsService,
} from './services';

@Controller('disciplines')
export class DisciplinesController extends CrudController {
  constructor(s: DisciplinesService) {
    super(s);
  }
}

@Controller('seasons')
export class SeasonsController extends CrudController {
  constructor(private readonly seasonsService: SeasonsService) {
    super(seasonsService);
  }

  @Get('current')
  getCurrent() {
    return this.seasonsService.getCurrentSeason();
  }
}

@Controller('competitions')
export class CompetitionsController extends CrudController {
  constructor(private readonly competitions: CompetitionsService) {
    super(competitions);
  }

  @Get('latest-overview')
  latestOverview() {
    return this.competitions.latestOverview();
  }
}

@Controller('results')
export class ResultsController extends CrudController {
  constructor(private readonly resultsService: ResultsService) {
    super(resultsService);
  }

  @Get('leaderboard')
  getLeaderboard(
    @Query('mode') mode?: 'sb' | 'pb',
    @Query('year') year?: string,
    @Query('category') category?: string,
    @Query('gender') gender?: 'M' | 'F',
    @Query('disciplineId') disciplineId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.resultsService.getLeaderboard({
      mode,
      year: year ? parseInt(year, 10) : undefined,
      category,
      gender,
      disciplineId,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(':id')
  override one(@Param('id') id: string) {
    return super.one(id);
  }
}

@Controller('athletes')
export class AthletesController extends CrudController {
  constructor(private readonly athletes: AthletesService) {
    super(athletes);
  }

  @Get(':id/stats') stats(@Param('id') id: string) {
    return this.athletes.stats(id);
  }
}

@Controller('relays')
export class RelaysController {
  constructor(private readonly relays: RelaysService) {}

  @Get()
  getRelays() {
    return this.relays.getRelaysOverview();
  }

  @Get(':id')
  async getRelay(@Param('id') id: string) {
    const list = await this.relays.getRelaysOverview();
    const item = list.find((s) => s.id === id);
    if (!item) throw new NotFoundException('Естафету не знайдено');
    return item;
  }
}

@Controller('schools')
export class SchoolsController extends CrudController {
  constructor(private readonly schools: SchoolsService) {
    super(schools);
  }

  @Get(':id/athletes')
  getSchoolAthletes(@Param('id') id: string) {
    return this.schools.getSchoolAthletes(id);
  }
}

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankings: RankingsService) {}

  @Get()
  getRankings(@Query('year') year?: string, @Query('seasonId') seasonId?: string) {
    return this.rankings.getRankings(year || seasonId);
  }

  @Get('schools/:id')
  getSchoolRankingDetails(
    @Param('id') id: string,
    @Query('year') year?: string,
    @Query('seasonId') seasonId?: string,
  ) {
    return this.rankings.getSchoolRankingDetails(id, year || seasonId);
  }
}


