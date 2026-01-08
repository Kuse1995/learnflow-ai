import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ClassLevelTerminology, 
  TerminologyConfig, 
  TERMINOLOGY_CONFIGS, 
  getDefaultTerminology,
  getTerminologyConfig 
} from '@/lib/class-level-terminology';

interface UseClassLevelTerminologyResult {
  terminology: ClassLevelTerminology;
  config: TerminologyConfig;
  isLoading: boolean;
}

export function useClassLevelTerminology(schoolId?: string): UseClassLevelTerminologyResult {
  const { data: school, isLoading } = useQuery({
    queryKey: ['school-terminology', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      
      const { data, error } = await supabase
        .from('schools')
        .select('class_level_terminology, country')
        .eq('id', schoolId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const result = useMemo(() => {
    // If we have a school with explicit terminology, use it
    if (school?.class_level_terminology) {
      const terminology = school.class_level_terminology as ClassLevelTerminology;
      return {
        terminology,
        config: TERMINOLOGY_CONFIGS[terminology] || TERMINOLOGY_CONFIGS.grade,
      };
    }
    
    // If we have a school with country, use country default
    if (school?.country) {
      const terminology = getDefaultTerminology(school.country);
      return {
        terminology,
        config: TERMINOLOGY_CONFIGS[terminology],
      };
    }
    
    // Default to grade
    return {
      terminology: 'grade' as ClassLevelTerminology,
      config: TERMINOLOGY_CONFIGS.grade,
    };
  }, [school]);

  return {
    ...result,
    isLoading,
  };
}

// Simpler hook that just takes terminology string directly
export function useTerminologyConfig(terminology?: string | null): TerminologyConfig {
  return useMemo(() => getTerminologyConfig(terminology), [terminology]);
}
