import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { connect, connection, model } from 'mongoose';
import { Discipline, DisciplineSchema } from './domain/schemas';

dotenv.config();

const D = (name: string, nameEn: string, type: string, group: string) => ({ name, nameEn, type, group });

const disciplines = [
  D('60 м', '60 m', 'time', 'sprint'),
  D('100 м', '100 m', 'time', 'sprint'),
  D('200 м', '200 m', 'time', 'sprint'),
  D('400 м', '400 m', 'time', 'sprint'),
  D('800 м', '800 m', 'time', 'middle'),
  D('1500 м', '1500 m', 'time', 'middle'),
  D('3000 м', '3000 m', 'time', 'long'),
  D('5000 м', '5000 m', 'time', 'long'),
  D('10000 м', '10000 m', 'time', 'long'),
  D('60 м з бар’єрами', '60 m hurdles', 'time', 'hurdles'),
  D('100 м з бар’єрами', '100 m hurdles', 'time', 'hurdles'),
  D('110 м з бар’єрами', '110 m hurdles', 'time', 'hurdles'),
  D('400 м з бар’єрами', '400 m hurdles', 'time', 'hurdles'),
  D('3000 м з перешкодами', '3000 m steeplechase', 'time', 'steeple'),
  D('Стрибки у висоту', 'High jump', 'distance', 'jump'),
  D('Стрибки з жердиною', 'Pole vault', 'distance', 'jump'),
  D('Стрибки у довжину', 'Long jump', 'distance', 'jump'),
  D('Потрійний стрибок', 'Triple jump', 'distance', 'jump'),
  D('Штовхання ядра', 'Shot put', 'distance', 'throw'),
  D('Метання диска', 'Discus throw', 'distance', 'throw'),
  D('Метання молота', 'Hammer throw', 'distance', 'throw'),
  D('Метання списа', 'Javelin throw', 'distance', 'throw'),
  D('Семиборство', 'Heptathlon', 'points', 'combined'),
  D('Десятиборство', 'Decathlon', 'points', 'combined'),
];

async function main() {
  await connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trackstat');
  const M = model(Discipline.name, DisciplineSchema);
  for (const d of disciplines) await M.updateOne({ name: d.name }, { $setOnInsert: d }, { upsert: true });
  console.log(`Seeded ${disciplines.length} disciplines`);
  await connection.close();
}
main();
