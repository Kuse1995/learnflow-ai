export type ClassLevelTerminology = 'grade' | 'form' | 'year' | 'standard' | 'class' | 'zambia_2023';

export interface TerminologyConfig {
  singular: string;
  plural: string;
  withNumber: (n: number | string) => string;
  levels: string[];
}

// Early childhood levels shared across all education systems
export const EARLY_CHILDHOOD_LEVELS = ['Baby Class', 'Middle Class', 'Reception'];

export const TERMINOLOGY_CONFIGS: Record<ClassLevelTerminology, TerminologyConfig> = {
  grade: {
    singular: 'Grade',
    plural: 'Grades',
    withNumber: (n) => `Grade ${n}`,
    levels: [
      ...EARLY_CHILDHOOD_LEVELS,
      ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
    ],
  },
  form: {
    singular: 'Form',
    plural: 'Forms',
    withNumber: (n) => `Form ${n}`,
    levels: [
      ...EARLY_CHILDHOOD_LEVELS,
      'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6',
    ],
  },
  year: {
    singular: 'Year',
    plural: 'Years',
    withNumber: (n) => `Year ${n}`,
    levels: [
      ...EARLY_CHILDHOOD_LEVELS,
      ...Array.from({ length: 13 }, (_, i) => `Year ${i + 1}`),
    ],
  },
  standard: {
    singular: 'Standard',
    plural: 'Standards',
    withNumber: (n) => `Standard ${n}`,
    levels: [
      ...EARLY_CHILDHOOD_LEVELS,
      ...Array.from({ length: 8 }, (_, i) => `Standard ${i + 1}`),
    ],
  },
  class: {
    singular: 'Class',
    plural: 'Classes',
    withNumber: (n) => `Class ${n}`,
    levels: [
      ...EARLY_CHILDHOOD_LEVELS,
      ...Array.from({ length: 8 }, (_, i) => `Class ${i + 1}`),
    ],
  },
  zambia_2023: {
    singular: 'Level',
    plural: 'Levels',
    withNumber: (n) => {
      const num = typeof n === 'string' ? parseInt(n, 10) : n;
      return num <= 6 ? `Grade ${num}` : `Form ${num - 6}`;
    },
    levels: [
      ...EARLY_CHILDHOOD_LEVELS,
      // Primary: Grade 1-6
      'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
      // Secondary: Form 1-6
      'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6',
    ],
  },
};

// Get default terminology based on country
export function getDefaultTerminology(country: string): ClassLevelTerminology {
  if (country === 'Zambia') return 'zambia_2023';
  const formCountries = ['Zimbabwe', 'Tanzania', 'Kenya', 'Malawi', 'Uganda'];
  if (formCountries.includes(country)) return 'form';
  return 'grade';
}

// Get terminology config with fallback
export function getTerminologyConfig(terminology?: string | null): TerminologyConfig {
  const key = (terminology || 'grade') as ClassLevelTerminology;
  return TERMINOLOGY_CONFIGS[key] || TERMINOLOGY_CONFIGS.grade;
}
