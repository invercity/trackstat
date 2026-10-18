import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Athlete, School } from './domain/schemas';
import { Model } from 'mongoose';

const SCHOOL_RULES: [string, string, string[]][] = [
  ['ДЮСШ «Атлет» ЧМР', 'Чернігів', ['атлет']],
  ['ДЮСШ «Україна» ЧМР', 'Чернігів', ['україна']],
  ['КДЮСШ №2 ЧМР', 'Чернігів', ['кдюсш №2', 'кдюсш 2', '№2']],
  ['Чернігівська ОШВСМ', 'Чернігів', ['ошвсм']],
  ['ОДЮСШ з олімпійських видів', 'Чернігів', ['одюсш']],
  ['ЧО ДЮСШ «Інваспорт»', 'Чернігів', ['інваспорт']],
  ['Ніжинська КДЮСШ', 'Ніжин', ['ніжин']],
  ['Прилуцька ДЮСШ', 'Прилуки', ['прилук', 'прилуьц']],
  ['Новгород-Сіверська ДЮСШ', 'Новгород-Сіверський', ['сіверськ']],
  ['Носівська ДЮСШ', 'Носівка', ['носів']],
  ['ДЮСШ «Олімпієць» Гончарівської СТГ', 'Гончарівське', ['олімпієць', 'гончарів']],
  ['ДЮСШ Сухополов’янської СР', 'Сухополова', ['сухопол']],
  ['Бахмацька ДЮСШ', 'Бахмач', ['бахмач']],
  ['Борзнянська ДЮСШ', 'Борзна', ['борзн']],
  ['Козелецька ДЮСШ', 'Козелець', ['козелець']],
  ['Коропська ДЮСШ', 'Короп', ['короп']],
  ['Корюківська ДЮСШ', 'Корюківка', ['корюків']],
  ['Менська ДЮСШ', 'Мена', ['менськ', 'мена']],
  ['Понорницька ДЮСШ / СТГ', 'Понорниця', ['понорниц']],
  ['Effect Run Club', 'Чернігів', ['effect']],
  ['БСФК м.Бровари', 'Бровари', ['бсфк', 'бровар']],
  ['Донецька ШВСМ', 'Донецьк', ['донецьк']],
  ['Східний ЦОП', '', ['цоп']],
  ['Чернігів, НГУ', 'Чернігів', ['нгу']],
  ['Київська область', 'Київська обл.', ['київська обл']],
  ['м.Київ', 'Київ', ['м.київ']],
  ['Особисто (Чернігів)', 'Чернігів', ['особисто', 'чернігів']],
];

function resolveSchool(club?: string): { name: string; city: string } {
  if (!club || !club.trim()) {
    return { name: 'Особисто', city: '' };
  }
  const cLow = club.toLowerCase();
  for (const [name, city, keywords] of SCHOOL_RULES) {
    if (keywords.some((kw) => cLow.includes(kw))) {
      return { name, city };
    }
  }
  return { name: club.trim(), city: '' };
}

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const schoolModel = app.get<Model<School>>(getModelToken(School.name));
  const athleteModel = app.get<Model<Athlete>>(getModelToken(Athlete.name));

  const athletes = await athleteModel.find();
  console.log(`Found ${athletes.length} athletes`);

  const schoolCache = new Map<string, any>();

  // Load existing schools
  const existingSchools = await schoolModel.find();
  for (const s of existingSchools) {
    schoolCache.set(s.name, s);
  }

  let updatedCount = 0;

  for (const a of athletes) {
    const { name, city } = resolveSchool(a.club);
    let sDoc = schoolCache.get(name);
    if (!sDoc) {
      sDoc = await schoolModel.create({ name, city });
      schoolCache.set(name, sDoc);
      console.log(`Created school: ${name} (${city})`);
    }

    a.school = sDoc._id;
    await a.save();
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} athletes with school references!`);
  console.log(`Total schools in database: ${schoolCache.size}`);

  await app.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
