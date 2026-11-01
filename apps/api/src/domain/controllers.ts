import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CrudController } from '../common/crud';
import {
  AthletesService,
  CompetitionsService,
  DisciplinesService,
  ProtocolCommitPayload,
  ProtocolImporterService,
  RankingsService,
  RelaysService,
  ResultsService,
  SchoolsService,
  SeasonsService,
  WebImporterService,
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

  @Get('active-context')
  getActiveContext(@Query('year') year?: string) {
    return this.seasonsService.getActiveYearContext(year);
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
    @Query('indoor') indoor?: 'ALL' | 'outdoor' | 'indoor',
    @Query('category') category?: string,
    @Query('gender') gender?: 'M' | 'F',
    @Query('disciplineId') disciplineId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.resultsService.getLeaderboard({
      mode,
      year: year ? parseInt(year, 10) : undefined,
      indoor,
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

@Controller('protocol-import')
export class ProtocolImportController {
  constructor(private readonly importer: ProtocolImporterService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  async preview(@UploadedFile() file: { originalname: string; buffer: Buffer; mimetype?: string }) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Будь ласка, завантажте файл протоколу (.docx або .txt)');
    }
    return this.importer.preview(file.buffer, file.originalname);
  }

  @Post('commit')
  async commit(@Body() payload: ProtocolCommitPayload) {
    return this.importer.commit(payload);
  }
}

@Controller('web-import')
export class WebImportController {
  constructor(private readonly webImporter: WebImporterService) {}

  @Get('integrations')
  getIntegrations() {
    return this.webImporter.getIntegrations();
  }

  @Get(':integrationId/years')
  async getYears(@Param('integrationId') integrationId: string) {
    return this.webImporter.getYears(integrationId);
  }

  @Get(':integrationId/competitions')
  async getCompetitions(
    @Param('integrationId') integrationId: string,
    @Query('year') year?: string,
  ) {
    const seasonYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.webImporter.getCompetitions(integrationId, seasonYear);
  }

  @Get(':integrationId/competitions/:compId/preview')
  async previewCompetitionResults(
    @Param('integrationId') integrationId: string,
    @Param('compId') compId: string,
    @Query('year') year?: string,
    @Query('region') region?: string,
  ) {
    const seasonYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.webImporter.previewCompetitionResults(
      integrationId,
      compId,
      seasonYear,
      region ?? 'Чернігівська',
    );
  }

  @Post('commit')
  async commit(@Body() payload: ProtocolCommitPayload) {
    return this.webImporter.commit(payload);
  }
}



