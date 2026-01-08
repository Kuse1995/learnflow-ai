import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AppRole,
  PermissionAction,
  canPerformAction,
  sortRolesByPriority,
  getRoleLabel,
} from '@/lib/rbac-permissions';

// =============================================================================
// TYPES
// =============================================================================

export interface UserRole {
  id: string;
  userId: string;
  schoolId: string | null;
  role: AppRole;
  assignedBy: string | null;
  assignedAt: string;
  isActive: boolean;
  notes: string | null;
}

export interface RBACContextValue {
  userId: string | null;
  userName: string | null;
  schoolId: string | null;
  roles: AppRole[];
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  canPerform: (action: PermissionAction) => boolean;
  isLoading: boolean;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Get user roles from the database
 */
export function useUserRoles(userId: string | undefined, schoolId?: string) {
  return useQuery({
    queryKey: ['user-roles', userId, schoolId],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (schoolId) {
        query = query.or(`school_id.eq.${schoolId},school_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        schoolId: row.school_id,
        role: row.role as AppRole,
        assignedBy: row.assigned_by,
        assignedAt: row.assigned_at,
        isActive: row.is_active,
        notes: row.notes,
      })) as UserRole[];
    },
    enabled: !!userId,
  });
}

/**
 * Get all users with roles for a school
 */
export function useSchoolUserRoles(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['school-user-roles', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('role');

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        schoolId: row.school_id,
        role: row.role as AppRole,
        assignedBy: row.assigned_by,
        assignedAt: row.assigned_at,
        isActive: row.is_active,
        notes: row.notes,
      })) as UserRole[];
    },
    enabled: !!schoolId,
  });
}

/**
 * Check if a user has a specific role (direct DB check)
 */
export function useHasRole(userId: string | undefined, role: AppRole, schoolId?: string) {
  const { data: roles } = useUserRoles(userId, schoolId);
  return roles?.some(r => r.role === role) ?? false;
}

/**
 * Assign a role to a user
 */
export function useAssignRole() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      role: AppRole;
      schoolId: string;
      assignedBy: string;
      assignedByRole: AppRole;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: input.userId,
          school_id: input.schoolId,
          role: input.role,
          assigned_by: input.assignedBy,
          assigned_at: new Date().toISOString(),
          is_active: true,
          notes: input.notes,
        }, {
          onConflict: 'user_id,school_id,role',
        })
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_sensitive_action', {
        p_user_id: input.assignedBy,
        p_user_name: null,
        p_school_id: input.schoolId,
        p_role_used: input.assignedByRole,
        p_action: 'assign_role',
        p_action_category: 'role_management',
        p_entity_type: 'user_role',
        p_entity_id: data.id,
        p_details: {
          target_user_id: input.userId,
          role_assigned: input.role,
          notes: input.notes,
        },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Role Assigned',
        description: `${getRoleLabel(variables.role)} role has been assigned.`,
      });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['school-user-roles'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Revoke a role from a user
 */
export function useRevokeRole() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      role: AppRole;
      schoolId: string;
      revokedBy: string;
      revokedByRole: AppRole;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', input.userId)
        .eq('school_id', input.schoolId)
        .eq('role', input.role)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_sensitive_action', {
        p_user_id: input.revokedBy,
        p_user_name: null,
        p_school_id: input.schoolId,
        p_role_used: input.revokedByRole,
        p_action: 'revoke_role',
        p_action_category: 'role_management',
        p_entity_type: 'user_role',
        p_entity_id: data.id,
        p_details: {
          target_user_id: input.userId,
          role_revoked: input.role,
          reason: input.reason,
        },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Role Revoked',
        description: `${getRoleLabel(variables.role)} role has been revoked.`,
      });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['school-user-roles'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Log a sensitive action
 */
export function useLogAction() {
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      userName?: string;
      schoolId: string;
      roleUsed: AppRole;
      action: string;
      actionCategory: string;
      entityType: string;
      entityId?: string;
      entityName?: string;
      details?: Record<string, unknown>;
      success?: boolean;
      failureReason?: string;
    }) => {
      const { data, error } = await supabase.rpc('log_sensitive_action', {
        p_user_id: input.userId,
        p_user_name: input.userName ?? null,
        p_school_id: input.schoolId,
        p_role_used: input.roleUsed,
        p_action: input.action,
        p_action_category: input.actionCategory,
        p_entity_type: input.entityType,
        p_entity_id: input.entityId ?? null,
        p_entity_name: input.entityName ?? null,
        p_details: input.details ? JSON.parse(JSON.stringify(input.details)) : null,
        p_success: input.success ?? true,
        p_failure_reason: input.failureReason ?? null,
      });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get system audit logs
 */
export function useSystemAuditLogs(
  schoolId: string | undefined,
  options?: {
    actionCategory?: string;
    limit?: number;
    offset?: number;
  }
) {
  return useQuery({
    queryKey: ['system-audit-logs', schoolId, options],
    queryFn: async () => {
      if (!schoolId) return [];

      let query = supabase
        .from('system_audit_logs')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (options?.actionCategory) {
        query = query.eq('action_category', options.actionCategory);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Hook for checking multiple permissions at once
 */
export function usePermissions(roles: AppRole[]) {
  return useCallback(
    (action: PermissionAction) => canPerformAction(roles, action),
    [roles]
  );
}

/**
 * Get the highest priority role from a list
 */
export function usePrimaryRole(roles: AppRole[]): AppRole | null {
  if (roles.length === 0) return null;
  return sortRolesByPriority(roles)[0];
}
