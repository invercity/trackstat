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
  if (title.includes('Естафета') || title.includes('Естафетний')) return 'Естафета 100+200+300+400 м';
  if (title.includes('100 з/б') || title.includes('100 м з/б')) return '100 м з бар’єрами';
  if (title.includes('110 м з/б') || title.includes('110 з/б')) return '110 м з бар’єрами';
  if (title.includes('100м') || title.includes('100 м')) return '100 м';
  if (title.includes('200м') || title.includes('200 м')) return '200 м';
  if (title.includes('400м') || title.includes('400 м')) return '400 м';
  if (title.includes('800м') || title.includes('800 м')) return '800 м';
  if (title.includes('1500м') || title.includes('1500 м')) return '1500 м';
  if (title.includes('Стрибки у довжину')) return 'Стрибки у довжину';
  if (title.includes('Потрійний')) return 'Потрійний стрибок';
  if (title.includes('Штовхання ядра')) return 'Штовхання ядра';
  if (title.includes('Метання диска')) return 'Метання диска';
  if (title.includes('Метання списа')) return 'Метання списа';
  return title;
}

function normalizeRank(r: string): string | undefined {
  if (!r) return undefined;
  const s = r.trim().replace(/ /g, '');
  if (s === '-' || s === '–') return undefined;
  if (s === 'КМС') return 'КМС';
  if (s === 'МС') return 'МС';
  if (s === 'МСМК') return 'МСМК';
  if (s === 'І' || s === 'I' || s === '1' || s === 'Ір.' || s === 'Ір') return 'І';
  if (s === 'ІІ' || s === 'II' || s === '2' || s === 'ІІр.' || s === 'ІІр') return 'ІІ';
  if (s === 'ІІІ' || s === 'III' || s === '3' || s === 'ІІІр.' || s === 'ІІІр') return 'ІІІ';
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

  const allDisciplines = await DisciplineModel.find().lean();
  const discMap = new Map<string, any>();
  for (const d of allDisciplines) {
    discMap.set(d.name, d);
  }

  // 2. Змагання: Чемпіонат Чернігівської області
  const compName = 'Чемпіонат Чернігівської області з легкої атлетики серед дорослих, юнаків та дівчат 2008-2009, 2010-2011 рр.н.';
  const compDate = new Date(Date.UTC(2026, 4, 14)); // 14 травня 2026

  let competition = await CompetitionModel.findOne({ name: compName, season: season._id });
  if (!competition) {
    competition = await CompetitionModel.create({
      name: compName,
      date: compDate,
      location: 'м.Чернігів',
      season: season._id,
      ageCategories: [],
      disciplines: allDisciplines.map((d: any) => d._id),
    });
    console.log(`Created competition: "${compName}"`);
  } else {
    console.log(`Found existing competition: "${compName}"`);
  }

  // 3. Читаємо data/protocol-2.txt
  const rawPath = path.resolve(__dirname, '../../../data/protocol-2.txt');
  const text = fs.readFileSync(rawPath, 'utf8');
  const lines = text.split('\n');

  let currentGender: 'M' | 'F' = 'M';
  let currentEventHeader = '';
  let startParsing = false;
  let importedCount = 0;
  let athleteCreatedCount = 0;
  let athleteMatchedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (rawLine.includes('Особисті  результати.') || rawLine.includes('Особисті результати.')) {
      startParsing = true;
      continue;
    }
    if (!startParsing) continue;

    if (rawLine.includes('Жінки.')) {
      currentGender = 'F';
      continue;
    }
    if (rawLine.includes('Чоловіки.')) {
      currentGender = 'M';
      continue;
    }

    if (!rawLine.startsWith('|') || !rawLine.endsWith('|')) continue;

    const rawCells = rawLine
      .split('|')
      .map((c) => c.replace(/<td.*?\/>/g, '').trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    if (rawCells.some((c) => c.includes('Місце') || c.includes('спортсмена'))) continue;

    const nonEmpty = rawCells.filter(Boolean);
    if (
      nonEmpty.length === 1 &&
      (nonEmpty[0].includes('100') ||
        nonEmpty[0].includes('200') ||
        nonEmpty[0].includes('400') ||
        nonEmpty[0].includes('800') ||
        nonEmpty[0].includes('1500') ||
        nonEmpty[0].includes('Стрибки') ||
        nonEmpty[0].includes('Потрійний') ||
        nonEmpty[0].includes('Штовхання') ||
        nonEmpty[0].includes('Метання') ||
        nonEmpty[0].includes('Естафета'))
    ) {
      currentEventHeader = nonEmpty[0];
      continue;
    }

    if (rawCells.length === 7) {
      const placeStr = rawCells[0];
      const nameStr = rawCells[1];
      const dobStr = rawCells[2];
      const teamStr = rawCells[3];
      const resStr = rawCells[4];
      const rankStr = rawCells[5];
      const coachStr = rawCells[6];

      if (!nameStr && !resStr) continue;

      const discCanonicalName = matchDisciplineName(currentEventHeader);
      const discDoc = discMap.get(discCanonicalName);
      if (!discDoc) {
        console.warn(`Discipline not found for header: "${currentEventHeader}" -> "${discCanonicalName}"`);
        continue;
      }

      const isRelay = discDoc.group === 'relay' || discDoc.name.toLowerCase().includes('естафет');
      let athleteDoc: any = null;
      let relayMembers: string[] = [];
      let relayAthletes: Types.ObjectId[] = [];

      const coaches = coachStr
        ? coachStr
            .split(/[,;]/)
            .map((c) => c.trim())
            .filter((c) => c && c !== 'особисто')
        : [];

      if (isRelay) {
        relayMembers = nameStr
          .split(/\s{2,}/)
          .map((s) => s.trim())
          .filter(Boolean);

        for (const mName of relayMembers) {
          const parts = mName.split(/\s+/);
          if (parts.length >= 2) {
            const found = await AthleteModel.findOne({
              lastName: new RegExp(`^${parts[0]}$`, 'i'),
              firstName: new RegExp(`^${parts[1]}$`, 'i'),
            });
            if (found) relayAthletes.push(found._id);
          }
        }
      } else {
        const nameParts = nameStr.trim().split(/\s+/);
        const lastName = nameParts[0];
        const firstName = nameParts[1] || '';
        const middleName = nameParts.slice(2).join(' ') || undefined;

        const dob = parseDob(dobStr);

        // Пошук існуючого спортсмена
        athleteDoc = await AthleteModel.findOne({
          lastName: new RegExp(`^${lastName}$`, 'i'),
          firstName: new RegExp(`^${firstName}$`, 'i'),
        });

        if (athleteDoc) {
          athleteMatchedCount++;
          let updated = false;

          // Якщо дата в базі була неточною (1 січня), а в протоколі є точна дата:
          if (dob && athleteDoc.birthDate.getUTCMonth() === 0 && athleteDoc.birthDate.getUTCDate() === 1) {
            if (dob.getUTCMonth() !== 0 || dob.getUTCDate() !== 1) {
              athleteDoc.birthDate = dob;
              updated = true;
            }
          }

          if (!athleteDoc.club && teamStr) {
            athleteDoc.club = teamStr;
            updated = true;
          }
          if (coaches.length > 0 && (!athleteDoc.coaches || athleteDoc.coaches.length === 0)) {
            athleteDoc.coaches = coaches;
            updated = true;
          }
          if (updated) await athleteDoc.save();
        } else {
          // Створюємо нового спортсмена
          athleteCreatedCount++;
          athleteDoc = await AthleteModel.create({
            lastName,
            firstName,
            middleName,
            birthDate: dob || new Date(Date.UTC(2010, 0, 1)),
            gender: currentGender,
            club: teamStr || undefined,
            coaches,
          });
        }
      }

      // Парсимо результат
      const parsed = parseVal(resStr);
      const placeNum = parseInt(placeStr, 10);
      const discTiming = discDoc.type === 'time' ? parsed.timing : undefined;

      let rank = normalizeRank(rankStr);
      if (!rank && parsed.status === 'OK' && parsed.val !== null) {
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
        const ageMatch = currentEventHeader.match(/\d{4}-\d{4}\s*р\.н\./);
        if (ageMatch) notesParts.push(ageMatch[0]);
      }
      if (parsed.heatStr) {
        notesParts.push(`Забіг: ${parsed.heatStr}`);
      }

      const roundVal = parsed.isFinal ? 'фінал' : 'забіг';

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
            ageCategory: athleteCat,
            notes: notesParts.filter(Boolean).join('; ') || undefined,
          },
        },
        { upsert: true },
      );

      // Якщо був попередній забіг (наприклад "11,4 Ф-11,2"), зберігаємо також результат забігу!
      if (parsed.heatStr && athleteDoc) {
        const heatParsed = parseVal(parsed.heatStr);
        if (heatParsed.status === 'OK' && heatParsed.val !== null) {
          const heatTiming = discDoc.type === 'time' ? heatParsed.timing : undefined;
          const heatScore = calculateWaScore(currentGender, discCanonicalName, heatParsed.val, heatTiming);
          const heatRank = determineSportRank(currentGender, discCanonicalName, heatParsed.val, heatTiming);

          await ResultModel.updateOne(
            {
              competition: competition._id,
              discipline: discDoc._id,
              athlete: athleteDoc._id,
              round: 'забіг',
            },
            {
              $set: {
                athlete: athleteDoc._id,
                season: season._id,
                date: compDate,
                status: 'OK',
                value: heatParsed.val,
                timing: heatTiming,
                rawMark: parsed.heatStr,
                rank: heatRank || undefined,
                waScore: heatScore || undefined,
                ageCategory: athleteCat,
                notes: 'Попередній забіг',
              },
            },
            { upsert: true },
          );
        }
      }

      importedCount++;
    }
  }

  console.log(`✅ Successfully processed protocol!`);
  console.log(`   - Total results imported/updated: ${importedCount}`);
  console.log(`   - Athletes matched with existing: ${athleteMatchedCount}`);
  console.log(`   - New athletes created: ${athleteCreatedCount}`);

  const totalAthletes = await AthleteModel.countDocuments();
  const totalResults = await ResultModel.countDocuments();
  const totalComps = await CompetitionModel.countDocuments();
  console.log(`📊 DB Summary:`);
  console.log(`   - Competitions: ${totalComps}`);
  console.log(`   - Total Athletes: ${totalAthletes}`);
  console.log(`   - Total Results: ${totalResults}`);

  await connection.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
