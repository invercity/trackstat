import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { AGE_CATEGORIES } from '../common/age-category';

export const DISCIPLINE_TYPES = ['time', 'distance', 'points'] as const;
export const RESULT_STATUSES = ['OK', 'DNS', 'DNF', 'DQ', 'NM'] as const;
const catEnum = { type: [{ type: String, enum: AGE_CATEGORIES }], default: [] };

/** Вид змагань (100м, 400м, стрибки у висоту ...) */
@Schema({ timestamps: true })
export class Discipline {
  @Prop({ required: true, unique: true, trim: true }) name: string;
  @Prop({ required: true, trim: true }) nameEn: string;
  /** time — менше краще (сек), distance — більше краще (м), points — більше краще (очки) */
  @Prop({ required: true, enum: DISCIPLINE_TYPES }) type: string;
  @Prop({ default: 'sprint' }) group: string;
  /** Порожньо = доступний усім віковим категоріям */
  @Prop(catEnum) allowedCategories: string[];
}
export const DisciplineSchema = SchemaFactory.createForClass(Discipline);

/** Сезон: рік + ознака indoor. Приклад: "2025 (i)", "2026" */
@Schema({ timestamps: true })
export class Season {
  @Prop({ required: true, min: 1900, max: 2100 }) year: number;
  @Prop({ default: false }) indoor: boolean;
  @Prop() label: string;
}
export const SeasonSchema = SchemaFactory.createForClass(Season);
SeasonSchema.index({ year: 1, indoor: 1 }, { unique: true });
SeasonSchema.pre('validate', function () {
  this.label = `${this.year}${this.indoor ? ' (i)' : ''}`;
});

/** Спортивна школа (ДЮСШ, СДЮШОР, ШВСМ, клуб тощо) */
@Schema({ timestamps: true })
export class School {
  @Prop({ required: true, unique: true, trim: true }) name: string;
  @Prop({ trim: true }) shortName?: string;
  @Prop({ trim: true }) city?: string;
  @Prop({ trim: true }) region?: string;
  @Prop() notes?: string;
}
export const SchoolSchema = SchemaFactory.createForClass(School);

@Schema({ timestamps: true })
export class Athlete {
  @Prop({ required: true, trim: true }) lastName: string;
  @Prop({ required: true, trim: true }) firstName: string;
  @Prop({ trim: true }) middleName?: string;
  @Prop({ required: true }) birthDate: Date;
  @Prop({ required: true, enum: ['M', 'F'] }) gender: string;
  @Prop({ type: [String], default: [] }) coaches: string[];
  @Prop() club?: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'School', required: false }) school?: Types.ObjectId;
  @Prop() region?: string;
  @Prop() notes?: string;
}
export const AthleteSchema = SchemaFactory.createForClass(Athlete);
AthleteSchema.index({ lastName: 1, firstName: 1 });

export const COMPETITION_LEVELS = [
  'city',          // Міські змагання / чемпіонат міста
  'regional',      // Чемпіонат області / обласні змагання
  'national',      // Чемпіонат України / національні змагання
  'international', // Міжнародні змагання
  'obl',           // Чемпіонат області / обласні змагання (legacy)
  'ukraine',       // Чемпіонат України (legacy)
  'team_ukraine',  // Командний ЧУ (legacy)
  'cup_ukraine',   // Кубок України (legacy)
  'europe',        // Чемпіонат Європи (legacy)
  'world',         // Чемпіонат світу (legacy)
  'olympic',       // Олімпійські ігри (legacy)
  'youth_olympic', // Олімпійські юнацькі ігри (legacy)
  'universiade',   // Всесвітня Універсіада (legacy)
  'euro_youth',    // Європейські дитячі ігри (legacy)
  'other',         // Інші змагання
] as const;

@Schema({ timestamps: true })
export class Competition {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true }) date: Date;
  @Prop() endDate?: Date;
  @Prop({ required: true, trim: true }) location: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Season', required: true }) season: Types.ObjectId;
  /** Порожньо = без обмежень */
  @Prop(catEnum) ageCategories: string[];
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Discipline' }], default: [] }) disciplines: Types.ObjectId[];
  /** Рівень змагань для підрахунку рейтингових очок */
  @Prop({ default: 'obl', enum: COMPETITION_LEVELS }) level: string;
}
export const CompetitionSchema = SchemaFactory.createForClass(Competition);

@Schema({ timestamps: true })
export class Result {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Competition', required: true }) competition: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Athlete', required: false }) athlete?: Types.ObjectId;
  @Prop() teamName?: string;
  @Prop({ type: [String], default: [] }) relayMembers?: string[];
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Athlete' }], default: [] }) relayAthletes?: Types.ObjectId[];
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Discipline', required: true }) discipline: Types.ObjectId;
  /** Денормалізація з competition — для швидких вибірок/статистики */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Season', required: true }) season: Types.ObjectId;
  @Prop({ required: true }) date: Date;
  @Prop({ enum: RESULT_STATUSES, default: 'OK' }) status: string;
  /** сек / м / очки — залежно від discipline.type */
  @Prop() value?: number;
  /** Тип хронометражу для бігових видів: manual (ручний, точність до 0.1с) | electronic (електронний, точність до 0.01с) */
  @Prop({ enum: ['manual', 'electronic'], required: false }) timing?: 'manual' | 'electronic';
  /** Оригінальний текстовий запис результату (напр. '11,4', '12,0', 'Ф-11,4') */
  @Prop() rawMark?: string;
  @Prop() wind?: number;
  @Prop() place?: number;
  @Prop() round?: string;
  /** Вікова категорія спортсмена на момент змагання (фіксується при збереженні) */
  @Prop({ enum: AGE_CATEGORIES, required: false }) ageCategory?: string;
  @Prop() rank?: string;
  @Prop() waScore?: number;
  @Prop() teamPoints?: number;
  @Prop() notes?: string;
}
export const ResultSchema = SchemaFactory.createForClass(Result);
ResultSchema.index({ athlete: 1, discipline: 1 });
ResultSchema.index({ competition: 1 });
ResultSchema.index({ athlete: 1, competition: 1, discipline: 1, round: 1 });

export type DisciplineDoc = HydratedDocument<Discipline>;
