/**
 * Demo Safety Controls
 * 
 * Global rules for handling demo data across the entire system:
 * - Demo data never triggers real notifications
 * - Demo data is excluded from analytics
 * - Demo data can be reset/deleted by admins
 * - Demo status is visually indicated in the UI
 */

import { supabase } from "@/integrations/supabase/client";

// =============================================================================
// DEMO DETECTION
// =============================================================================

/**
 * Check if a school is a demo school
 */
export function isDemoSchool(school: { is_demo?: boolean } | null | undefined): boolean {
  return school?.is_demo === true;
}

/**
 * Check if a class is a demo class
 */
export function isDemoClass(cls: { is_demo?: boolean } | null | undefined): boolean {
  return cls?.is_demo === true;
}

/**
 * Check if a student is a demo student
 */
export function isDemoStudent(student: { is_demo?: boolean } | null | undefined): boolean {
  return student?.is_demo === true;
}

/**
 * Check if any record is demo data
 */
export function isDemoRecord(record: { is_demo?: boolean } | null | undefined): boolean {
  return record?.is_demo === true;
}

// =============================================================================
// NOTIFICATION SAFETY
// =============================================================================

export interface NotificationAttempt {
  type: 'parent_message' | 'teacher_alert' | 'admin_reminder' | 'sms' | 'whatsapp' | 'email';
  recipientId?: string;
  studentId?: string;
  classId?: string;
  schoolId?: string;
  content?: string;
}

export interface NotificationResult {
  sent: boolean;
  suppressed: boolean;
  suppressedReason?: 'demo_mode';
  loggedAt?: Date;
}

/**
 * Suppress notifications for demo data
 * Returns true if notification should be blocked
 */
export async function shouldSuppressNotification(
  schoolId: string | undefined
): Promise<boolean> {
  if (!schoolId) return false;

  try {
    const { data: school } = await supabase
      .from("schools")
      .select("is_demo")
      .eq("id", schoolId)
      .single();

    return school?.is_demo === true;
  } catch {
    return false;
  }
}

/**
 * Simulate notification success for demo mode
 * Logs the attempt but doesn't send
 */
export function simulateDemoNotification(attempt: NotificationAttempt): NotificationResult {
  console.log("[DEMO MODE] Notification simulated:", {
    ...attempt,
    suppressed_reason: "demo_mode",
    logged_at: new Date().toISOString(),
  });

  return {
    sent: false,
    suppressed: true,
    suppressedReason: "demo_mode",
    loggedAt: new Date(),
  };
}

// =============================================================================
// ANALYTICS SAFETY
// =============================================================================

/**
 * Filter out demo schools from analytics queries
 */
export function getAnalyticsFilter(): string {
  return "is_demo = false";
}

/**
 * Check if a school should be included in analytics
 */
export function shouldIncludeInAnalytics(school: { is_demo?: boolean } | null): boolean {
  return !isDemoSchool(school);
}

/**
 * Filter an array to exclude demo records
 */
export function filterDemoRecords<T extends { is_demo?: boolean }>(
  records: T[]
): T[] {
  return records.filter(record => !record.is_demo);
}

// =============================================================================
// ADMIN DEMO CONTROLS
// =============================================================================

export interface DemoResetResult {
  success: boolean;
  message: string;
  resetAt?: Date;
  error?: string;
}

export interface DemoDeleteResult {
  success: boolean;
  message: string;
  deletedAt?: Date;
  error?: string;
}

/**
 * Reset demo data (admin only via service role RPC)
 * Preserves demo school shell + demo users
 */
export async function resetDemoData(): Promise<DemoResetResult> {
  try {
    const { data, error } = await supabase.rpc("reset_demo_data");

    if (error) throw error;

    return {
      success: true,
      message: "Demo data has been reset. Demo school preserved for re-seeding.",
      resetAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to reset demo data",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Confirmation phrase required for deleting demo school
 */
export const DELETE_DEMO_CONFIRMATION_PHRASE = "DELETE DEMO SCHOOL";

/**
 * Validate delete confirmation phrase
 */
export function validateDeleteConfirmation(input: string): boolean {
  return input.trim().toUpperCase() === DELETE_DEMO_CONFIRMATION_PHRASE;
}

// =============================================================================
// PAYMENT / BILLING SAFETY
// =============================================================================

/**
 * Check if a school should be included in billing operations
 */
export function shouldProcessPayment(school: { is_demo?: boolean } | null): boolean {
  return !isDemoSchool(school);
}

/**
 * Check if AI usage should be tracked (for billing)
 */
export function shouldTrackAIUsage(school: { is_demo?: boolean } | null): boolean {
  // Demo schools can still track AI usage separately if needed
  // but won't affect production billing
  return !isDemoSchool(school);
}

// =============================================================================
// DEMO BADGE HELPERS
// =============================================================================

export interface DemoBadgeConfig {
  show: boolean;
  variant: 'prominent' | 'subtle';
  tooltip: string;
}

/**
 * Get demo badge configuration based on context
 */
export function getDemoBadgeConfig(
  isDemo: boolean,
  context: 'admin' | 'teacher' | 'parent'
): DemoBadgeConfig {
  if (!isDemo) {
    return { show: false, variant: 'prominent', tooltip: '' };
  }

  const tooltip = "This is demo data. No messages are sent.";

  switch (context) {
    case 'admin':
    case 'teacher':
      return { show: true, variant: 'prominent', tooltip };
    case 'parent':
      return { show: true, variant: 'subtle', tooltip };
    default:
      return { show: true, variant: 'prominent', tooltip };
  }
}

// =============================================================================
// FUTURE-PROOFING: GLOBAL DEMO CHECK
// =============================================================================

/**
 * Global check that should be called at API/edge function level
 * to determine if demo safety rules apply
 */
export async function getDemoContext(schoolId: string): Promise<{
  isDemo: boolean;
  suppressNotifications: boolean;
  excludeFromAnalytics: boolean;
  excludeFromBilling: boolean;
}> {
  const isDemo = await shouldSuppressNotification(schoolId);

  return {
    isDemo,
    suppressNotifications: isDemo,
    excludeFromAnalytics: isDemo,
    excludeFromBilling: isDemo,
  };
}
