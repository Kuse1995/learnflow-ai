export type ClassLevelTerminology = 'grade' | 'form' | 'year' | 'standard' | 'class';

export interface TerminologyConfig {
  singular: string;
  plural: string;
  withNumber: (n: number | string) => string;
  levels: string[];
}

export const TERMINOLOGY_CONFIGS: Record<ClassLevelTerminology, TerminologyConfig> = {
  grade: {
    singular: 'Grade',
    plural: 'Grades',
    withNumber: (n) => `Grade ${n}`,
    levels: Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
  },
  form: {
    singular: 'Form',
    plural: 'Forms',
    withNumber: (n) => `Form ${n}`,
    levels: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'],
  },
  year: {
    singular: 'Year',
    plural: 'Years',
    withNumber: (n) => `Year ${n}`,
    levels: Array.from({ length: 13 }, (_, i) => `Year ${i + 1}`),
  },
  standard: {
    singular: 'Standard',
    plural: 'Standards',
    withNumber: (n) => `Standard ${n}`,
    levels: Array.from({ length: 8 }, (_, i) => `Standard ${i + 1}`),
  },
  class: {
    singular: 'Class',
    plural: 'Classes',
    withNumber: (n) => `Class ${n}`,
    levels: Array.from({ length: 8 }, (_, i) => `Class ${i + 1}`),
  },
};

// Get default terminology based on country
export function getDefaultTerminology(country: string): ClassLevelTerminology {
  const formCountries = ['Zimbabwe', 'Tanzania', 'Kenya', 'Malawi', 'Uganda'];
  if (formCountries.includes(country)) return 'form';
  return 'grade';
}

// Get terminology config with fallback
export function getTerminologyConfig(terminology?: string | null): TerminologyConfig {
  const key = (terminology || 'grade') as ClassLevelTerminology;
  return TERMINOLOGY_CONFIGS[key] || TERMINOLOGY_CONFIGS.grade;
}
