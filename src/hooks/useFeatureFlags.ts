import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  environment: string[];
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface SystemEnvironment {
  id: string;
  environment: "development" | "staging" | "production";
  is_production: boolean;
  deployed_at: string | null;
  version_tag: string | null;
  debug_mode_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface AppVersion {
  id: string;
  version: string;
  notes: string | null;
  released_at: string;
  deployed_by: string | null;
  breaking_change: boolean;
  is_current: boolean;
  changelog: string[] | null;
}

export interface DeploymentCheck {
  id: string;
  check_name: string;
  description: string | null;
  check_type: "pre_deploy" | "post_deploy" | "rollback";
  status: "pending" | "passed" | "failed" | "skipped";
  is_blocking: boolean;
  last_checked_at: string | null;
  result_details: Record<string, unknown> | null;
  created_at: string;
}

// Fetch all feature flags
export function useFeatureFlags() {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("key");

      if (error) throw error;
      return data as FeatureFlag[];
    },
  });
}

// Check if a specific feature is enabled
export function useIsFeatureEnabled(featureKey: string) {
  const { data: flags } = useFeatureFlags();
  const { data: environment } = useSystemEnvironment();

  if (!flags || !environment) return true; // Default to enabled if not loaded

  const flag = flags.find((f) => f.key === featureKey);
  if (!flag) return true; // Default to enabled if flag doesn't exist

  // Check if flag is enabled for current environment
  return flag.enabled && flag.environment.includes(environment.environment);
}

// Toggle a feature flag
export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flagId,
      enabled,
    }: {
      flagId: string;
      enabled: boolean;
    }) => {
      const { error } = await supabase
        .from("feature_flags")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", flagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      toast.success("Feature flag updated");
    },
    onError: (error) => {
      console.error("Failed to toggle feature flag:", error);
      toast.error("Failed to update feature flag");
    },
  });
}

// Fetch system environment
export function useSystemEnvironment() {
  return useQuery({
    queryKey: ["system-environment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_environment")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      return data as SystemEnvironment;
    },
  });
}

// Update system environment
export function useUpdateEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<SystemEnvironment>) => {
      const { data: current } = await supabase
        .from("system_environment")
        .select("id")
        .limit(1)
        .single();

      if (!current) throw new Error("No environment config found");

      const { error } = await supabase
        .from("system_environment")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", current.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-environment"] });
      toast.success("Environment updated");
    },
    onError: (error) => {
      console.error("Failed to update environment:", error);
      toast.error("Failed to update environment");
    },
  });
}

// Fetch current app version
export function useCurrentAppVersion() {
  return useQuery({
    queryKey: ["current-app-version"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_versions")
        .select("*")
        .eq("is_current", true)
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as AppVersion | null;
    },
  });
}

// Fetch all app versions
export function useAppVersions() {
  return useQuery({
    queryKey: ["app-versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_versions")
        .select("*")
        .order("released_at", { ascending: false });

      if (error) throw error;
      return data as AppVersion[];
    },
  });
}

// Fetch deployment checks
export function useDeploymentChecks() {
  return useQuery({
    queryKey: ["deployment-checks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deployment_checks")
        .select("*")
        .order("check_type", { ascending: true });

      if (error) throw error;
      return data as DeploymentCheck[];
    },
  });
}

// Update deployment check status
export function useUpdateDeploymentCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      checkId,
      status,
      resultDetails,
    }: {
      checkId: string;
      status: DeploymentCheck["status"];
      resultDetails?: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("deployment_checks")
        .update({
          status,
          last_checked_at: new Date().toISOString(),
          result_details: (resultDetails || null) as import("@/integrations/supabase/types").Json,
        })
        .eq("id", checkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployment-checks"] });
    },
    onError: (error) => {
      console.error("Failed to update deployment check:", error);
      toast.error("Failed to update check status");
    },
  });
}
