import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeHtmlEntities,
  detectCompetitionLevel,
  detectGenderFromLabel,
  formatUkrainianName,
  IKS_OBLAST_MAP,
  parseUarDateToIso,
  WebImporterService,
  WebIntegrationProvider,
} from './web-importer.service';

describe('web-importer utilities and providers', () => {
  it('decodes HTML entities correctly', () => {
    assert.equal(decodeHtmlEntities('&#039;Привіт&#039; &amp; &quot;Світ&quot;'), '\'Привіт\' & "Світ"');
    assert.equal(decodeHtmlEntities('&nbsp;&nbsp;Текст&nbsp;'), 'Текст');
    assert.equal(decodeHtmlEntities(''), '');
  });

  it('formats Ukrainian names with proper capitalization', () => {
    assert.equal(formatUkrainianName('ШКЛЯРУК'), 'Шклярук');
    assert.equal(formatUkrainianName('іванов-петренко'), 'Іванов-Петренко');
    assert.equal(formatUkrainianName(''), '');
  });

  it('parses dates into ISO YYYY-MM-DD', () => {
    assert.equal(parseUarDateToIso('27.12.2025'), '2025-12-27');
    assert.equal(parseUarDateToIso('05.01.26'), '2026-01-05');
  });

  it('detects competition levels based on keywords', () => {
    assert.equal(detectCompetitionLevel('Чемпіонат України у приміщенні'), 'national');
    assert.equal(detectCompetitionLevel('Чемпіонат Чернігівської області серед юнаків'), 'regional');
    assert.equal(detectCompetitionLevel('Відкрита першість міста Чернігова'), 'city');
    assert.equal(detectCompetitionLevel('Міжнародні змагання пам’яті героїв'), 'international');
  });

  it('detects gender from category or gender labels', () => {
    assert.equal(detectGenderFromLabel('Дівчата U16'), 'F');
    assert.equal(detectGenderFromLabel('Жінки'), 'F');
    assert.equal(detectGenderFromLabel('Юнаки U18'), 'M');
    assert.equal(detectGenderFromLabel('Чоловіки'), 'M');
  });

  it('maps IKS oblast codes to Ukrainian region names', () => {
    assert.equal(IKS_OBLAST_MAP['chng'], 'Чернігівська');
    assert.equal(IKS_OBLAST_MAP['kyiv'], 'Київська');
    assert.equal(IKS_OBLAST_MAP['dnip'], 'Дніпропетровська');
  });

  it('registers default IKS and UAR providers and supports custom provider registration', async () => {
    const service = new WebImporterService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const integrations = service.getIntegrations();
    assert.equal(integrations.length, 2);
    assert.equal(integrations[0].id, 'iks');
    assert.equal(integrations[1].id, 'uar');

    const mockProvider: WebIntegrationProvider = {
      meta: {
        id: 'mock',
        name: 'Mock Provider',
        website: 'https://mock.test',
        description: 'Test provider',
        defaultRegion: 'Чернігівська',
        enabled: true,
      },
      getYears: async () => [2026],
      getCompetitions: async () => [],
      fetchCompetitionResults: async () => ({
        compId: '1',
        title: 'Test',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        location: 'м.Чернігів',
        indoor: true,
        year: 2026,
        results: [],
      }),
    };

    service.registerProvider(mockProvider);
    assert.equal(service.getIntegrations().length, 3);
    assert.deepEqual(await service.getYears('mock'), [2026]);
  });
});
