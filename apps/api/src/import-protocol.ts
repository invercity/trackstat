import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { connect, connection, model, Types } from 'mongoose';
import {
  Athlete,
  AthleteSchema,
  Competition,
  CompetitionSchema,
  Discipline,
  DisciplineSchema,
  Result,
  ResultSchema,
  Season,
  SeasonSchema,
} from './domain/schemas';
import { calculateWaScore } from './domain/wa-scoring';
import { determineSportRank } from './domain/ua-ranks';
import { parseProtocolDob as parseDob, parseProtocolValue as parseVal, matchStandardDisciplineName } from './common/protocol-parser';
import { ageCategory } from './common/age-category';

dotenv.config();

const AthleteModel = model(Athlete.name, AthleteSchema);
const CompetitionModel = model(Competition.name, CompetitionSchema);
const DisciplineModel = model(Discipline.name, DisciplineSchema);
const ResultModel = model(Result.name, ResultSchema);
const SeasonModel = model(Season.name, SeasonSchema);

function matchDisciplineName(title: string): string {
  return matchStandardDisciplineName(title) || '100 м';
}


function normalizeRank(r: string): string | undefined {
  if (!r) return undefined;
  const s = r.trim().replace(/ /g, '');
  if (s === 'КМС') return 'КМС';
  if (s === 'МС') return 'МС';
  if (s === 'МСМК') return 'МСМК';
  if (s === 'І' || s === 'I' || s === '1') return 'І';
  if (s === 'ІІ' || s === 'II' || s === '2') return 'ІІ';
  if (s === 'ІІІ' || s === 'III' || s === '3') return 'ІІІ';
  if (s === 'І-юн' || s === 'I-юн' || s === '1-юн') return 'І-юн';
  if (s === 'ІІ-юн' || s === 'II-юн' || s === '2-юн') return 'ІІ-юн';
  if (s === 'ІІІ-юн' || s === 'III-юн' || s === '3-юн') return 'ІІІ-юн';
  return s;
}

async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trackstat';
  console.log('Connecting to Mongo:', mongoUri);
  await connect(mongoUri);

  // 1. Сезон 2026
  let season = await SeasonModel.findOne({ year: 2026, indoor: false });
  if (!season) {
    season = await SeasonModel.create({ year: 2026, indoor: false, label: '2026' });
  }

  // 2. Дисципліна естафети
  await DisciplineModel.updateOne(
    { name: 'Естафета 100+200+300+400 м' },
    {
      $setOnInsert: {
        name: 'Естафета 100+200+300+400 м',
        nameEn: '100+200+300+400 m relay',
        type: 'time',
        group: 'relay',
        allowedCategories: [],
      },
    },
    { upsert: true },
  );

  const allDisciplines = await DisciplineModel.find().lean();
  const discMap = new Map<string, any>();
  for (const d of allDisciplines) {
    discMap.set(d.name, d);
  }

  // 3. Змагання
  const compName =
    'Командний чемпіонат Чернігівської області серед дорослих, юнаків та дівчат 2009-2010, 2011-2012 р.н.';
  const compDate = new Date(Date.UTC(2026, 8, 16));
  const compEndDate = new Date(Date.UTC(2026, 8, 17));

  let competition = await CompetitionModel.findOne({ name: compName, season: season._id });
  if (!competition) {
    competition = await CompetitionModel.create({
      name: compName,
      date: compDate,
      endDate: compEndDate,
      location: 'м.Чернігів, м.Носівка',
      season: season._id,
      ageCategories: [],
      disciplines: allDisciplines.map((d: any) => d._id),
    });
  }

  // 4. Очищення фейкових спортсменів для естафет
  const fakeAthletes = await AthleteModel.find({ firstName: /естафета/i });
  if (fakeAthletes.length) {
    const fakeIds = fakeAthletes.map((a: any) => a._id);
    await ResultModel.deleteMany({ athlete: { $in: fakeIds } });
    await AthleteModel.deleteMany({ _id: { $in: fakeIds } });
    console.log(`Deleted ${fakeAthletes.length} temporary relay athlete records`);
  }

  // 5. Читаємо протокол
  const rawPath = path.resolve(__dirname, '../../../data/protocol.txt');
  const text = fs.readFileSync(rawPath, 'utf8');
  const lines = text.split('\n');

  let currentGender: 'M' | 'F' = 'M';
  let currentEventHeader = '';
  let importedCount = 0;
  let skippedCount = 0;

  for (const line of lines) {
    const tr = line.trim();
    if (!tr) continue;
    if (tr.includes('Чоловіки.')) {
      currentGender = 'M';
      continue;
    }
    if (tr.includes('Жінки.')) {
      currentGender = 'F';
      continue;
    }

    if (
      tr.startsWith('|') &&
      (tr.includes('Біг') ||
        tr.includes('Стрибки') ||
        tr.includes('Потрійний') ||
        tr.includes('Штовхання') ||
        tr.includes('Метання') ||
        tr.includes('Естафетний'))
    ) {
      currentEventHeader = tr.replace(/\|/g, '').replace(/<td.*?\/>/g, '').trim();
      continue;
    }

    if (tr.startsWith('|') && (tr.includes('Місце') || tr.includes('---'))) continue;

    if (tr.startsWith('|') && currentEventHeader) {
      const cols = tr
        .split('|')
        .map((c) => c.replace(/<td.*?\/>/g, '').trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      if (cols.length < 6) continue;

      const [placeStr, nameStr, dobStr, teamStr, resStr, rankStr, ptsStr, coachStr] = cols;
      if (!nameStr) continue;

      const isRelay = currentEventHeader.includes('Естафетний біг');
      const discCanonicalName = matchDisciplineName(currentEventHeader);
      const discDoc = discMap.get(discCanonicalName);
      if (!discDoc) {
        console.warn('Unknown discipline:', discCanonicalName);
        continue;
      }

      // Визначаємо тренера
      const coaches = (coachStr || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      // Визначаємо регіон
      let region = 'Чернігівська';
      if (teamStr.includes('Київ') || teamStr.includes('БСФК')) {
        region = teamStr.includes('Бровари') ? 'Київська' : 'Київ';
      }

      let athleteDoc: any = null;
      let relayMembers: string[] = [];
      const relayAthletes: any[] = [];

      if (isRelay) {
        relayMembers = nameStr
          .split(/\s{2,}/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const mName of relayMembers) {
          const parts = mName.split(/\s+/);
          if (parts.length >= 2) {
            const found = await AthleteModel.findOne({ lastName: parts[0], firstName: parts[1] });
            if (found) relayAthletes.push(found._id);
          }
        }
      } else {
        // Індивідуальний спортсмен
        const dob = parseDob(dobStr) || new Date(Date.UTC(2010, 0, 1));
        const nameParts = nameStr.trim().split(/\s+/);
        const lastName = nameParts[0];
        const firstName = nameParts[1] || '';
        const middleName = nameParts.slice(2).join(' ') || undefined;

        athleteDoc = await AthleteModel.findOne({ lastName, firstName, birthDate: dob });
        if (!athleteDoc) {
          athleteDoc = await AthleteModel.create({
            lastName,
            firstName,
            middleName,
            birthDate: dob,
            gender: currentGender,
            club: teamStr,
            region,
            coaches,
          });
        } else {
          // Оновлюємо тренерів/клуб, якщо ще не було
          let updated = false;
          if (!athleteDoc.club && teamStr) {
            athleteDoc.club = teamStr;
            updated = true;
          }
          if (coaches.length && (!athleteDoc.coaches || athleteDoc.coaches.length === 0)) {
            athleteDoc.coaches = coaches;
            updated = true;
          }
          if (updated) await athleteDoc.save();
        }
      }

      // Парсимо результат
      const parsed = parseVal(resStr);
      const placeNum = parseInt(placeStr, 10);
      const isPk = placeStr.toLowerCase().includes('п/к') || placeStr.toLowerCase().includes('ос');
      const isPersonal = ptsStr?.toLowerCase().includes('ос') || isPk;
      const teamPts = parseInt(ptsStr, 10);

      const discTiming = discDoc.type === 'time' ? parsed.timing : undefined;

      let rank = normalizeRank(rankStr);
      if (!rank && parsed.status === 'OK' && parsed.val !== null) {
        // Розраховуємо за нормативами ЄСКУ
        const autoRank = determineSportRank(currentGender, discCanonicalName, parsed.val, discTiming);
        if (autoRank) rank = autoRank;
      }

      let waScore: number | undefined;
      if (parsed.status === 'OK' && parsed.val !== null) {
        const sc = calculateWaScore(currentGender, discCanonicalName, parsed.val, discTiming);
        if (sc !== null && sc > 0) waScore = sc;
      }

      const athleteCat = athleteDoc ? ageCategory(athleteDoc.birthDate, compDate) : 'U18';

      const notesParts: string[] = [];
      if (isRelay) {
        notesParts.push(currentGender === 'M' ? 'юнаки' : 'дівчата');
      }
      if (currentEventHeader.includes('р.н.')) {
        notesParts.push(currentEventHeader.split(',')[1]?.trim() || '');
      }
      if (resStr.includes('Ф-') && !parsed.isFinal) {
        notesParts.push(`Забіг: ${resStr}`);
      }
      if (isPersonal) notesParts.push('Особисто');
      if (isPk) notesParts.push('Поза конкурсом');

      const roundVal = parsed.isFinal ? 'фінал' : 'забіг';

      // Створюємо або оновлюємо результат
      const filterQuery: any = {
        competition: competition._id,
        discipline: discDoc._id,
        round: roundVal,
      };
      if (isRelay) {
        filterQuery.teamName = teamStr;
        filterQuery.athlete = { $exists: false };
      } else {
        filterQuery.athlete = athleteDoc._id;
      }

      await ResultModel.updateOne(
        filterQuery,
        {
          $set: {
            athlete: athleteDoc ? athleteDoc._id : undefined,
            teamName: isRelay ? teamStr : undefined,
            relayMembers: isRelay ? relayMembers : undefined,
            relayAthletes: isRelay ? relayAthletes : undefined,
            season: season._id,
            date: compDate,
            status: parsed.status,
            value: parsed.val,
            timing: discTiming,
            rawMark: resStr.trim(),
            place: !isNaN(placeNum) ? placeNum : undefined,
            rank: rank || undefined,
            waScore: waScore,
            teamPoints: !isNaN(teamPts) ? teamPts : undefined,
            ageCategory: athleteCat,
            notes: notesParts.filter(Boolean).join('; ') || undefined,
          },
        },
        { upsert: true },
      );

      importedCount++;
    }
  }

  console.log(`✅ Successfully imported ${importedCount} results!`);
  await connection.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
