/**
 * Server-side usage limit enforcement for edge functions
 * THIS SYSTEM MUST BE IMPOSSIBLE TO BYPASS
 */

// Types
export type SaaSPlan = 'basic' | 'standard' | 'premium' | 'enterprise';
export type BillingStatus = 'active' | 'trial' | 'suspended';
export type UsageMetric = 
  | 'uploads_analyzed'
  | 'ai_generations'
  | 'parent_insights_generated'
  | 'adaptive_support_plans_generated';

// Hard limits by plan
const PLAN_LIMITS: Record<SaaSPlan, Record<UsageMetric, number>> = {
  basic: {
    uploads_analyzed: 0,
    ai_generations: 0,
    parent_insights_generated: 0,
    adaptive_support_plans_generated: 0,
  },
  standard: {
    uploads_analyzed: 30,
    ai_generations: 100,
    parent_insights_generated: 20,
    adaptive_support_plans_generated: 10,
  },
  premium: {
    uploads_analyzed: 200,
    ai_generations: 500,
    parent_insights_generated: 100,
    adaptive_support_plans_generated: 50,
  },
  enterprise: {
    uploads_analyzed: -1, // unlimited
    ai_generations: -1,
    parent_insights_generated: -1,
    adaptive_support_plans_generated: -1,
  },
};

export interface SchoolBillingInfo {
  id: string;
  plan: SaaSPlan;
  billing_status: BillingStatus;
  billing_end_date: string | null;
}

export interface UsageCheckResult {
  allowed: boolean;
  error?: string;
  current_usage?: number;
  limit?: number;
  remaining?: number;
}

/**
 * Get school billing info by class ID
 */
export async function getSchoolByClassId(
  supabaseClient: any,
  classId: string
): Promise<SchoolBillingInfo | null> {
  // Get class's school_id
  const { data: classData, error: classError } = await supabaseClient
    .from('classes')
    .select('school_id')
    .eq('id', classId)
    .maybeSingle();

  if (classError || !classData?.school_id) {
    return null;
  }

  // Get school info
  const { data: school, error: schoolError } = await supabaseClient
    .from('schools')
    .select('id, plan, billing_status, billing_end_date')
    .eq('id', classData.school_id)
    .maybeSingle();

  if (schoolError || !school) {
    return null;
  }

  return school as SchoolBillingInfo;
}

/**
 * Check billing status before any action
 * Returns error if school is suspended or trial expired
 */
export function checkBillingStatus(school: SchoolBillingInfo): UsageCheckResult {
  // Check suspended
  if (school.billing_status === 'suspended') {
    return {
      allowed: false,
      error: 'Your account is currently suspended. Please contact support.',
    };
  }

  // Check trial expiration
  if (school.billing_status === 'trial' && school.billing_end_date) {
    const endDate = new Date(school.billing_end_date);
    if (endDate < new Date()) {
      return {
        allowed: false,
        error: 'Your trial has expired. Upgrade to continue using this feature.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Check usage limit (read-only, doesn't increment)
 */
export async function checkUsageLimit(
  supabaseClient: any,
  schoolId: string,
  plan: SaaSPlan,
  metric: UsageMetric
): Promise<UsageCheckResult> {
  const limit = PLAN_LIMITS[plan][metric];

  // If unlimited, always allow
  if (limit === -1) {
    return { allowed: true, limit: -1 };
  }

  // If limit is 0, always block
  if (limit === 0) {
    return {
      allowed: false,
      error: 'This action exceeds your monthly plan limit. Upgrade to continue.',
      current_usage: 0,
      limit: 0,
      remaining: 0,
    };
  }

  // Get current usage
  const monthYear = new Date().toISOString().slice(0, 7);
  const { data: usage, error } = await supabaseClient
    .from('school_usage_metrics')
    .select(metric)
    .eq('school_id', schoolId)
    .eq('month_year', monthYear)
    .maybeSingle();

  if (error) {
    console.error('Error checking usage:', error);
    return { allowed: false, error: 'Failed to check usage limits.' };
  }

  const currentUsage = usage?.[metric] ?? 0;

  if (currentUsage >= limit) {
    return {
      allowed: false,
      error: 'This action exceeds your monthly plan limit. Upgrade to continue.',
      current_usage: currentUsage,
      limit,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    current_usage: currentUsage,
    limit,
    remaining: limit - currentUsage,
  };
}

/**
 * Increment usage atomically using database function
 * MUST be called before performing the action, returns false if limit exceeded
 */
export async function incrementUsage(
  supabaseClient: any,
  schoolId: string,
  plan: SaaSPlan,
  metric: UsageMetric
): Promise<UsageCheckResult> {
  const limit = PLAN_LIMITS[plan][metric];

  // If limit is 0, always block
  if (limit === 0) {
    return {
      allowed: false,
      error: 'This action exceeds your monthly plan limit. Upgrade to continue.',
      current_usage: 0,
      limit: 0,
      remaining: 0,
    };
  }

  // Use the database function for atomic increment
  const { data, error } = await supabaseClient.rpc('increment_usage_metric', {
    p_school_id: schoolId,
    p_metric: metric,
    p_limit: limit,
  });

  if (error) {
    console.error('Error incrementing usage:', error);
    return { allowed: false, error: 'Failed to update usage. Please try again.' };
  }

  const result = data as { allowed: boolean; current_usage: number; limit: number; remaining?: number; reason?: string };

  if (!result.allowed) {
    return {
      allowed: false,
      error: 'This action exceeds your monthly plan limit. Upgrade to continue.',
      current_usage: result.current_usage,
      limit: result.limit,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    current_usage: result.current_usage,
    limit: result.limit,
    remaining: result.remaining ?? (limit === -1 ? -1 : limit - result.current_usage),
  };
}

/**
 * Log usage audit event
 */
export async function logUsageAudit(
  supabaseClient: any,
  schoolId: string,
  actionType: 'blocked' | 'success' | 'violation' | 'override',
  metricType: UsageMetric,
  plan: SaaSPlan,
  currentUsage?: number,
  limitValue?: number,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseClient.from('usage_audit_logs').insert({
      school_id: schoolId,
      action_type: actionType,
      metric_type: metricType,
      plan,
      current_usage: currentUsage,
      limit_value: limitValue,
      details: details ?? null,
    });
  } catch (error) {
    console.error('Failed to log usage audit:', error);
    // Don't throw - audit logging should not block operations
  }
}

/**
 * Full enforcement check - billing status + usage limit + increment
 * Use this before ANY AI operation
 */
export async function enforceUsageLimit(
  supabaseClient: any,
  classId: string,
  metric: UsageMetric,
  corsHeaders: Record<string, string>
): Promise<{ allowed: true; school: SchoolBillingInfo } | { allowed: false; response: Response }> {
  // Get school info
  const school = await getSchoolByClassId(supabaseClient, classId);

  if (!school) {
    // No school linked - default to basic (blocked for AI features)
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'This action exceeds your monthly plan limit. Upgrade to continue.',
          blocked: true,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Check billing status
  const billingCheck = checkBillingStatus(school);
  if (!billingCheck.allowed) {
    await logUsageAudit(supabaseClient, school.id, 'blocked', metric, school.plan, undefined, undefined, {
      reason: 'billing_status',
      status: school.billing_status,
    });

    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: billingCheck.error,
          blocked: true,
          reason: 'billing_status',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Increment usage atomically (also checks limit)
  const usageResult = await incrementUsage(supabaseClient, school.id, school.plan, metric);

  if (!usageResult.allowed) {
    await logUsageAudit(
      supabaseClient,
      school.id,
      'blocked',
      metric,
      school.plan,
      usageResult.current_usage,
      usageResult.limit,
      { reason: 'limit_exceeded' }
    );

    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: usageResult.error,
          blocked: true,
          reason: 'limit_exceeded',
          current_usage: usageResult.current_usage,
          limit: usageResult.limit,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Log success
  await logUsageAudit(
    supabaseClient,
    school.id,
    'success',
    metric,
    school.plan,
    usageResult.current_usage,
    usageResult.limit
  );

  return { allowed: true, school };
}
