export const AGE_CATEGORIES = ['U16', 'U18', 'U21', 'U23', 'ADULT'] as const;
export type AgeCategory = (typeof AGE_CATEGORIES)[number];

/**
 * Вікова категорія за "роком народження" (як у World Athletics):
 * вік = рік події − рік народження.
 *   U16: ≤15, U18: ≤17, U21: ≤20, U23: ≤22, інакше ADULT.
 * Змінити межі можна лише тут.
 */
export function ageCategory(birthDate: Date | string, onDate: Date | string = new Date()): AgeCategory {
  const age = new Date(onDate).getUTCFullYear() - new Date(birthDate).getUTCFullYear();
  if (age <= 15) return 'U16';
  if (age <= 17) return 'U18';
  if (age <= 20) return 'U21';
  if (age <= 22) return 'U23';
  return 'ADULT';
}

/**
 * Приводить довільну текстову мітку категорії з протоколів (напр. "Юніори U20", "Юнаки U16", "Чоловіки")
 * до канонічного значення AgeCategory ('U16' | 'U18' | 'U21' | 'U23' | 'ADULT').
 */
export function normalizeAgeCategoryLabel(raw?: string, fallbackTitle?: string): AgeCategory {
  const combined = `${raw || ''} ${fallbackTitle || ''}`.toUpperCase();
  if (/\bU1[246]\b|201[1234]/.test(combined)) return 'U16';
  if (/\bU18\b|2009|2010/.test(combined)) return 'U18';
  if (/\bU2[01]\b|ЮНІОР/.test(combined)) return 'U21';
  if (/\bU23\b|МОЛОД/.test(combined)) return 'U23';
  if (/\bADULT\b|ДОРОСЛ|ЧОЛОВІК|ЖІНК|ЖІНОК/.test(combined)) return 'ADULT';
  if (/ЮНАК|ДІВЧАТ/.test(combined)) return 'U18';
  return 'U18';
}
