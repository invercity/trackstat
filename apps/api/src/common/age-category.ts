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
