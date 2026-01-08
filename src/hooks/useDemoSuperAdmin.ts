/**
 * Demo Super Admin Hook
 * 
 * Checks if an email is a demo super admin and manages super admin bypass.
 * Used when system_mode = 'demo' to allow admin access without Supabase auth.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DemoSuperAdmin {
  id: string;
  email: string;
  full_name: string | null;
}

interface SystemConfig {
  key: string;
  value: string;
}

/**
 * Check if system is in demo mode
 */
export function useSystemMode() {
  return useQuery({
    queryKey: ['system-config', 'system_mode'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'system_mode')
        .maybeSingle();
      
      if (error) {
        console.warn('Failed to fetch system mode:', error);
        return 'production'; // Default to production if can't fetch
      }
      
      return data?.value ?? 'production';
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Check if an email is a demo super admin
 */
export function useIsDemoSuperAdmin(email: string | null | undefined) {
  const { data: systemMode } = useSystemMode();
  
  return useQuery({
    queryKey: ['demo-super-admin', email],
    queryFn: async () => {
      if (!email) return null;
      
      const { data, error } = await supabase
        .from('demo_super_admins')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      if (error) {
        console.warn('Failed to check demo super admin:', error);
        return null;
      }
      
      return data as DemoSuperAdmin | null;
    },
    enabled: !!email && systemMode === 'demo',
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Validate an email for demo super admin access
 */
export async function validateDemoSuperAdmin(email: string): Promise<DemoSuperAdmin | null> {
  const { data: modeData } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'system_mode')
    .maybeSingle();
  
  if (modeData?.value !== 'demo') {
    return null;
  }
  
  const { data, error } = await supabase
    .from('demo_super_admins')
    .select('id, email, full_name')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return data as DemoSuperAdmin;
}
