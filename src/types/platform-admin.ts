// Platform Admin Types - Super Admin System

export type SubscriptionStatus = 'active' | 'suspended' | 'expired' | 'pending';

export type BillingEventType = 
  | 'manual_activation' 
  | 'plan_change' 
  | 'extension' 
  | 'credit' 
  | 'suspension'
  | 'reinstatement'
  | 'downgrade'
  | 'stripe_payment'
  | 'stripe_refund';

export type PlatformAuditAction = 
  | 'plan_activated'
  | 'plan_changed'
  | 'school_suspended'
  | 'school_reinstated'
  | 'subscription_extended'
  | 'ai_toggle_changed'
  | 'ai_kill_switch_activated'
  | 'ai_kill_switch_deactivated'
  | 'super_admin_action'
  | 'override_applied'
  | 'school_archived';

export interface SuperAdmin {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  notes: string | null;
}

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  features: PlanFeatures;
  ai_limits: AiLimits;
  max_students: number | null;
  max_teachers: number | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  price_monthly: number | null;
  price_annual: number | null;
  currency: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanFeatures {
  upload_analysis: boolean;
  ai_insights: boolean;
  parent_insights: boolean;
  learning_paths: boolean;
  adaptive_support: boolean;
  priority_support?: boolean;
  custom_integrations?: boolean;
}

export interface AiLimits {
  uploads_analyzed: number;
  ai_generations: number;
  parent_insights: number;
  adaptive_support_plans: number;
}

export interface SchoolSubscription {
  id: string;
  school_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  activated_by: string | null;
  activated_at: string | null;
  expires_at: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  notes: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  plan?: Plan;
  school?: SchoolWithDetails;
}

export interface SchoolWithDetails {
  id: string;
  name: string;
  plan: string;
  billing_status: string;
  billing_start_date: string;
  billing_end_date: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingEvent {
  id: string;
  school_id: string;
  event_type: BillingEventType;
  plan_id: string | null;
  previous_plan_id: string | null;
  amount: number | null;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PlatformAiControls {
  id: string;
  ai_globally_enabled: boolean;
  kill_switch_active: boolean;
  kill_switch_activated_at: string | null;
  kill_switch_activated_by: string | null;
  kill_switch_reason: string | null;
  feature_toggles: FeatureToggles;
  updated_at: string;
  updated_by: string | null;
}

export interface FeatureToggles {
  upload_analysis: boolean;
  teaching_suggestions: boolean;
  learning_paths: boolean;
  adaptive_support: boolean;
  parent_insights: boolean;
  practice_generation: boolean;
}

export interface PlatformAuditLog {
  id: string;
  action: PlatformAuditAction;
  actor_id: string;
  target_school_id: string | null;
  target_subscription_id: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined
  actor?: SuperAdmin;
  school?: SchoolWithDetails;
}

export interface PlatformStats {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  schoolsByPlan: Record<string, number>;
  totalTeachers: number;
  totalStudents: number;
  aiUsageThisMonth: {
    uploads_analyzed: number;
    ai_generations: number;
    parent_insights: number;
    adaptive_support_plans: number;
  };
}

// Action payloads
export interface ActivatePlanPayload {
  schoolId: string;
  planId: string;
  expiresAt?: string;
  notes?: string;
}

export interface SuspendSchoolPayload {
  schoolId: string;
  reason: string;
}

export interface ExtendSubscriptionPayload {
  schoolId: string;
  newExpiresAt: string;
  notes?: string;
}

export interface ChangePlanPayload {
  schoolId: string;
  newPlanId: string;
  notes?: string;
}
