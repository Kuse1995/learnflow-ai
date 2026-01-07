import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// User account types for onboarding
export interface UserAccount {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  role: 'platform_admin' | 'school_admin' | 'teacher' | 'parent' | 'student';
  school_id: string | null;
  is_activated: boolean;
  activated_at: string | null;
  activated_by: string | null;
  invite_token: string | null;
  invite_expires_at: string | null;
  created_at: string;
}

export interface CreateSchoolData {
  name: string;
  plan?: 'basic' | 'standard' | 'premium' | 'enterprise';
}

export interface CreateClassData {
  name: string;
  grade?: string;
  section?: string;
  school_id: string;
}

export interface CreateUserAccountData {
  email: string;
  name: string;
  role: 'school_admin' | 'teacher' | 'parent' | 'student';
  school_id: string;
}

export interface BulkStudentData {
  name: string;
  student_id: string;
  class_id: string;
}

/**
 * Get user accounts for a school
 */
export function useSchoolUserAccounts(schoolId?: string) {
  return useQuery({
    queryKey: ['user-accounts', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserAccount[];
    },
    enabled: !!schoolId,
  });
}

/**
 * Create a new school
 */
export function useCreateSchool() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateSchoolData) => {
      const { data: school, error } = await supabase
        .from('schools')
        .insert({
          name: data.name,
          plan: data.plan || 'basic',
          billing_status: 'trial',
        })
        .select()
        .single();

      if (error) throw error;
      return school;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success('School created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create school: ${error.message}`);
    },
  });
}

/**
 * Create a new class
 */
export function useCreateClass() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateClassData) => {
      const { data: classData, error } = await supabase
        .from('classes')
        .insert({
          name: data.name,
          grade: data.grade,
          section: data.section,
          school_id: data.school_id,
        })
        .select()
        .single();

      if (error) throw error;
      return classData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create class: ${error.message}`);
    },
  });
}

/**
 * Create a user account (manual onboarding)
 */
export function useCreateUserAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateUserAccountData) => {
      // Generate invite token
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry
      
      const { data: account, error } = await supabase
        .from('user_accounts')
        .insert({
          email: data.email,
          name: data.name,
          role: data.role,
          school_id: data.school_id,
          invite_token: inviteToken,
          invite_expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] });
      toast.success('User account created. Share invite link with user.');
    },
    onError: (error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });
}

/**
 * Activate a user account
 */
export function useActivateUserAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ accountId, userId }: { accountId: string; userId?: string }) => {
      const { error } = await supabase
        .from('user_accounts')
        .update({
          is_activated: true,
          activated_at: new Date().toISOString(),
          user_id: userId,
        })
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] });
      toast.success('Account activated');
    },
    onError: (error) => {
      toast.error(`Failed to activate account: ${error.message}`);
    },
  });
}

/**
 * Bulk create students
 */
export function useBulkCreateStudents() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (students: BulkStudentData[]) => {
      const { data, error } = await supabase
        .from('students')
        .insert(students)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(`${data.length} students created successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to create students: ${error.message}`);
    },
  });
}

/**
 * Parse CSV for bulk student import
 */
export function parseStudentCSV(csvText: string, classId: string): BulkStudentData[] {
  const lines = csvText.trim().split('\n');
  const students: BulkStudentData[] = [];
  
  // Skip header row if present
  const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    if (parts.length >= 2) {
      students.push({
        name: parts[0],
        student_id: parts[1],
        class_id: classId,
      });
    }
  }
  
  return students;
}
