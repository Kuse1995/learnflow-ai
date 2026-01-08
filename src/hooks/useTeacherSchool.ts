import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';

interface TeacherSchool {
  id: string;
  name: string;
  country: string | null;
  timezone: string | null;
  is_demo: boolean;
}

/**
 * Hook to get the current teacher's school information
 * Falls back to demo school name when in demo mode
 */
export function useTeacherSchool() {
  const { user } = useAuthContext();
  const { isDemoMode } = useDemoMode();

  const query = useQuery({
    queryKey: ['teacher-school', user?.id],
    queryFn: async (): Promise<TeacherSchool | null> => {
      if (!user?.id) return null;

      // Get the teacher's school via user_roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('school_id')
        .eq('user_id', user.id)
        .eq('role', 'teacher')
        .eq('is_active', true)
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData?.school_id) return null;

      // Get school details
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('id, name, country, timezone, is_demo')
        .eq('id', roleData.school_id)
        .single();

      if (schoolError) throw schoolError;
      return school;
    },
    enabled: !!user?.id && !isDemoMode,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // In demo mode, return demo school info
  if (isDemoMode) {
    return {
      ...query,
      data: null,
      schoolName: 'Demo School',
      isLoading: false,
    };
  }

  return {
    ...query,
    schoolName: query.data?.name || 'School',
  };
}
