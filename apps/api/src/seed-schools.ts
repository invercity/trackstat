import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Athlete, School } from './domain/schemas';
import { Model } from 'mongoose';
import { resolveSchool } from './common/school-resolver';

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
    const resolved = resolveSchool(a.club);
    if (!resolved) {
      if (a.school) {
        a.school = undefined;
        await a.save();
      }
      continue;
    }
    const { name, city } = resolved;
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
