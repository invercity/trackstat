import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  RawWebCompetitionPayload,
  RawWebParticipantResult,
  WebCompetitionItem,
  WebIntegrationMeta,
  WebIntegrationProvider,
} from '../web-integration.interface';
import {
  decodeHtmlEntities,
  detectCompetitionLevel,
  detectGenderFromLabel,
  formatUkrainianName,
  IKS_OBLAST_MAP,
  parseUarDateToIso,
} from '../web-importer.utils';

export class IksIntegrationProvider implements WebIntegrationProvider {
  readonly meta: WebIntegrationMeta = {
    id: 'iks',
    name: 'IKS (iks.org.ua)',
    website: 'https://iks.org.ua/competitions1',
    description: 'Офіційні результати та протоколи змагань в Україні (IKS Results & Data Services)',
    defaultRegion: 'Чернігівська',
    enabled: true,
  };

  async getYears(): Promise<number[]> {
    try {
      const res = await fetch('https://iks.org.ua/competitions1/', {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrackStat/1.0)' },
      });
      if (res.ok) {
        const html = await res.text();
        const matches = [...html.matchAll(/<option\s+value="(\d{4})"/g)].map((m) => parseInt(m[1], 10));
        const uniqueYears = [...new Set(matches)].sort((a, b) => b - a);
        if (uniqueYears.length > 0) return uniqueYears;
      }
    } catch {
      // Fallback
    }
    return [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020];
  }

  async getCompetitions(year: number): Promise<WebCompetitionItem[]> {
    const res = await fetch(`https://iks.org.ua/competitions1/?year=${encodeURIComponent(year)}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrackStat/1.0)' },
    });
    if (!res.ok) {
      throw new BadRequestException(`Не вдалося завантажити змагання з IKS (код помилки ${res.status})`);
    }

    const html = await res.text();
    const rows = html.split(/<tr[^>]*>/i);
    const comps: WebCompetitionItem[] = [];
    const seenIds = new Set<string>();

    for (const r of rows) {
      const linkMatch = r.match(/<a\s+href="\/competitions1\/([^"/]+)"[^>]*title="([^"]+)"/i);
      if (!linkMatch) continue;

      const compId = linkMatch[1].trim();
      if (seenIds.has(compId)) continue;
      seenIds.add(compId);
      const rawTitle = decodeHtmlEntities(linkMatch[2]);

      const cells = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
        decodeHtmlEntities(c[1].replace(/<[^>]+>/g, '').trim()),
      );

      const startDateStr = cells[1] || '';
      const endDateStr = cells[2] || startDateStr;
      const title = cells[3] || rawTitle;
      const city = cells[6] || '';

      const startDate = parseUarDateToIso(startDateStr);
      let endDate = parseUarDateToIso(endDateStr) || startDate;

      if (startDate && endDate) {
        const startY = parseInt(startDate.slice(0, 4), 10);
        const endY = parseInt(endDate.slice(0, 4), 10);
        if (Math.abs(endY - startY) > 1) {
          endDate = `${startY}${endDate.slice(4)}`;
        }
      }

      const lower = title.toLowerCase();
      const indoor = lower.includes('приміщенні') || lower.includes('манеж');

      let region = '';
      const oblastMatch = r.match(/images\/oblast\/([a-z]+)\.png/i);
      if (oblastMatch && IKS_OBLAST_MAP[oblastMatch[1].toLowerCase()]) {
        region = IKS_OBLAST_MAP[oblastMatch[1].toLowerCase()];
      }

      comps.push({
        id: compId,
        title,
        startDate,
        endDate,
        city,
        region,
        country: 'Україна',
        indoor,
        year,
        detectedLevel: detectCompetitionLevel(title),
        hasSchedule: true,
      });
    }

    return comps;
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

    const resultsRes = await fetch(`https://iks.org.ua/competitions1/${encodeURIComponent(compId)}/results`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrackStat/1.0)' },
    });
    if (!resultsRes.ok) {
      throw new NotFoundException(`Змагання ${compId} не знайдено на IKS (код ${resultsRes.status})`);
    }

    const resultsHtml = await resultsRes.text();
    const rows = resultsHtml.split(/<tr[^>]*>/i);
    let currentDiscipline = '';
    const entries: Array<{
      discipline: string;
      category: string;
      roundStr: string;
      entryId: string;
    }> = [];

    for (const row of rows) {
      const discMatch = row.match(/<td[^>]*colspan="8"[^>]*><b>([\s\S]*?)<\/b>/i);
      if (discMatch) {
        currentDiscipline = decodeHtmlEntities(discMatch[1].replace(/<[^>]+>/g, '').trim());
        continue;
      }
      const resultLinkMatch = row.match(/result\?id_entry=([a-f0-9-]+)/i);
      if (resultLinkMatch && currentDiscipline) {
        const entryId = resultLinkMatch[1];
        const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
          decodeHtmlEntities(c[1].replace(/<small>[\s\S]*?<\/small>/gi, '').replace(/<[^>]+>/g, '').trim()),
        );
        entries.push({
          discipline: currentDiscipline,
          category: cells[2] || '',
          roundStr: cells[3] || '',
          entryId,
        });
      }
    }

    const BATCH_SIZE = 16;
    const entryResults: Array<{ entry: (typeof entries)[0]; html: string }> = [];
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE);
      const chunkRes = await Promise.all(
        chunk.map(async (entry) => {
          try {
            const r = await fetch(
              `https://iks.org.ua/competitions1/${encodeURIComponent(compId)}/result?id_entry=${encodeURIComponent(entry.entryId)}`,
              {
                cache: 'no-store',
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrackStat/1.0)' },
              },
            );
            if (!r.ok) return { entry, html: '' };
            const html = await r.text();
            return { entry, html };
          } catch {
            return { entry, html: '' };
          }
        }),
      );
      entryResults.push(...chunkRes);
    }

    const results: RawWebParticipantResult[] = [];
    const normRegion = regionFilter.trim().toLowerCase();

    for (const { entry, html } of entryResults) {
      if (!html) continue;

      const rawDisciplineName = entry.discipline;
      const rawCatStr = entry.category;
      const rawRoundStr = entry.roundStr;
      const gender = detectGenderFromLabel(rawCatStr);

      const windMatch = html.match(/Вітер\s*\|\s*Wind:\s*([+-]?\d+(?:\.\d+)?)/i);
      const wind = windMatch ? parseFloat(windMatch[1]) : undefined;

      const isRelay = rawDisciplineName.toLowerCase().includes('естафет');
      const pRows = html.split(/<tr[^>]*>/i);

      for (const pr of pRows) {
        const rawCells = [...pr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
          decodeHtmlEntities(c[1].replace(/<small>[\s\S]*?<\/small>/gi, '').replace(/<[^>]+>/g, '').trim()),
        );

        if (isRelay) {
          if (rawCells.length < 5 || !pr.includes('span style="white-space: nowrap;"')) continue;

          const placeNum = parseInt(rawCells[0], 10) || undefined;
          const rawMark = rawCells[1] || '';
          const cleanMark = rawMark.split(/\s+/)[0].trim();
          const pRegion = rawCells[4] || '';

          if (normRegion && !pRegion.toLowerCase().includes(normRegion)) continue;

          const athletesMatches = [...pr.matchAll(/([А-ЯЄІЇҐа-яєіїґ\s'-]+)&nbsp;\(?(\d{2}\.\d{2}\.\d{4})?\)?/g)];
          const relayMembers = athletesMatches.map((m) => formatUkrainianName(m[1].trim())).filter(Boolean);
          const relayName = pRegion ? `Естафета ${pRegion}` : 'Естафетна команда';

          results.push({
            rawDisciplineName,
            rawCategory: rawCatStr,
            rawRound: rawRoundStr,
            gender,
            isRelay: true,
            participantRegion: pRegion,
            teamStr: pRegion,
            lastName: relayName,
            firstName: '',
            relayMembers,
            rawMark: cleanMark,
            placeNum,
          });
          continue;
        }

        if (!pr.includes('card-by-name') && !pr.includes('athlete-photo')) continue;
        if (rawCells.length < 8) continue;

        const participantRegion = rawCells[7] || '';
        if (normRegion && !participantRegion.toLowerCase().includes(normRegion)) continue;

        const placeNum = parseInt(rawCells[0], 10) || undefined;
        const rawLastName = rawCells[4] || '';
        const rawFirstName = rawCells[5] || '';
        const dobStr = rawCells[6] || undefined;
        const rawMark = rawCells[8] || '';
        const cleanMark = rawMark.split(/\s+/)[0].trim();
        const grade = rawCells[10] || undefined;
        const team = rawCells[12] || rawCells[11] || '';
        const rawCoaches = rawCells[13] || '';
        const coaches = rawCoaches ? rawCoaches.split(/[,;/]+/).map((c) => c.trim()).filter(Boolean) : [];

        results.push({
          rawDisciplineName,
          rawCategory: rawCatStr,
          rawRound: rawRoundStr,
          gender,
          isRelay: false,
          participantRegion,
          teamStr: team || participantRegion,
          lastName: formatUkrainianName(rawLastName),
          firstName: formatUkrainianName(rawFirstName),
          dobStr,
          rawMark: cleanMark,
          placeNum,
          wind,
          grade,
          coaches,
        });
      }
    }

    const eventTitle = compItem?.title || `Змагання ${compId}`;
    const startDate = compItem?.startDate || '';
    const endDate = compItem?.endDate || startDate;

    return {
      compId,
      title: eventTitle,
      startDate,
      endDate,
      location: compItem?.city ? `м.${compItem.city}` : 'м.Київ',
      indoor: compItem?.indoor ?? false,
      year,
      results,
    };
  }
}
