import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  RawWebCompetitionPayload,
  RawWebParticipantResult,
  WebCompetitionItem,
  WebIntegrationMeta,
  WebIntegrationProvider,
} from '../web-integration.interface';
import {
  detectCompetitionLevel,
  detectGenderFromLabel,
  formatUkrainianName,
  parseUarDateToIso,
} from '../web-importer.utils';

export class UarIntegrationProvider implements WebIntegrationProvider {
  readonly meta: WebIntegrationMeta = {
    id: 'uar',
    name: 'UAR (Ukraine Athletics Results)',
    website: 'https://uar.com.ua',
    description: 'Офіційні результати ФЛАУ: Чемпіонати, Кубки України та Всеукраїнські змагання',
    defaultRegion: 'Чернігівська',
    enabled: true,
  };

  async getYears(): Promise<number[]> {
    try {
      const res = await fetch('https://uar.com.ua/api/years.php', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.years) && data.years.length > 0) {
        return data.years.map((y: any) => Number(y)).sort((a: number, b: number) => b - a);
      }
    } catch {
      // Fallback
    }
    return [2026, 2025];
  }

  async getCompetitions(year: number): Promise<WebCompetitionItem[]> {
    const res = await fetch(`https://uar.com.ua/api/competitions.php?year=${encodeURIComponent(year)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new BadRequestException(`Не вдалося завантажити змагання з UAR (код помилки ${res.status})`);
    }

    const data = await res.json();
    const rawList = Array.isArray(data.competitions) ? data.competitions : [];

    return rawList.map((c: any) => ({
      id: String(c.id || ''),
      title: String(c.title || ''),
      startDate: parseUarDateToIso(c.start),
      endDate: parseUarDateToIso(c.end),
      city: String(c.city || ''),
      region: String(c.region || ''),
      country: String(c.country || 'Україна'),
      indoor: c.indoor === 'Так',
      year: Number(c.year) || year,
      detectedLevel: detectCompetitionLevel(c.title),
      hasSchedule: !!c.hasSchedule,
    }));
  }

  async fetchCompetitionResults(
    compId: string,
    year: number,
    regionFilter: string,
  ): Promise<RawWebCompetitionPayload> {
    let compItem: WebCompetitionItem | undefined;
    try {
      const allComps = await this.getCompetitions(year);
      compItem = allComps.find((c) => c.id === compId);
    } catch {}

    const eventRes = await fetch(
      `https://uar.com.ua/api/event-data.php?year=${encodeURIComponent(year)}&id=${encodeURIComponent(compId)}`,
      { cache: 'no-store' },
    );
    if (!eventRes.ok) {
      throw new NotFoundException(`Змагання ${compId} не знайдено на UAR`);
    }

    const eventData = await eventRes.json();
    const timetable: any[][] = Array.isArray(eventData.timetable) ? eventData.timetable : [];
    const eventTitle = String(eventData.title || compItem?.title || `Змагання ${compId}`);

    const validTimetable = timetable.filter((row) => row && row.length >= 6 && row[0] && row[5]);

    const fetchedResults: Array<{ row: any[]; data: any }> = [];
    const BATCH_SIZE = 10;
    for (let i = 0; i < validTimetable.length; i += BATCH_SIZE) {
      const chunk = validTimetable.slice(i, i + BATCH_SIZE);
      const chunkRes = await Promise.all(
        chunk.map(async (row) => {
          const tid = row[0];
          try {
            const r = await fetch(
              `https://uar.com.ua/api/xml-table.php?year=${encodeURIComponent(year)}&id=${encodeURIComponent(compId)}&type=tp&tid=${encodeURIComponent(tid)}`,
              { cache: 'no-store' },
            );
            if (!r.ok) return { row, data: null };
            const j = await r.json();
            return { row, data: j };
          } catch {
            return { row, data: null };
          }
        }),
      );
      fetchedResults.push(...chunkRes);
    }

    const results: RawWebParticipantResult[] = [];
    const normRegion = regionFilter.trim().toLowerCase();

    for (const { row, data } of fetchedResults) {
      if (!data || !data.groups || !Array.isArray(data.groups)) continue;

      const rawDisciplineName = String(row[5] || '').trim();
      const rawGenderStr = String(row[6] || '');
      const rawCatStr = String(row[7] || '').trim();
      const rawRoundStr = String(row[8] || '').trim();
      const gender = detectGenderFromLabel(rawGenderStr);

      for (const group of data.groups) {
        const participants = Array.isArray(group.participants) ? group.participants : [];

        for (const p of participants) {
          const participantRegion = String(p.region || '').trim();
          if (normRegion && !participantRegion.toLowerCase().includes(normRegion)) {
            continue;
          }

          const isRelay = !!p.isRelay || !!data.isRelay;
          const rawMark = String(p.mark || '').trim();
          const placeNum =
            p.placeOrLane && !isNaN(parseInt(p.placeOrLane, 10))
              ? parseInt(p.placeOrLane, 10)
              : undefined;

          if (isRelay) {
            const relayName = participantRegion ? `Естафета ${participantRegion}` : 'Естафетна команда';
            const relayMembers = (p.athletes || []).map((a: any) =>
              `${formatUkrainianName(a.lastName)} ${formatUkrainianName(a.firstName)}`.trim(),
            );
            results.push({
              rawDisciplineName,
              rawCategory: rawCatStr,
              rawRound: rawRoundStr,
              gender,
              isRelay: true,
              participantRegion,
              teamStr: participantRegion,
              lastName: relayName,
              firstName: '',
              relayMembers,
              rawMark,
              placeNum,
            });
          } else {
            results.push({
              rawDisciplineName,
              rawCategory: rawCatStr,
              rawRound: rawRoundStr,
              gender,
              isRelay: false,
              participantRegion,
              teamStr: participantRegion,
              lastName: formatUkrainianName(p.lastName),
              firstName: formatUkrainianName(p.firstName),
              dobStr: p.dob ? String(p.dob).trim() : undefined,
              rawMark,
              placeNum,
            });
          }
        }
      }
    }

    const startDate = compItem?.startDate || parseUarDateToIso(timetable[0]?.[1]);
    const endDate = compItem?.endDate || parseUarDateToIso(timetable[timetable.length - 1]?.[1]) || startDate;

    return {
      compId,
      title: eventTitle,
      startDate,
      endDate,
      location: compItem?.city || 'м.Київ',
      indoor: compItem?.indoor ?? false,
      year,
      results,
    };
  }
}
