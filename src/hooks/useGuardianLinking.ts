/**
 * Guardian Linking Hooks
 * 
 * Manages guardian-student relationships with:
 * - Many-to-many linking
 * - Role-based rights
 * - Shared phone detection
 * - Duplicate detection
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  GuardianRole, 
  GUARDIAN_ROLES,
  validateRoleRights,
  canLinkGuardian,
} from "@/lib/guardian-linking";

// ============================================================================
// TYPES
// ============================================================================

export interface GuardianRecord {
  id: string;
  display_name: string;
  internal_id: string | null;
  primary_phone: string | null;
  secondary_phone: string | null;
  email: string | null;
  whatsapp_number: string | null;
  user_id: string | null;
  has_account: boolean | null;
  preferred_language: string | null;
  notes: string | null;
  school_id: string;
  created_at: string;
}

export interface GuardianLinkRecord {
  id: string;
  guardian_id: string;
  student_id: string;
  role: GuardianRole;
  relationship_label: string | null;
  can_pickup: boolean | null;
  can_make_decisions: boolean | null;
  can_receive_reports: boolean | null;
  can_receive_emergency: boolean | null;
  receives_all_communications: boolean | null;
  contact_priority: number | null;
  verified_at: string | null;
  verified_by: string | null;
  verification_method: string | null;
  created_at: string;
}

export interface GuardianWithLinks extends GuardianRecord {
  links: GuardianLinkRecord[];
}

export interface StudentGuardianInfo {
  guardian_id: string;
  display_name: string;
  role: GuardianRole;
  relationship_label: string | null;
  primary_phone: string | null;
  can_pickup: boolean;
  can_make_decisions: boolean;
  contact_priority: number;
  is_verified: boolean;
}

// ============================================================================
// HOOKS: GUARDIAN MANAGEMENT
// ============================================================================

/**
 * Get all guardians for a school
 */
export function useSchoolGuardians(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["guardians", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from("guardians")
        .select("*")
        .eq("school_id", schoolId)
        .is("deleted_at", null)
        .order("display_name");

      if (error) throw error;
      return data as GuardianRecord[];
    },
    enabled: !!schoolId,
  });
}

/**
 * Get a specific guardian
 */
export function useGuardian(guardianId: string | undefined) {
  return useQuery({
    queryKey: ["guardian", guardianId],
    queryFn: async () => {
      if (!guardianId) return null;

      const { data, error } = await supabase
        .from("guardians")
        .select("*")
        .eq("id", guardianId)
        .single();

      if (error) throw error;
      return data as GuardianRecord;
    },
    enabled: !!guardianId,
  });
}

/**
 * Create a new guardian
 */
export function useCreateGuardian() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guardian: {
      display_name: string;
      school_id: string;
      internal_id?: string;
      primary_phone?: string;
      secondary_phone?: string;
      email?: string;
      whatsapp_number?: string;
      preferred_language?: string;
      notes?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const { data, error } = await supabase
        .from("guardians")
        .insert({
          ...guardian,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as GuardianRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["guardians", data.school_id] });
      toast.success("Guardian created");
    },
    onError: () => {
      toast.error("Could not create guardian");
    },
  });
}

/**
 * Update guardian details
 */
export function useUpdateGuardian() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GuardianRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from("guardians")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as GuardianRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["guardian", data.id] });
      queryClient.invalidateQueries({ queryKey: ["guardians", data.school_id] });
      toast.success("Guardian updated");
    },
    onError: () => {
      toast.error("Could not update guardian");
    },
  });
}

// ============================================================================
// HOOKS: GUARDIAN-STUDENT LINKING
// ============================================================================

/**
 * Get all guardians for a student (with links)
 */
export function useStudentGuardians(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student-guardians", studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from("guardian_student_links")
        .select(`
          *,
          guardian:guardians(*)
        `)
        .eq("student_id", studentId)
        .order("contact_priority");

      if (error) throw error;
      
      return data.map(link => ({
        ...link.guardian,
        link: {
          id: link.id,
          role: link.role,
          relationship_label: link.relationship_label,
          can_pickup: link.can_pickup,
          can_make_decisions: link.can_make_decisions,
          can_receive_reports: link.can_receive_reports,
          can_receive_emergency: link.can_receive_emergency,
          receives_all_communications: link.receives_all_communications,
          contact_priority: link.contact_priority,
          verified_at: link.verified_at,
          verified_by: link.verified_by,
          verification_method: link.verification_method,
        },
      }));
    },
    enabled: !!studentId,
  });
}

/**
 * Get all students for a guardian
 */
export function useGuardianStudents(guardianId: string | undefined) {
  return useQuery({
    queryKey: ["guardian-students", guardianId],
    queryFn: async () => {
      if (!guardianId) return [];

      const { data, error } = await supabase
        .from("guardian_student_links")
        .select(`
          *,
          student:students(id, name, class_id)
        `)
        .eq("guardian_id", guardianId);

      if (error) throw error;
      return data;
    },
    enabled: !!guardianId,
  });
}

/**
 * Link a guardian to a student
 */
export function useLinkGuardian() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (link: {
      guardian_id: string;
      student_id: string;
      role: GuardianRole;
      relationship_label?: string;
      can_pickup?: boolean;
      can_make_decisions?: boolean;
      can_receive_reports?: boolean;
      can_receive_emergency?: boolean;
      receives_all_communications?: boolean;
      link_reason?: string;
    }) => {
      // Validate role rights
      const validation = validateRoleRights(link.role, link);
      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      // Get existing links to check limits
      const { data: existingLinks } = await supabase
        .from("guardian_student_links")
        .select("*")
        .eq("student_id", link.student_id);

      const canLink = canLinkGuardian(
        (existingLinks || []) as unknown as Parameters<typeof canLinkGuardian>[0],
        link.role
      );
      
      if (!canLink.allowed) {
        throw new Error(canLink.reason);
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from("guardian_student_links")
        .insert({
          ...link,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as GuardianLinkRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-guardians", data.student_id] });
      queryClient.invalidateQueries({ queryKey: ["guardian-students", data.guardian_id] });
      toast.success("Guardian linked to student");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not link guardian");
    },
  });
}

/**
 * Update a guardian-student link
 */
export function useUpdateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GuardianLinkRecord> & { id: string }) => {
      // If role is being updated, validate rights
      if (updates.role) {
        const validation = validateRoleRights(updates.role, updates);
        if (!validation.valid) {
          throw new Error(validation.errors.join(", "));
        }
      }

      const { data, error } = await supabase
        .from("guardian_student_links")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as GuardianLinkRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-guardians", data.student_id] });
      queryClient.invalidateQueries({ queryKey: ["guardian-students", data.guardian_id] });
      toast.success("Link updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update link");
    },
  });
}

/**
 * Remove a guardian-student link
 */
export function useUnlinkGuardian() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, studentId, guardianId }: { 
      linkId: string; 
      studentId: string; 
      guardianId: string;
    }) => {
      const { error } = await supabase
        .from("guardian_student_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;
      return { studentId, guardianId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-guardians", data.studentId] });
      queryClient.invalidateQueries({ queryKey: ["guardian-students", data.guardianId] });
      toast.success("Guardian unlinked");
    },
    onError: () => {
      toast.error("Could not unlink guardian");
    },
  });
}

/**
 * Verify a guardian link
 */
export function useVerifyLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, method }: { 
      linkId: string; 
      method: "admin_entry" | "document" | "in_person";
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from("guardian_student_links")
        .update({
          verified_at: new Date().toISOString(),
          verified_by: userId,
          verification_method: method,
        })
        .eq("id", linkId)
        .select()
        .single();

      if (error) throw error;
      return data as GuardianLinkRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-guardians", data.student_id] });
      toast.success("Guardian verified");
    },
    onError: () => {
      toast.error("Could not verify guardian");
    },
  });
}

// ============================================================================
// HOOKS: PHONE LOOKUP
// ============================================================================

/**
 * Find guardians by phone number (detects shared phones)
 */
export function useFindByPhone(phone: string | undefined, schoolId: string | undefined) {
  return useQuery({
    queryKey: ["guardians-by-phone", phone, schoolId],
    queryFn: async () => {
      if (!phone || phone.length < 5) return [];

      const { data, error } = await supabase
        .from("guardians")
        .select("id, display_name, primary_phone, secondary_phone, whatsapp_number")
        .eq("school_id", schoolId)
        .is("deleted_at", null)
        .or(`primary_phone.eq.${phone},secondary_phone.eq.${phone},whatsapp_number.eq.${phone}`);

      if (error) throw error;
      
      return data.map(g => ({
        ...g,
        isShared: data.length > 1,
        sharedCount: data.length,
      }));
    },
    enabled: !!phone && phone.length >= 5 && !!schoolId,
  });
}
