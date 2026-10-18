import type { ReactNode } from 'react';
import { detectTiming, formatDate, formatValue, fullName, parseValue } from '@/lib/format';
import type { Competition, Discipline } from '@/lib/types';
import { AGE_CATEGORIES } from '@/lib/types';

type I18n = { t: (k: string) => string; dName: (d: any) => string };
type Option = { value: string; label: string };
export type Lookups = Record<string, any[]>;

export interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'tags' | 'multi';
  required?: boolean;
  options?: Option[]; // статичні варіанти
  ref?: string; // або підвантажувати з /api/<ref>
  help?: string;
  step?: string;
}

export interface ResourceDef {
  path: string;
  title: string;
  fields: FieldDef[];
  columns: { label: string; render: (item: any) => ReactNode }[];
  /** Фільтр списку за посиланням (напр. результати конкретного змагання) */
  filter?: { param: string; ref: string; label: string };
  refLabel: Record<string, (item: any) => string>;
  toForm?: (item: any) => Record<string, any>;
  toPayload?: (form: Record<string, any>, lookups: Lookups) => Record<string, any>;
}

export function buildResources({ t, dName }: I18n): Record<string, ResourceDef> {
  const cats: Option[] = AGE_CATEGORIES.map((c) => ({ value: c, label: t(`cat.${c}`) }));
  const refLabel = {
    athletes: (a: any) => `${fullName(a)} (${formatDate(a.birthDate)})`,
    disciplines: (d: any) => dName(d),
    seasons: (s: any) => s.label,
    competitions: (c: any) => `${formatDate(c.date)} · ${c.name}`,
    schools: (s: any) => s.name,
  };
  const idOf = (v: any) => (v && typeof v === 'object' ? v._id : v);

  return {
    athletes: {
      path: '/athletes',
      title: t('admin.athletes'),
      refLabel,
      fields: [
        { name: 'lastName', label: t('f.lastName'), type: 'text', required: true },
        { name: 'firstName', label: t('f.firstName'), type: 'text', required: true },
        { name: 'middleName', label: t('f.middleName'), type: 'text' },
        { name: 'birthDate', label: t('f.birthDate'), type: 'date', required: true },
        { name: 'gender', label: t('f.gender'), type: 'select', required: true, options: [{ value: 'M', label: t('f.M') }, { value: 'F', label: t('f.F') }] },
        { name: 'coaches', label: t('f.coaches'), type: 'tags' },
        { name: 'school', label: t('f.school'), type: 'select', ref: 'schools' },
        { name: 'club', label: t('f.club'), type: 'text' },
        { name: 'region', label: t('f.region'), type: 'text' },
        { name: 'notes', label: t('f.notes'), type: 'textarea' },
      ],
      columns: [
        { label: t('f.fullName'), render: (a) => fullName(a) },
        { label: t('f.birthDate'), render: (a) => formatDate(a.birthDate) },
        { label: t('f.school'), render: (a) => a.school?.name || a.club || '–' },
        { label: t('f.category'), render: (a) => t(`cat.${a.ageCategory}`) },
        { label: t('f.coach'), render: (a) => a.coaches?.join(', ') },
      ],
      toForm: (a) => ({ ...a, school: idOf(a.school) }),
    },
    schools: {
      path: '/schools',
      title: t('admin.schools'),
      refLabel,
      fields: [
        { name: 'name', label: t('f.schoolName'), type: 'text', required: true },
        { name: 'shortName', label: t('f.shortName'), type: 'text' },
        { name: 'city', label: t('f.city'), type: 'text' },
        { name: 'region', label: t('f.region'), type: 'text' },
        { name: 'notes', label: t('f.notes'), type: 'textarea' },
      ],
      columns: [
        { label: t('f.schoolName'), render: (s) => s.name },
        { label: t('f.city'), render: (s) => s.city || '–' },
        { label: t('f.region'), render: (s) => s.region || '–' },
      ],
    },
    disciplines: {
      path: '/disciplines',
      title: t('admin.disciplines'),
      refLabel,
      fields: [
        { name: 'name', label: t('f.name'), type: 'text', required: true },
        { name: 'nameEn', label: t('f.nameEn'), type: 'text', required: true },
        { name: 'type', label: t('f.type'), type: 'select', required: true, options: ['time', 'distance', 'points'].map((x) => ({ value: x, label: t(`type.${x}`) })) },
        { name: 'group', label: t('f.group'), type: 'text' },
        { name: 'allowedCategories', label: t('f.allowedCategories'), type: 'multi', options: cats },
      ],
      columns: [
        { label: t('f.name'), render: (d) => d.name },
        { label: t('f.nameEn'), render: (d) => d.nameEn },
        { label: t('f.type'), render: (d) => t(`type.${d.type}`) },
        { label: t('f.allowedCategories'), render: (d) => d.allowedCategories?.map((c: string) => t(`cat.${c}`)).join(', ') || t('common.all') },
      ],
    },
    seasons: {
      path: '/seasons',
      title: t('admin.seasons'),
      refLabel,
      fields: [
        { name: 'year', label: t('f.year'), type: 'number', required: true },
        { name: 'indoor', label: t('f.indoor'), type: 'checkbox' },
      ],
      columns: [{ label: t('f.season'), render: (s) => s.label }],
    },
    competitions: {
      path: '/competitions',
      title: t('admin.competitions'),
      refLabel,
      fields: [
        { name: 'name', label: t('f.name'), type: 'text', required: true },
        {
          name: 'level',
          label: t('f.competitionLevel'),
          type: 'select',
          required: true,
          options: [
            { value: 'city', label: t('level.city') },
            { value: 'regional', label: t('level.regional') },
            { value: 'national', label: t('level.national') },
            { value: 'international', label: t('level.international') },
            { value: 'obl', label: 'Чемпіонат області (legacy)' },
            { value: 'ukraine', label: 'Чемпіонат України (legacy)' },
            { value: 'europe', label: 'Чемпіонат Європи (legacy)' },
            { value: 'world', label: 'Чемпіонат світу (legacy)' },
          ],
        },
        { name: 'date', label: t('f.date'), type: 'date', required: true },
        { name: 'endDate', label: t('f.endDate'), type: 'date' },
        { name: 'location', label: t('f.location'), type: 'text', required: true },
        { name: 'season', label: t('f.season'), type: 'select', required: true, ref: 'seasons' },
        { name: 'ageCategories', label: t('f.ageCategories'), type: 'multi', options: cats },
        { name: 'disciplines', label: t('f.disciplines'), type: 'multi', ref: 'disciplines' },
      ],
      columns: [
        { label: t('f.date'), render: (c: Competition) => formatDate(c.date) },
        { label: t('f.name'), render: (c: Competition) => c.name },
        { label: t('f.location'), render: (c: Competition) => c.location },
        { label: t('f.season'), render: (c: Competition) => c.season?.label },
        { label: t('f.ageCategories'), render: (c: Competition) => c.ageCategories.map((x) => t(`cat.${x}`)).join(', ') || t('common.all') },
      ],
      toForm: (c) => ({ ...c, season: idOf(c.season), disciplines: c.disciplines?.map(idOf) ?? [], level: c.level || 'obl' }),
    },
    results: {
      path: '/results',
      title: t('admin.results'),
      refLabel,
      filter: { param: 'competitionId', ref: 'competitions', label: t('f.competition') },
      fields: [
        { name: 'competition', label: t('f.competition'), type: 'select', required: true, ref: 'competitions' },
        { name: 'athlete', label: t('f.athlete'), type: 'select', required: true, ref: 'athletes' },
        { name: 'discipline', label: t('f.discipline'), type: 'select', required: true, ref: 'disciplines' },
        { name: 'status', label: t('f.status'), type: 'select', options: ['OK', 'DNS', 'DNF', 'DQ', 'NM'].map((x) => ({ value: x, label: x })) },
        { name: 'valueText', label: t('f.value'), type: 'text', help: t('f.valueHint') },
        {
          name: 'timing',
          label: 'Хронометраж',
          type: 'select',
          options: [
            { value: '', label: 'Автоматично (за форматом введення)' },
            { value: 'manual', label: 'Ручний (точність до 0.1 с)' },
            { value: 'electronic', label: 'Електронний (точність до 0.01 с)' },
          ],
        },
        { name: 'wind', label: t('f.wind'), type: 'number', step: '0.1' },
        { name: 'place', label: t('f.place'), type: 'number' },
        { name: 'rank', label: t('f.rank'), type: 'text' },
        { name: 'waScore', label: t('f.waScore'), type: 'number' },
        { name: 'teamPoints', label: t('f.teamPoints'), type: 'number' },
        { name: 'round', label: t('f.round'), type: 'text' },
        { name: 'notes', label: t('f.notes'), type: 'textarea' },
      ],
      columns: [
        { label: t('f.date'), render: (r) => formatDate(r.date) },
        { label: t('f.athlete'), render: (r) => (r.athlete ? fullName(r.athlete) : r.teamName || '–') },
        { label: t('f.discipline'), render: (r) => dName(r.discipline) },
        {
          label: t('f.value'),
          render: (r) =>
            r.status === 'OK'
              ? `${formatValue(r.value, r.discipline?.type, r.timing)}${r.timing === 'manual' ? ' (р)' : ''}`
              : r.status,
        },
        { label: t('f.rank'), render: (r) => r.rank || '–' },
        { label: t('f.waScore'), render: (r) => (r.waScore !== undefined && r.waScore !== null ? r.waScore : '–') },
        { label: t('f.category'), render: (r) => t(`cat.${r.ageCategory}`) },
        { label: t('f.competition'), render: (r) => r.competition?.name || '–' },
      ],
      toForm: (r) => ({
        ...r,
        competition: idOf(r.competition),
        athlete: idOf(r.athlete),
        discipline: idOf(r.discipline),
        timing: r.timing || '',
        valueText: r.value === undefined || r.value === null ? '' : formatValue(r.value, r.discipline?.type, r.timing),
      }),
      toPayload: (f, lookups) => {
        const d = lookups.disciplines?.find((x: Discipline) => x._id === f.discipline);
        const status = f.status || 'OK';
        const out: Record<string, any> = { ...f, status };
        delete out.valueText;
        if (!out.timing) delete out.timing;
        if (status === 'OK' && d) {
          const raw = String(f.valueText ?? '');
          const v = parseValue(raw, d.type);
          if (Number.isNaN(v)) throw new Error(t('f.valueHint'));
          out.value = v;
          out.rawMark = raw;
          if (!out.timing && d.type === 'time') {
            out.timing = detectTiming(raw);
          }
        } else {
          out.value = null;
        }
        return out;
      },
    },
  };
}
